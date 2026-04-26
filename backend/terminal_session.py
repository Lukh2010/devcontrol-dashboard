"""Terminal websocket session lifecycle and protocol routing."""

from __future__ import annotations

import asyncio
import json
import os
import platform
import time
import uuid
from typing import Any, Dict

from websockets.legacy.server import WebSocketServerProtocol

from command_classifier import CommandClassifier
from terminal_command_executor import TerminalCommandExecutorMixin

# PTY support - Windows compatible
if platform.system() == "Windows":
    try:
        import winpty  # noqa: F401

        PTY_AVAILABLE = True
    except ImportError:
        PTY_AVAILABLE = False
        print("Warning: winpty not available, falling back to subprocess")
else:
    try:
        from ptyprocess import PtyProcessUnicode  # noqa: F401

        PTY_AVAILABLE = True
    except ImportError:
        PTY_AVAILABLE = False
        print("Warning: ptyprocess not available, falling back to subprocess")


class TerminalSession(TerminalCommandExecutorMixin):
    """Represents one terminal websocket session."""

    def __init__(
        self,
        session_id: str,
        websocket: WebSocketServerProtocol,
        working_dir: str | None = None,
    ):
        self.session_id = session_id
        self.websocket = websocket
        self.working_dir = working_dir or os.getcwd()
        self.process = None
        self.classifier = CommandClassifier()
        self.is_running = False
        self.output_buffer = []
        self.command_history = []
        self.pending_command = ""
        self.confirmation_pending = False
        self.pending_classification = ""
        self.command_lock = asyncio.Lock()
        self.start_time = time.time()

    async def start_session(self):
        """Start the terminal session."""
        try:
            print("Starting simple terminal session...")
            self.is_running = True

            await self.send_message({
                "type": "welcome",
                "message": f"Terminal session ready in {self.working_dir}",
                "working_dir": self.working_dir,
                "session_id": self.session_id,
                "pty_available": False,
            })

            print(f"Terminal session started: {self.session_id}")
        except Exception as exc:
            print(f"Error starting terminal session: {exc}")
            await self.send_message({
                "type": "error",
                "message": f"Failed to start terminal: {exc}",
            })

    async def send_message(self, message: Dict[str, Any]):
        """Send a message to the terminal WebSocket client."""
        try:
            await self.websocket.send(json.dumps(message))
        except Exception as exc:
            self.is_running = False
            print(f"Failed to send message: {exc}")

    async def read_output(self):
        """No-op for the subprocess-based terminal implementation."""
        return None

    async def close_session(self):
        """Close the session and terminate any running subprocess."""
        self.is_running = False

        if self.process:
            try:
                if self.process.returncode is None:
                    self.process.terminate()
                    await asyncio.wait_for(self.process.wait(), timeout=5)
            except Exception:
                try:
                    self.process.kill()
                except Exception:
                    pass

        await self.send_message({
            "type": "session_closed",
            "message": "Terminal session closed",
            "duration": time.time() - self.start_time,
        })


class TerminalSessionManager:
    """Routes websocket protocol messages to the right terminal session."""

    def __init__(self):
        self.sessions: Dict[str, TerminalSession] = {}
        self.classifier = CommandClassifier()

    async def create_session(self, websocket: WebSocketServerProtocol, working_dir: str | None = None) -> str:
        """Create a new terminal session."""
        session_id = str(uuid.uuid4())
        session = TerminalSession(session_id, websocket, working_dir)
        self.sessions[session_id] = session

        await session.start_session()
        return session_id

    async def handle_message(self, session_id: str, message: Dict[str, Any]):
        """Handle one inbound WebSocket message for a terminal session."""
        session = self.sessions.get(session_id)
        if not session:
            return

        message_type = message.get("type")

        if message_type == "execute_command":
            command = message.get("command", "")
            await session.execute_command(command)

        elif message_type == "confirm_command":
            confirmed = message.get("confirmed", False)
            await session.confirm_pending_command(confirmed)

        elif message_type == "classify_command":
            command = message.get("command", "")
            request_id = message.get("request_id")
            policy = self.classifier.evaluate_command(command)
            await session.send_message({
                "type": "command_classification",
                "request_id": request_id,
                **policy.to_payload(),
            })

        elif message_type == "interrupt":
            await session.interrupt_command()

        elif message_type == "resize":
            cols = message.get("cols", 80)
            rows = message.get("rows", 24)
            await session.resize_terminal(cols, rows)

        elif message_type == "get_history":
            await session.send_message({
                "type": "history",
                "history": session.command_history[-20:],
            })

        elif message_type == "get_safe_commands":
            await session.send_message({
                "type": "safe_commands",
                "examples": self.classifier.get_safe_commands_examples(),
            })

    async def close_session(self, session_id: str):
        """Close and delete one tracked terminal session."""
        session = self.sessions.get(session_id)
        if session:
            await session.close_session()
            del self.sessions[session_id]

    def get_session_count(self) -> int:
        """Return the number of active terminal sessions."""
        return len(self.sessions)

    async def cleanup_sessions(self):
        """Clean up inactive terminal sessions."""
        for session_id, session in list(self.sessions.items()):
            if not session.is_running:
                await self.close_session(session_id)
