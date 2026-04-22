"""
Terminal Session Manager
Manages WebSocket terminal sessions with PTY support and real-time streaming.
"""

import asyncio
import json
import os
import platform
import shlex
import signal
import time
import uuid
from typing import Any, Dict

from websockets.legacy.server import WebSocketServerProtocol

from command_classifier import (
    CommandClassifier,
    SHELL_OPERATOR_MESSAGE,
    contains_dangerous_shell_metachars,
)

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


class TerminalSession:
    WINDOWS_SHELL_BUILTINS = {
        "cd",
        "chdir",
        "cls",
        "dir",
        "echo",
        "set",
    }
    WINDOWS_BLOCKED_COMMANDS = {"del", "rmdir", "format", "shutdown"}
    WINDOWS_ADMIN_COMMAND_PREFIXES = {
        "net sess",
        "net session",
        "net user",
        "net localgroup",
        "net share",
    }

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
        self.current_command = ""
        self.sudo_pending = False
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

    async def execute_command(self, command: str):
        """Execute one terminal command after validation and classification."""
        try:
            command = (command or "").strip()
            if not command:
                return

            if contains_dangerous_shell_metachars(command):
                await self.send_message({
                    "type": "error",
                    "message": SHELL_OPERATOR_MESSAGE,
                })
                return

            classification, reason = self.classifier.classify_command(command)
            self.command_history.append({
                "command": command,
                "classification": classification,
                "timestamp": time.time(),
            })

            if classification == "dangerous":
                await self.send_message({
                    "type": "error",
                    "message": "Dangerous commands are blocked in the terminal gateway",
                    "reason": reason,
                })
                return

            if classification == "interactive":
                await self.send_message({
                    "type": "warning",
                    "message": "Interactive terminal programs are not supported in the current subprocess mode",
                })
                return

            if classification == "unknown":
                self.current_command = command
                self.sudo_pending = True
                self.pending_classification = classification
                await self.send_message({
                    "type": "sudo_required",
                    "command": command,
                    "reason": reason,
                    "warning": "This command is not in the allowlist and needs confirmation.",
                    "dangerous_examples": self.classifier.get_dangerous_commands(),
                })
                return

            async with self.command_lock:
                await self._execute_command_internal(command, classification)
        except Exception as exc:
            await self.send_message({
                "type": "error",
                "message": f"Command execution failed: {exc}",
            })

    async def confirm_sudo(self, confirmed: bool):
        """Handle explicit confirmation for unknown commands."""
        if not self.sudo_pending:
            return

        self.sudo_pending = False

        if confirmed:
            await self.send_message({
                "type": "sudo_confirmed",
                "message": "Executing confirmed command...",
            })
            async with self.command_lock:
                await self._execute_command_internal(
                    self.current_command,
                    self.pending_classification or "unknown",
                )
        else:
            await self.send_message({
                "type": "sudo_cancelled",
                "message": "Command cancelled",
            })

        self.current_command = ""
        self.pending_classification = ""

    def _parse_command(self, command: str):
        if platform.system() == "Windows":
            return shlex.split(command, posix=False)
        return shlex.split(command)

    def _resolve_directory(self, target: str) -> str:
        if not target or target == "~":
            return os.path.expanduser("~")

        expanded = os.path.expandvars(os.path.expanduser(target.strip('"').strip("'")))
        if os.path.isabs(expanded):
            return os.path.abspath(expanded)
        return os.path.abspath(os.path.join(self.working_dir, expanded))

    async def _handle_builtin_command(self, command: str) -> bool:
        try:
            parts = self._parse_command(command)
        except ValueError as exc:
            await self.send_message({
                "type": "error",
                "message": f"Could not parse command: {exc}",
            })
            return True

        if not parts:
            return True

        if parts[0].lower() != "cd":
            return False

        target = parts[1] if len(parts) > 1 else "~"
        resolved_dir = self._resolve_directory(target)
        if not os.path.isdir(resolved_dir):
            await self.send_message({
                "type": "error",
                "message": f"Directory not found: {resolved_dir}",
            })
            return True

        self.working_dir = resolved_dir
        await self.send_message({
            "type": "cwd_changed",
            "working_dir": self.working_dir,
            "message": f"Working directory changed to {self.working_dir}",
        })
        return True

    async def _execute_command_internal(self, command: str, classification: str):
        """Execute a validated non-interactive command without using a shell."""
        try:
            print(f"Executing command: {command}")

            await self.send_message({
                "type": "command_sent",
                "command": command,
                "classification": classification,
            })

            if await self._handle_builtin_command(command):
                return

            try:
                args = self._parse_command(command)
            except ValueError as exc:
                await self.send_message({
                    "type": "error",
                    "message": f"Command could not be parsed safely: {exc}",
                })
                return

            if not args:
                await self.send_message({
                    "type": "error",
                    "message": "Command must contain an executable",
                })
                return

            executable = args[0].lower()

            if platform.system() == "Windows" and executable == "echo":
                await self.send_message({
                    "type": "output",
                    "data": f"{' '.join(args[1:])}\n",
                    "timestamp": time.time(),
                })
                return

            if platform.system() == "Windows":
                if executable in self.WINDOWS_BLOCKED_COMMANDS:
                    await self.send_message({
                        "type": "error",
                        "message": "Dangerous command blocked for security",
                    })
                    return

                if any(command.lower().startswith(prefix) for prefix in self.WINDOWS_ADMIN_COMMAND_PREFIXES):
                    try:
                        import ctypes

                        is_admin = ctypes.windll.shell32.IsUserAnAdmin() != 0
                        if not is_admin:
                            await self.send_message({
                                "type": "error",
                                "message": "Administrator privileges required. Please run the dashboard as Administrator.",
                            })
                            return

                        await self.send_message({
                            "type": "info",
                            "message": "Executing admin command with elevated privileges.",
                        })
                    except Exception:
                        await self.send_message({
                            "type": "warning",
                            "message": "Could not verify admin privileges, trying command anyway.",
                        })

                if executable in self.WINDOWS_SHELL_BUILTINS:
                    process = await asyncio.create_subprocess_exec(
                        "cmd.exe",
                        "/C",
                        executable,
                        *args[1:],
                        cwd=self.working_dir,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                    )
                else:
                    process = await asyncio.create_subprocess_exec(
                        *args,
                        cwd=self.working_dir,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                    )
            else:
                process = await asyncio.create_subprocess_exec(
                    *args,
                    cwd=self.working_dir,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )

            self.process = process
            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=30)
            except asyncio.TimeoutError:
                process.terminate()
                await process.wait()
                self.process = None
                await self.send_message({
                    "type": "error",
                    "message": "Command execution timed out",
                })
                return
            finally:
                self.process = None

            stdout_text = stdout.decode(errors="replace") if stdout else ""
            stderr_text = stderr.decode(errors="replace") if stderr else ""

            if stdout_text:
                await self.send_message({
                    "type": "output",
                    "data": stdout_text,
                    "timestamp": time.time(),
                })

            if stderr_text:
                await self.send_message({
                    "type": "output",
                    "data": f"ERROR: {stderr_text}",
                    "timestamp": time.time(),
                })

            print(f"Command executed: {command}, Return code: {process.returncode}")
        except Exception as exc:
            print(f"Error executing command: {exc}")
            await self.send_message({
                "type": "error",
                "message": f"Failed to execute command: {exc}",
            })

    async def interrupt_command(self):
        """Send an interrupt signal to the running command."""
        try:
            if not self.process or self.process.returncode is not None:
                await self.send_message({
                    "type": "warning",
                    "message": "No running command to interrupt",
                })
                return

            if platform.system() == "Windows":
                self.process.terminate()
            else:
                self.process.send_signal(signal.SIGINT)

            await self.send_message({
                "type": "interrupt_sent",
                "message": "Interrupt signal sent to the running command",
            })
        except Exception as exc:
            await self.send_message({
                "type": "error",
                "message": f"Failed to interrupt: {exc}",
            })

    async def send_message(self, message: Dict[str, Any]):
        """Send a message to the terminal WebSocket client."""
        try:
            await self.websocket.send(json.dumps(message))
        except Exception as exc:
            print(f"Failed to send message: {exc}")

    async def read_output(self):
        """No-op for the subprocess-based terminal implementation."""
        return None

    async def resize_terminal(self, cols: int, rows: int):
        """Report that resize is unsupported in subprocess mode."""
        await self.send_message({
            "type": "warning",
            "message": "Terminal resize is not supported in the current subprocess mode",
            "cols": cols,
            "rows": rows,
        })

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

        elif message_type == "sudo_confirm":
            confirmed = message.get("confirmed", False)
            await session.confirm_sudo(confirmed)

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
