import subprocess

import pytest

from app import create_app
from security import FAILED_AUTH_STATE, LOCKOUT_STATE, RATE_LIMIT_STATE, SESSION_TOKENS
from services.action_executor import ActionExecutorService
from services.live_update_hub import LiveUpdateHub


class FakeTelemetry:
    def collect_is_admin(self):
        return False

    def collect_system_info(self):
        return {"platform": "TestOS"}


class FakeLiveUpdateHub:
    def subscribe(self, last_event_id=None):
        return 1, None, []

    def unsubscribe(self, subscriber_id):
        return None


class FakeRuntime:
    def __init__(self):
        self.telemetry = FakeTelemetry()
        self.actions = ActionExecutorService(LiveUpdateHub())
        self.live_updates = FakeLiveUpdateHub()

    def start(self):
        return None


def clear_security_state():
    SESSION_TOKENS.clear()
    RATE_LIMIT_STATE.clear()
    FAILED_AUTH_STATE.clear()
    LOCKOUT_STATE.clear()


def make_authenticated_client(monkeypatch):
    monkeypatch.setenv("DEVCONTROL_PASSWORD", "ci-password")
    clear_security_state()
    app = create_app(FakeRuntime())
    client = app.test_client()
    headers = {"X-DevControl-Password": "ci-password"}
    return client, headers


def test_dangerous_commands_return_400(monkeypatch):
    client, headers = make_authenticated_client(monkeypatch)

    response = client.post(
        "/api/commands/run",
        json={"command": "shutdown now"},
        headers=headers,
    )

    assert response.status_code == 400
    assert response.get_json()["classification"] == "dangerous"
    assert "blocked" in response.get_json()["error"].lower()


def test_unknown_commands_without_confirmation_return_400(monkeypatch):
    client, headers = make_authenticated_client(monkeypatch)

    response = client.post(
        "/api/commands/run",
        json={"command": "foo_bar_baz_command"},
        headers=headers,
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["classification"] == "unknown"
    assert payload["requires_confirmation"] is True
    assert "confirmation" in payload["error"].lower()


def test_echo_returns_200_with_stdout(monkeypatch):
    client, headers = make_authenticated_client(monkeypatch)

    response = client.post(
        "/api/commands/run",
        json={"command": "echo hello"},
        headers=headers,
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["success"] is True
    assert "hello" in payload["stdout"].lower()


@pytest.mark.parametrize(
    "command",
    [
        "dir & whoami",
        "echo hello && whoami",
        "git status || more",
        "echo hello; whoami",
        "type file.txt > out.txt",
        "echo $(whoami)",
    ],
)
def test_command_chaining_and_shell_operators_are_rejected(monkeypatch, command):
    client, headers = make_authenticated_client(monkeypatch)

    response = client.post(
        "/api/commands/run",
        json={"command": command},
        headers=headers,
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["classification"] == "dangerous"
    assert payload["reason"] == "shell_operator_blocked"
    assert "not allowed for security reasons" in payload["error"].lower()


def test_unknown_command_executes_when_explicitly_confirmed(monkeypatch):
    client, headers = make_authenticated_client(monkeypatch)
    observed = {}

    def fake_run(args, **kwargs):
        observed["args"] = args
        observed["kwargs"] = kwargs
        return subprocess.CompletedProcess(args=args, returncode=0, stdout="ok\n", stderr="")

    monkeypatch.setattr("services.action_executor_commands.subprocess.run", fake_run)

    response = client.post(
        "/api/commands/run?confirm=true",
        json={"command": "custom-tool --flag"},
        headers=headers,
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["success"] is True
    assert payload["classification"] == "unknown"
    assert payload["stdout"] == "ok\n"
    assert observed["args"] == ["custom-tool", "--flag"]
    assert observed["kwargs"]["stdin"] is subprocess.DEVNULL
    assert observed["kwargs"]["capture_output"] is True
    assert observed["kwargs"]["timeout"] == 30


def test_parse_errors_return_400_without_shell_fallback(monkeypatch):
    client, headers = make_authenticated_client(monkeypatch)

    response = client.post(
        "/api/commands/run",
        json={"command": 'echo "unterminated'},
        headers=headers,
    )

    assert response.status_code == 400
    assert "could not be parsed safely" in response.get_json()["error"].lower()


def test_protected_endpoints_return_401_without_password(monkeypatch):
    monkeypatch.setenv("DEVCONTROL_PASSWORD", "ci-password")
    clear_security_state()
    app = create_app(FakeRuntime())
    client = app.test_client()

    command_response = client.post("/api/commands/run", json={"command": "echo test"})
    assert command_response.status_code == 401
    assert "error" in command_response.get_json()

    process_kill_response = client.post("/api/processes/1234/kill")
    assert process_kill_response.status_code == 401
    assert "error" in process_kill_response.get_json()

    port_delete_response = client.delete("/api/port/8080")
    assert port_delete_response.status_code == 401
    assert "error" in port_delete_response.get_json()


def test_protected_endpoints_return_401_with_wrong_password(monkeypatch):
    monkeypatch.setenv("DEVCONTROL_PASSWORD", "ci-password")
    clear_security_state()
    app = create_app(FakeRuntime())
    client = app.test_client()
    headers = {"X-DevControl-Password": "wrong-password"}

    command_response = client.post("/api/commands/run", json={"command": "echo test"}, headers=headers)
    assert command_response.status_code == 401
    assert "error" in command_response.get_json()

    process_kill_response = client.post("/api/processes/1234/kill", headers=headers)
    assert process_kill_response.status_code == 401
    assert "error" in process_kill_response.get_json()

    port_delete_response = client.delete("/api/port/8080", headers=headers)
    assert port_delete_response.status_code == 401
    assert "error" in port_delete_response.get_json()


class FakeInventoryService:
    def __init__(self, ports=None, error: Exception | None = None):
        self._ports = ports or []
        self._error = error

    def collect_ports(self):
        if self._error is not None:
            raise self._error
        return list(self._ports)


def test_kill_process_by_port_uses_inventory_lookup(monkeypatch):
    monkeypatch.setattr("process_control_policy.is_dashboard_pid", lambda pid: pid == 4321)

    terminated = {"called": False}

    class FakeProcess:
        def name(self):
            return "dashboard-api.exe"

        def username(self):
            return "lukas"

        def terminate(self):
            terminated["called"] = True

        def wait(self, timeout=None):
            return 0

    monkeypatch.setattr("services.action_executor_processes.psutil.Process", lambda pid: FakeProcess())

    service = ActionExecutorService(
        LiveUpdateHub(),
        inventory_service=FakeInventoryService(ports=[{"port": 8000, "pid": 4321, "process_name": "dashboard-api.exe"}]),
    )

    payload, status = service.kill_process_by_port(8000, is_admin=True)

    assert status == 200
    assert terminated["called"] is True
    assert "4321" in payload["message"]


def test_current_user_process_can_be_killed_with_password(monkeypatch):
    client, headers = make_authenticated_client(monkeypatch)
    monkeypatch.setattr("process_control_policy.is_dashboard_pid", lambda pid: False)
    monkeypatch.setattr("process_control_policy.current_username", lambda: "desktop\\lukas")
    terminated = {"called": False}

    class FakeProcess:
        def __init__(self, pid):
            self.pid = pid

        def name(self):
            return "RobloxPlayerBeta.exe"

        def username(self):
            return "DESKTOP\\lukas"

        def terminate(self):
            terminated["called"] = True

        def wait(self, timeout=None):
            return 0

    monkeypatch.setattr("services.action_executor_processes.psutil.Process", FakeProcess)

    response = client.post("/api/processes/5555/kill", headers=headers)

    assert response.status_code == 200
    assert terminated["called"] is True
    assert response.get_json()["pid"] == 5555


def test_process_stop_preview_does_not_terminate(monkeypatch):
    client, headers = make_authenticated_client(monkeypatch)
    monkeypatch.setattr("process_control_policy.is_dashboard_pid", lambda pid: False)
    monkeypatch.setattr("process_control_policy.current_username", lambda: "desktop\\lukas")
    terminated = {"called": False}

    class FakeProcess:
        def __init__(self, pid):
            self.pid = pid

        def name(self):
            return "RobloxPlayerBeta.exe"

        def username(self):
            return "DESKTOP\\lukas"

        def terminate(self):
            terminated["called"] = True

    monkeypatch.setattr("services.action_executor_processes.psutil.Process", FakeProcess)

    response = client.get("/api/processes/5555/stop-preview", headers=headers)

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["dry_run"] is True
    assert payload["allowed"] is True
    assert payload["target"]["pid"] == 5555
    assert payload["target"]["process_name"] == "RobloxPlayerBeta.exe"
    assert terminated["called"] is False


def test_current_user_process_requires_password_mode(monkeypatch):
    monkeypatch.delenv("DEVCONTROL_PASSWORD", raising=False)
    clear_security_state()
    app = create_app(FakeRuntime())
    client = app.test_client()
    monkeypatch.setattr("process_control_policy.is_dashboard_pid", lambda pid: False)
    monkeypatch.setattr("process_control_policy.current_username", lambda: "desktop\\lukas")

    class FakeProcess:
        def __init__(self, pid):
            self.pid = pid

        def name(self):
            return "RobloxPlayerBeta.exe"

        def username(self):
            return "DESKTOP\\lukas"

    monkeypatch.setattr("services.action_executor_processes.psutil.Process", FakeProcess)

    response = client.post("/api/processes/5555/kill")

    assert response.status_code == 403
    assert response.get_json()["reason"] == "password_mode_required"


def test_other_user_process_is_blocked_even_with_password(monkeypatch):
    client, headers = make_authenticated_client(monkeypatch)
    monkeypatch.setattr("process_control_policy.is_dashboard_pid", lambda pid: False)
    monkeypatch.setattr("process_control_policy.current_username", lambda: "desktop\\lukas")

    class FakeProcess:
        def __init__(self, pid):
            self.pid = pid

        def name(self):
            return "service.exe"

        def username(self):
            return "NT AUTHORITY\\SYSTEM"

    monkeypatch.setattr("services.action_executor_processes.psutil.Process", FakeProcess)

    response = client.post("/api/processes/5555/kill", headers=headers)

    assert response.status_code == 403
    assert response.get_json()["reason"] == "not_current_user_process"


def test_current_user_port_listener_can_be_killed_with_password(monkeypatch):
    monkeypatch.setenv("DEVCONTROL_PASSWORD", "ci-password")
    clear_security_state()
    monkeypatch.setattr("process_control_policy.is_dashboard_pid", lambda pid: False)
    monkeypatch.setattr("process_control_policy.current_username", lambda: "desktop\\lukas")
    terminated = {"called": False}

    class Runtime(FakeRuntime):
        def __init__(self):
            self.telemetry = FakeTelemetry()
            self.actions = ActionExecutorService(
                LiveUpdateHub(),
                inventory_service=FakeInventoryService(ports=[
                    {"port": 9000, "pid": 5555, "process_name": "RobloxPlayerBeta.exe"}
                ]),
            )
            self.live_updates = FakeLiveUpdateHub()

    class FakeProcess:
        def __init__(self, pid):
            self.pid = pid

        def name(self):
            return "RobloxPlayerBeta.exe"

        def username(self):
            return "DESKTOP\\lukas"

        def terminate(self):
            terminated["called"] = True

        def wait(self, timeout=None):
            return 0

    monkeypatch.setattr("services.action_executor_processes.psutil.Process", FakeProcess)
    monkeypatch.setattr("services.action_executor_processes.psutil.net_connections", lambda: [])
    app = create_app(Runtime())
    client = app.test_client()

    response = client.delete("/api/port/9000", headers={"X-DevControl-Password": "ci-password"})

    assert response.status_code == 200
    assert terminated["called"] is True


def test_port_stop_preview_does_not_terminate(monkeypatch):
    monkeypatch.setenv("DEVCONTROL_PASSWORD", "ci-password")
    clear_security_state()
    monkeypatch.setattr("process_control_policy.is_dashboard_pid", lambda pid: False)
    monkeypatch.setattr("process_control_policy.current_username", lambda: "desktop\\lukas")
    terminated = {"called": False}

    class Runtime(FakeRuntime):
        def __init__(self):
            self.telemetry = FakeTelemetry()
            self.actions = ActionExecutorService(
                LiveUpdateHub(),
                inventory_service=FakeInventoryService(ports=[
                    {
                        "port": 9000,
                        "pid": 5555,
                        "process_name": "RobloxPlayerBeta.exe",
                        "protocol": "tcp",
                        "local_address": "127.0.0.1",
                    }
                ]),
            )
            self.live_updates = FakeLiveUpdateHub()

    class FakeProcess:
        def __init__(self, pid):
            self.pid = pid

        def name(self):
            return "RobloxPlayerBeta.exe"

        def username(self):
            return "DESKTOP\\lukas"

        def terminate(self):
            terminated["called"] = True

    monkeypatch.setattr("services.action_executor_processes.psutil.Process", FakeProcess)
    app = create_app(Runtime())
    client = app.test_client()

    response = client.get(
        "/api/port/9000/stop-preview?pid=5555&protocol=tcp&local_address=127.0.0.1",
        headers={"X-DevControl-Password": "ci-password"},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["dry_run"] is True
    assert payload["allowed"] is True
    assert payload["target"]["pid"] == 5555
    assert payload["target"]["local_address"] == "127.0.0.1"
    assert terminated["called"] is False


def test_port_kill_returns_409_for_ambiguous_listener(monkeypatch):
    monkeypatch.setenv("DEVCONTROL_PASSWORD", "ci-password")
    clear_security_state()

    class Runtime(FakeRuntime):
        def __init__(self):
            self.telemetry = FakeTelemetry()
            self.actions = ActionExecutorService(
                LiveUpdateHub(),
                inventory_service=FakeInventoryService(ports=[
                    {"port": 9000, "pid": 1111, "process_name": "first.exe", "local_address": "127.0.0.1"},
                    {"port": 9000, "pid": 2222, "process_name": "second.exe", "local_address": "::1"},
                ]),
            )
            self.live_updates = FakeLiveUpdateHub()

    app = create_app(Runtime())
    client = app.test_client()

    response = client.delete("/api/port/9000", headers={"X-DevControl-Password": "ci-password"})

    assert response.status_code == 409
    assert response.get_json()["reason"] == "ambiguous_listener"
