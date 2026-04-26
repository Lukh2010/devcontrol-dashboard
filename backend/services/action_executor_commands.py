"""Command execution logic for protected dashboard actions."""

from __future__ import annotations

import subprocess
import time

from flask import has_request_context, request

from services.command_execution import (
    build_subprocess_args,
    is_windows_echo,
    parse_command_args,
    render_echo_output,
)


class ActionExecutorCommandMixin:
    """Runs protected commands and records audit/live update metadata."""

    def run_command(self, command: str, name: str = ""):
        """Execute one validated command for the REST command endpoint."""
        if not isinstance(command, str) or not command.strip():
            self._publish_audit(command, "invalid", None)
            return {"error": "Request JSON must include a non-empty string 'command'"}, 400
        if name and not isinstance(name, str):
            self._publish_audit(command, "invalid", None)
            return {"error": "Optional field 'name' must be a string"}, 400

        command = command.strip()

        policy = self.classifier.evaluate_command(command)
        classification = policy.classification

        if policy.status == "blocked":
            self._publish_action(
                "run_command",
                "failed",
                message=policy.message,
                severity="danger" if classification == "dangerous" else "warning",
                entity_type="command",
                entity_id=command,
                command=command,
                name=name,
                classification=classification,
                reason=policy.reason,
            )
            self._publish_audit(command, classification, None)
            return {
                "error": policy.message,
                **policy.to_payload(),
            }, 400

        if policy.requires_confirmation and not self._is_confirmed_request():
            self._publish_action(
                "run_command",
                "failed",
                message=policy.message,
                severity="warning",
                entity_type="command",
                entity_id=command,
                command=command,
                name=name,
                classification=classification,
                reason=policy.reason,
            )
            self._publish_audit(command, classification, None)
            return {
                "error": f"{policy.message} Confirm via ?confirm=true or X-Confirm: true",
                **policy.to_payload(),
            }, 400

        try:
            args = parse_command_args(command)
            if not args:
                self._publish_audit(command, "invalid", None)
                return {"error": "Command must contain an executable"}, 400

            if is_windows_echo(args):
                stdout_text = render_echo_output(args)
                payload = {
                    "command": command,
                    "name": name,
                    "classification": classification,
                    "return_code": 0,
                    "stdout": stdout_text,
                    "stderr": "",
                    "success": True
                }
                self._publish_action(
                    "run_command",
                    "success",
                    message=f"Command completed: {command}",
                    severity="success",
                    entity_type="command",
                    entity_id=command,
                    command=command,
                    name=name,
                    classification=classification,
                    return_code=0
                )
                self._publish_audit(command, classification, 0)
                return payload, 200

            result = subprocess.run(
                build_subprocess_args(args),
                stdin=subprocess.DEVNULL,
                capture_output=True,
                text=True,
                timeout=30,
                check=False
            )
        except subprocess.TimeoutExpired:
            self._publish_action(
                "run_command",
                "failed",
                message="Command execution timed out",
                severity="warning",
                entity_type="command",
                entity_id=command,
                command=command,
                name=name,
                classification=classification,
                reason="timeout",
            )
            self._publish_audit(command, classification, None)
            return {"error": "Command execution timed out"}, 408
        except ValueError as exc:
            self._publish_action(
                "run_command",
                "failed",
                message=f"Command could not be parsed safely: {exc}",
                severity="danger",
                entity_type="command",
                entity_id=command,
                command=command,
                name=name,
                classification=classification,
                reason="parse_error",
            )
            self._publish_audit(command, classification, None)
            return {"error": f"Command could not be parsed safely: {exc}"}, 400
        except Exception as exc:
            self._publish_action(
                "run_command",
                "failed",
                message=str(exc),
                severity="danger",
                entity_type="command",
                entity_id=command,
                command=command,
                name=name,
                classification=classification,
                reason=str(exc),
            )
            self._publish_audit(command, classification, None)
            return {"error": str(exc)}, 500

        payload = {
            "command": command,
            "name": name,
            "classification": classification,
            "return_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "success": result.returncode == 0
        }
        self._publish_action(
            "run_command",
            "success" if result.returncode == 0 else "failed",
            message=f"Command exited with code {result.returncode}",
            severity="success" if result.returncode == 0 else "warning",
            entity_type="command",
            entity_id=command,
            command=command,
            name=name,
            classification=classification,
            return_code=result.returncode
        )
        self._publish_audit(command, classification, result.returncode)
        return payload, 200

    def _is_confirmed_request(self) -> bool:
        """Return whether the current request explicitly confirmed an allowlist miss."""
        if not has_request_context():
            return False

        confirm_query = request.args.get("confirm", "")
        confirm_header = request.headers.get("X-Confirm", "")
        return str(confirm_query).lower() == "true" or str(confirm_header).lower() == "true"

    def _publish_audit(self, command, classification, return_code):
        """Publish one audit event for command execution attempts."""
        caller_ip = request.remote_addr if has_request_context() else None
        self.live_updates.publish("audit", {
            "timestamp": time.time(),
            "command": command,
            "classification": classification,
            "return_code": return_code,
            "caller_ip": caller_ip
        })
