import asyncio

from terminal_session import TerminalSession


class FakeWebSocket:
    def __init__(self):
        self.messages = []

    async def send(self, payload):
        self.messages.append(payload)


def test_terminal_dangerous_command_is_blocked_without_confirmation():
    websocket = FakeWebSocket()
    session = TerminalSession("test-session", websocket)
    executed = []

    async def fake_execute(command, classification):
        executed.append((command, classification))

    session._execute_command_internal = fake_execute

    asyncio.run(session.execute_command("shutdown now"))

    assert executed == []
    assert any("Dangerous commands are blocked" in message for message in websocket.messages)
    assert not any("sudo_required" in message for message in websocket.messages)


def test_terminal_unknown_command_requires_confirmation_before_execution():
    websocket = FakeWebSocket()
    session = TerminalSession("test-session", websocket)
    executed = []

    async def fake_execute(command, classification):
        executed.append((command, classification))

    session._execute_command_internal = fake_execute

    asyncio.run(session.execute_command("custom-tool --flag"))
    assert executed == []
    assert any("sudo_required" in message for message in websocket.messages)

    asyncio.run(session.confirm_sudo(True))
    assert executed == [("custom-tool --flag", "unknown")]


def test_terminal_unknown_command_can_be_cancelled():
    websocket = FakeWebSocket()
    session = TerminalSession("test-session", websocket)
    executed = []

    async def fake_execute(command, classification):
        executed.append((command, classification))

    session._execute_command_internal = fake_execute

    asyncio.run(session.execute_command("custom-tool --flag"))
    asyncio.run(session.confirm_sudo(False))

    assert executed == []
    assert any("sudo_cancelled" in message for message in websocket.messages)
