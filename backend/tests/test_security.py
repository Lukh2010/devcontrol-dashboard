import os

from app import create_app
from security import (
    FAILED_AUTH_STATE,
    LOCKOUT_STATE,
    RATE_LIMIT_STATE,
    SESSION_COOKIE_NAME,
    SESSION_TOKENS,
    create_control_session,
    verify_control_password,
)


class FakeTelemetry:
    def collect_is_admin(self):
        return False

    def collect_system_info(self):
        return {"platform": "TestOS"}

    def collect_network_info(self):
        return {
            "hostname": "test-host",
            "default_gateway": "192.168.1.1",
            "interfaces": {
                "Loopback": [
                    {
                        "family": "IPv4",
                        "address": "127.0.0.1",
                        "netmask": "255.0.0.0",
                    }
                ]
            },
        }


class FakeActions:
    def run_command(self, command, name=""):
        return {"success": True, "command": command, "name": name}, 200

    def kill_process_by_port(self, port, **kwargs):
        return {"message": f"noop {port}"}, 200

    def kill_process(self, pid, is_admin):
        return {"success": True, "pid": pid, "is_admin": is_admin}, 200


class FakeLiveUpdateHub:
    def subscribe(self, last_event_id=None):
        return 1, None, []

    def unsubscribe(self, subscriber_id):
        return None


class FakeRuntime:
    def __init__(self):
        self.telemetry = FakeTelemetry()
        self.actions = FakeActions()
        self.live_updates = FakeLiveUpdateHub()

    def start(self):
        return None


def clear_security_state():
    SESSION_TOKENS.clear()
    RATE_LIMIT_STATE.clear()
    FAILED_AUTH_STATE.clear()
    LOCKOUT_STATE.clear()


def test_verify_control_password_matching_mismatched_and_empty(monkeypatch):
    monkeypatch.setenv("DEVCONTROL_PASSWORD", "secret-123")
    clear_security_state()

    assert verify_control_password("secret-123") is True
    assert verify_control_password("wrong-password") is False
    assert verify_control_password("") is False


def test_require_control_password_accepts_header_auth(monkeypatch):
    monkeypatch.setenv("DEVCONTROL_PASSWORD", "secret-123")
    clear_security_state()
    app = create_app(FakeRuntime())
    client = app.test_client()

    response = client.post(
        "/api/commands/run",
        json={"command": "echo header"},
        headers={"X-DevControl-Password": "secret-123"},
    )

    assert response.status_code == 200
    assert response.get_json()["success"] is True


def test_require_control_password_accepts_cookie_auth(monkeypatch):
    monkeypatch.setenv("DEVCONTROL_PASSWORD", "secret-123")
    clear_security_state()
    app = create_app(FakeRuntime())
    client = app.test_client()
    token, _ = create_control_session()
    client.set_cookie(SESSION_COOKIE_NAME, token)

    response = client.post("/api/commands/run", json={"command": "echo cookie"})

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["success"] is True
    assert payload["command"] == "echo cookie"


def test_auth_status_reports_active_cookie_session(monkeypatch):
    monkeypatch.setenv("DEVCONTROL_PASSWORD", "secret-123")
    clear_security_state()
    app = create_app(FakeRuntime())
    client = app.test_client()
    token, _ = create_control_session()
    client.set_cookie(SESSION_COOKIE_NAME, token)

    response = client.get("/api/auth/status")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["enabled"] is True
    assert payload["session_active"] is True


def test_auth_session_locks_out_after_repeated_failures(monkeypatch):
    monkeypatch.setenv("DEVCONTROL_PASSWORD", "secret-123")
    clear_security_state()
    app = create_app(FakeRuntime())
    client = app.test_client()

    for _ in range(4):
        response = client.post("/api/auth/session", json={"password": "wrong-password"})
        assert response.status_code == 401

    locked_response = client.post("/api/auth/session", json={"password": "wrong-password"})
    assert locked_response.status_code == 429
    assert locked_response.get_json()["retry_after"] >= 1


def test_auth_session_rate_limit_ignores_spoofed_forwarded_for(monkeypatch):
    monkeypatch.setenv("DEVCONTROL_PASSWORD", "secret-123")
    monkeypatch.delenv("DEVCONTROL_TRUST_PROXY_HEADERS", raising=False)
    clear_security_state()
    app = create_app(FakeRuntime())
    client = app.test_client()

    for index in range(6):
        response = client.post(
            "/api/auth/session",
            json={"password": "secret-123"},
            headers={"X-Forwarded-For": f"10.0.0.{index}"},
        )
        assert response.status_code == 200

    limited_response = client.post(
        "/api/auth/session",
        json={"password": "secret-123"},
        headers={"X-Forwarded-For": "10.0.0.99"},
    )
    assert limited_response.status_code == 429


def test_auth_session_clears_terminal_handshake_limit_after_unlock(monkeypatch):
    monkeypatch.setenv("DEVCONTROL_PASSWORD", "secret-123")
    clear_security_state()
    app = create_app(FakeRuntime())
    client = app.test_client()
    terminal_key = "terminal_handshake:127.0.0.1"
    RATE_LIMIT_STATE[terminal_key] = [1, 2, 3, 4, 5, 6]
    FAILED_AUTH_STATE[terminal_key] = [1, 2, 3, 4]
    LOCKOUT_STATE[terminal_key] = 9999999999

    response = client.post("/api/auth/session", json={"password": "secret-123"})

    assert response.status_code == 200
    assert terminal_key not in RATE_LIMIT_STATE
    assert terminal_key not in FAILED_AUTH_STATE
    assert terminal_key not in LOCKOUT_STATE


def test_locked_network_info_preserves_interface_addresses(monkeypatch):
    monkeypatch.setenv("DEVCONTROL_PASSWORD", "secret-123")
    clear_security_state()
    app = create_app(FakeRuntime())
    client = app.test_client()

    response = client.get("/api/network/info")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["sensitive_masked"] is True
    assert payload["interfaces"]["Loopback"][0]["address"] == "127.0.0.1"
    assert "netmask" not in payload["interfaces"]["Loopback"][0]


def test_commands_run_is_rate_limited(monkeypatch):
    monkeypatch.setenv("DEVCONTROL_PASSWORD", "secret-123")
    clear_security_state()
    app = create_app(FakeRuntime())
    client = app.test_client()
    headers = {"X-DevControl-Password": "secret-123"}

    for _ in range(12):
        response = client.post("/api/commands/run", json={"command": "echo hello"}, headers=headers)
        assert response.status_code == 200

    limited_response = client.post("/api/commands/run", json={"command": "echo hello"}, headers=headers)
    assert limited_response.status_code == 429
    assert limited_response.get_json()["retry_after"] >= 1


def test_process_kill_is_rate_limited(monkeypatch):
    monkeypatch.setenv("DEVCONTROL_PASSWORD", "secret-123")
    clear_security_state()
    app = create_app(FakeRuntime())
    client = app.test_client()
    headers = {"X-DevControl-Password": "secret-123"}

    for _ in range(10):
        response = client.post("/api/processes/1234/kill", headers=headers)
        assert response.status_code == 200

    limited_response = client.post("/api/processes/1234/kill", headers=headers)
    assert limited_response.status_code == 429
    assert limited_response.get_json()["retry_after"] >= 1


def test_port_delete_is_rate_limited(monkeypatch):
    monkeypatch.setenv("DEVCONTROL_PASSWORD", "secret-123")
    clear_security_state()
    app = create_app(FakeRuntime())
    client = app.test_client()
    headers = {"X-DevControl-Password": "secret-123"}

    for _ in range(10):
        response = client.delete("/api/port/8080", headers=headers)
        assert response.status_code == 200

    limited_response = client.delete("/api/port/8080", headers=headers)
    assert limited_response.status_code == 429
    assert limited_response.get_json()["retry_after"] >= 1


def test_auth_disabled_mode_allows_protected_actions_without_password(monkeypatch):
    monkeypatch.delenv("DEVCONTROL_PASSWORD", raising=False)
    clear_security_state()
    app = create_app(FakeRuntime())
    client = app.test_client()

    response = client.post("/api/commands/run", json={"command": "echo no-password"})
    assert response.status_code == 200
    assert response.get_json()["success"] is True


def test_auth_disabled_mode_reports_enabled_false(monkeypatch):
    monkeypatch.delenv("DEVCONTROL_PASSWORD", raising=False)
    clear_security_state()
    app = create_app(FakeRuntime())
    client = app.test_client()

    response = client.get("/api/auth/status")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["enabled"] is False
    assert payload["session_active"] is False


def test_health_reports_runtime_security_status(monkeypatch):
    monkeypatch.setenv("DEVCONTROL_PASSWORD", "secret-123")
    clear_security_state()
    app = create_app(FakeRuntime())
    client = app.test_client()

    response = client.get("/api/health")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["api"]["host"] == "127.0.0.1"
    assert payload["password"]["enabled"] is True
    assert payload["password"]["session_active"] is False
