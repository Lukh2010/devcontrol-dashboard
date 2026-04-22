import asyncio
import json
import time

from security import FAILED_AUTH_STATE, LOCKOUT_STATE, RATE_LIMIT_STATE
from services.terminal_gateway import TerminalGatewayService


class FakeEventBus:
    def __init__(self):
        self.events = []

    def publish(self, event_type, payload):
        self.events.append((event_type, payload))


class FakeWebSocket:
    def __init__(self, headers=None, remote_address=("127.0.0.1", 12345)):
        self.request_headers = headers or {}
        self.remote_address = remote_address
        self.sent_messages = []
        self.close_calls = []

    async def send(self, payload):
        self.sent_messages.append(payload)

    async def close(self, code=None, reason=None):
        self.close_calls.append((code, reason))

    def __aiter__(self):
        return self

    async def __anext__(self):
        raise StopAsyncIteration


def clear_security_state():
    RATE_LIMIT_STATE.clear()
    FAILED_AUTH_STATE.clear()
    LOCKOUT_STATE.clear()


def test_terminal_handshake_unauthorized_includes_requires_password(monkeypatch):
    monkeypatch.setenv("DEVCONTROL_PASSWORD", "secret-123")
    clear_security_state()
    event_bus = FakeEventBus()
    gateway = TerminalGatewayService(event_bus)
    websocket = FakeWebSocket()

    asyncio.run(gateway.handle_websocket(websocket, "/"))

    assert websocket.close_calls == [(4401, "Unauthorized")]
    payload = json.loads(websocket.sent_messages[0])
    assert payload["reason"] == "unauthorized"
    assert payload["requires_password"] is True

    action_events = [payload for event_type, payload in event_bus.events if event_type == "action"]
    assert action_events[-1]["requires_admin"] is False


def test_terminal_handshake_rate_limited_includes_retry_and_requires_password(monkeypatch):
    monkeypatch.setenv("DEVCONTROL_PASSWORD", "secret-123")
    clear_security_state()
    event_bus = FakeEventBus()
    gateway = TerminalGatewayService(event_bus)

    client_ip = "127.0.0.1"
    RATE_LIMIT_STATE[f"terminal_handshake:{client_ip}"] = [0.0]
    current_time = time.time()
    RATE_LIMIT_STATE[f"terminal_handshake:{client_ip}"] = [current_time] * 6

    websocket = FakeWebSocket(remote_address=(client_ip, 12345))
    asyncio.run(gateway.handle_websocket(websocket, "/"))

    assert websocket.close_calls == [(4429, "Rate limited")]
    payload = json.loads(websocket.sent_messages[0])
    assert payload["reason"] == "rate_limited"
    assert payload["requires_password"] is True
    assert payload["retry_after"] >= 1

    action_events = [payload for event_type, payload in event_bus.events if event_type == "action"]
    assert action_events[-1]["requires_admin"] is False
