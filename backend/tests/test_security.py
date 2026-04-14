import os

from app import create_app
from security import (
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


class FakeActions:
    def run_command(self, command, name=""):
        return {"success": True, "command": command, "name": name}, 200

    def kill_process_by_port(self, port):
        return {"message": f"noop {port}"}, 200

    def kill_process(self, pid, is_admin):
        return {"success": True, "pid": pid, "is_admin": is_admin}, 200


class FakeStreamProcessor:
    def subscribe(self):
        return 1, None

    def unsubscribe(self, subscriber_id):
        return None


class FakeRuntime:
    def __init__(self):
        self.telemetry = FakeTelemetry()
        self.actions = FakeActions()
        self.stream_processor = FakeStreamProcessor()

    def start(self):
        return None


def test_verify_control_password_matching_mismatched_and_empty(monkeypatch):
    monkeypatch.setenv("DEVCONTROL_PASSWORD", "secret-123")

    assert verify_control_password("secret-123") is True
    assert verify_control_password("wrong-password") is False
    assert verify_control_password("") is False


def test_require_control_password_accepts_header_auth(monkeypatch):
    monkeypatch.setenv("DEVCONTROL_PASSWORD", "secret-123")
    SESSION_TOKENS.clear()
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
    SESSION_TOKENS.clear()
    app = create_app(FakeRuntime())
    client = app.test_client()
    token, _ = create_control_session()
    client.set_cookie(SESSION_COOKIE_NAME, token)

    response = client.post("/api/commands/run", json={"command": "echo cookie"})

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["success"] is True
    assert payload["command"] == "echo cookie"

