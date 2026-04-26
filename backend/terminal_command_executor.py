"""Subprocess-backed command execution helpers for terminal sessions."""

from __future__ import annotations

import asyncio
import os
import platform
import signal
import time
from contextlib import suppress

from services.command_execution import (
    build_subprocess_args,
    is_windows_echo,
    parse_command_args,
    render_echo_output,
)


class TerminalCommandExecutorMixin:
    """Implements command validation, confirmation, and subprocess execution."""

    WINDOWS_ADMIN_COMMAND_PREFIXES = {
        "net sess",
        "net session",
        "net user",
        "net localgroup",
        "net share",
    }

    COMMAND_TIMEOUT_SECONDS = 30

    async def execute_command(self, command: str):
        """Execute one terminal command after validation and classification."""
        try:
            command = (command or "").strip()
            if not command:
                return

            policy = self.classifier.evaluate_command(command)
            classification = policy.classification
            self.command_history.append({
                "command": command,
                "classification": classification,
                "timestamp": time.time(),
            })

            if policy.status == "blocked":
                await self.send_message({
                    "type": "error",
                    "message": policy.message,
                    "classification": classification,
                    "reason": policy.reason,
                })
                return

            if policy.requires_confirmation:
                self.pending_command = command
                self.confirmation_pending = True
                self.pending_classification = classification
                await self.send_message({
                    "type": "confirm_command_required",
                    "command": command,
                    "classification": classification,
                    "reason": policy.reason,
                    "message": policy.message,
                    "confirmation_guidance": self.classifier.get_confirmation_guidance(),
                })
                return

            async with self.command_lock:
                await self._execute_command_internal(command, classification)
        except Exception as exc:
            await self.send_message({
                "type": "error",
                "message": f"Command execution failed: {exc}",
            })

    async def confirm_pending_command(self, confirmed: bool):
        """Handle explicit confirmation for unknown commands."""
        if not self.confirmation_pending:
            return

        self.confirmation_pending = False

        if confirmed:
            await self.send_message({
                "type": "confirm_command_confirmed",
                "message": "Executing confirmed command...",
            })
            async with self.command_lock:
                await self._execute_command_internal(
                    self.pending_command,
                    self.pending_classification or "unknown",
                )
        else:
            await self.send_message({
                "type": "confirm_command_cancelled",
                "message": "Command cancelled",
            })

        self.pending_command = ""
        self.pending_classification = ""

    def _resolve_directory(self, target: str) -> str:
        if not target or target == "~":
            return os.path.expanduser("~")

        expanded = os.path.expandvars(os.path.expanduser(target.strip('"').strip("'")))
        if os.path.isabs(expanded):
            return os.path.abspath(expanded)
        return os.path.abspath(os.path.join(self.working_dir, expanded))

    async def _handle_builtin_command(self, command: str) -> bool:
        try:
            parts = parse_command_args(command)
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
                args = parse_command_args(command)
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

            if is_windows_echo(args):
                await self.send_message({
                    "type": "output",
                    "data": render_echo_output(args),
                    "timestamp": time.time(),
                })
                return

            if platform.system() == "Windows":
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

            process = await asyncio.create_subprocess_exec(
                *build_subprocess_args(args),
                cwd=self.working_dir,
                stdin=asyncio.subprocess.DEVNULL,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            self.process = process
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=self.COMMAND_TIMEOUT_SECONDS,
                )
            except asyncio.TimeoutError:
                await self._terminate_process(process)
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

    async def _terminate_process(self, process: asyncio.subprocess.Process):
        """Terminate a subprocess without waiting forever on ignored signals."""
        with suppress(ProcessLookupError):
            process.terminate()
        try:
            await asyncio.wait_for(process.wait(), timeout=3)
            return
        except asyncio.TimeoutError:
            pass

        with suppress(ProcessLookupError):
            process.kill()
        with suppress(asyncio.TimeoutError):
            await asyncio.wait_for(process.wait(), timeout=2)

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

    async def resize_terminal(self, cols: int, rows: int):
        """Report that resize is unsupported in subprocess mode."""
        await self.send_message({
            "type": "warning",
            "message": "Terminal resize is not supported in the current subprocess mode",
            "cols": cols,
            "rows": rows,
        })
