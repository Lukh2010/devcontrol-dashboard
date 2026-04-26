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
    monkeypatch.setattr("services.action_executor_processes.is_dashboard_pid", lambda pid: pid == 4321)

    terminated = {"called": False}

    class FakeProcess:
        def name(self):
            return "dashboard-api.exe"

        def terminate(self):
            terminated["called"] = True

    monkeypatch.setattr("services.action_executor_processes.psutil.Process", lambda pid: FakeProcess())

    service = ActionExecutorService(
        LiveUpdateHub(),
        inventory_service=FakeInventoryService(ports=[{"port": 8000, "pid": 4321, "process_name": "dashboard-api.exe"}]),
    )

    payload, status = service.kill_process_by_port(8000)

    assert status == 200
    assert terminated["called"] is True
    assert "4321" in payload["message"]
