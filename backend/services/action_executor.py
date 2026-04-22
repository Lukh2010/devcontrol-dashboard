import platform
import shlex
import subprocess
import time

import psutil
from flask import has_request_context, request

from command_classifier import (
    CommandClassifier,
    SHELL_OPERATOR_MESSAGE,
    contains_dangerous_shell_metachars,
)
from dashboard_pids import is_dashboard_pid
from security import is_password_protection_enabled


class ActionExecutorService:
    """Executes privileged dashboard actions and emits action events."""

    WINDOWS_SHELL_BUILTINS = {
        "cd",
        "chdir",
        "cls",
        "dir",
        "echo",
        "set",
    }

    def __init__(self, event_bus):
        self.event_bus = event_bus
        self.classifier = CommandClassifier()

    def kill_process_by_port(self, port: int):
        for conn in psutil.net_connections():
            if conn.status == "LISTEN" and conn.laddr.port == port:
                try:
                    if not conn.pid or not is_dashboard_pid(conn.pid):
                        self._publish_action(
                            "kill_by_port",
                            "failed",
                            message=f"Port {port} is not owned by a DevControl-managed process",
                            severity="danger",
                            entity_type="port",
                            entity_id=port,
                            port=port,
                            reason="not_dashboard_pid",
                        )
                        return {
                            "error": f"Port {port} is not owned by a dashboard-managed process"
                        }, 403

                    process = psutil.Process(conn.pid)
                    process.terminate()
                    self._publish_action(
                        "kill_by_port",
                        "success",
                        message=f"Stopped {process.name()} on port {port}",
                        severity="success",
                        entity_type="port",
                        entity_id=port,
                        port=port,
                        pid=conn.pid,
                        process_name=process.name()
                    )
                    return {
                        "message": f"Process {process.name()} (PID: {conn.pid}) terminated successfully"
                    }, 200
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    self._publish_action(
                        "kill_by_port",
                        "failed",
                        message=f"Cannot terminate the process on port {port}",
                        severity="danger",
                        entity_type="port",
                        entity_id=port,
                        port=port,
                        reason="access_denied_or_missing",
                    )
                    return {"error": f"Cannot terminate process on port {port}"}, 403

        self._publish_action(
            "kill_by_port",
            "failed",
            message=f"No process found listening on port {port}",
            severity="warning",
            entity_type="port",
            entity_id=port,
            port=port,
            reason="port_not_found",
        )
        return {"error": f"No process found using port {port}"}, 404

    def run_command(self, command: str, name: str = ""):
        if not isinstance(command, str) or not command.strip():
            self._publish_audit(command, "invalid", None)
            return {"error": "Request JSON must include a non-empty string 'command'"}, 400
        if name and not isinstance(name, str):
            self._publish_audit(command, "invalid", None)
            return {"error": "Optional field 'name' must be a string"}, 400

        command = command.strip()

        if contains_dangerous_shell_metachars(command):
            self._publish_action(
                "run_command",
                "failed",
                message=SHELL_OPERATOR_MESSAGE,
                severity="danger",
                entity_type="command",
                entity_id=command,
                command=command,
                name=name,
                reason="shell_operator_blocked",
            )
            self._publish_audit(command, "dangerous", None)
            return {"error": SHELL_OPERATOR_MESSAGE}, 400

        classification, reason = self.classifier.classify_command(command)

        if classification == "dangerous":
            self._publish_action(
                "run_command",
                "failed",
                message="Dangerous command detected",
                severity="danger",
                entity_type="command",
                entity_id=command,
                command=command,
                name=name,
                classification=classification,
                reason="dangerous_command",
            )
            self._publish_audit(command, classification, None)
            return {"error": "Dangerous command detected"}, 400

        if classification == "interactive":
            self._publish_action(
                "run_command",
                "failed",
                message="Interactive commands are not supported by this endpoint",
                severity="warning",
                entity_type="command",
                entity_id=command,
                command=command,
                name=name,
                classification=classification,
                reason="interactive_command",
            )
            self._publish_audit(command, classification, None)
            return {"error": "Interactive commands are not supported by this endpoint"}, 400

        if classification == "unknown" and not self._is_confirmed_request():
            self._publish_action(
                "run_command",
                "failed",
                message="Unknown command requires explicit confirmation",
                severity="warning",
                entity_type="command",
                entity_id=command,
                command=command,
                name=name,
                classification=classification,
                reason="confirmation_required",
            )
            self._publish_audit(command, classification, None)
            return {
                "error": "Unknown command requires explicit confirmation via ?confirm=true or X-Confirm: true"
            }, 400

        try:
            if platform.system() == "Windows":
                args = shlex.split(command, posix=False)
                if not args:
                    self._publish_audit(command, "invalid", None)
                    return {"error": "Command must contain an executable"}, 400

                executable = args[0].lower()
                if executable == "echo":
                    stdout_text = f"{' '.join(args[1:])}\n"
                    payload = {
                        "command": command,
                        "name": name,
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

                if executable in self.WINDOWS_SHELL_BUILTINS:
                    result = subprocess.run(
                        ["cmd.exe", "/C", executable, *args[1:]],
                        capture_output=True,
                        text=True,
                        timeout=30,
                        check=False
                    )
                else:
                    result = subprocess.run(
                        args,
                        capture_output=True,
                        text=True,
                        timeout=30,
                        check=False
                    )
            else:
                args = shlex.split(command)
                if not args:
                    self._publish_audit(command, "invalid", None)
                    return {"error": "Command must contain an executable"}, 400

                result = subprocess.run(
                    args,
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

    def kill_process(self, pid: int, is_admin: bool):
        if platform.system() == "Windows" and not is_admin:
            self._publish_action(
                "kill_process",
                "failed",
                message="Administrator privileges required",
                severity="warning",
                entity_type="process",
                entity_id=pid,
                pid=pid,
                requires_admin=True,
                reason="admin_required",
            )
            return {
                "error": "Administrator privileges required",
                "message": "Please run the dashboard as Administrator"
            }, 403

        try:
            process = psutil.Process(pid)
            process_name = process.name()
        except psutil.NoSuchProcess:
            self._publish_action(
                "kill_process",
                "failed",
                message=f"Process {pid} was not found",
                severity="warning",
                entity_type="process",
                entity_id=pid,
                pid=pid,
                reason="process_not_found",
            )
            return {"error": f"Process {pid} not found"}, 404

        if not is_dashboard_pid(pid):
            self._publish_action(
                "kill_process",
                "failed",
                message=f"Process {pid} is not managed by DevControl",
                severity="danger",
                entity_type="process",
                entity_id=pid,
                pid=pid,
                reason="not_dashboard_pid",
                name=process_name,
            )
            return {
                "error": "Can only kill dashboard processes",
                "message": f"Process {pid} ({process_name}) is not a dashboard process"
            }, 403

        try:
            process.terminate()
            try:
                process.wait(timeout=3)
            except psutil.TimeoutExpired:
                process.kill()
        except psutil.NoSuchProcess:
            self._publish_action(
                "kill_process",
                "failed",
                message=f"Process {pid} was not found",
                severity="warning",
                entity_type="process",
                entity_id=pid,
                pid=pid,
                reason="process_not_found",
            )
            return {"error": f"Process {pid} not found"}, 404
        except psutil.AccessDenied:
            self._publish_action(
                "kill_process",
                "failed",
                message=f"Access denied while stopping process {pid}",
                severity="danger",
                entity_type="process",
                entity_id=pid,
                pid=pid,
                reason="access_denied",
            )
            return {"error": f"Access denied to process {pid}"}, 403

        self._publish_action(
            "kill_process",
            "success",
            message=f"Stopped process {pid} ({process_name})",
            severity="success",
            entity_type="process",
            entity_id=pid,
            pid=pid,
            name=process_name,
        )
        return {
            "success": True,
            "message": f"Process {pid} ({process_name}) killed successfully",
            "pid": pid,
            "name": process_name
        }, 200

    def _publish_action(
        self,
        action,
        status,
        message: str | None = None,
        severity: str | None = None,
        entity_type: str | None = None,
        entity_id=None,
        requires_admin: bool = False,
        requires_password: bool | None = None,
        retry_after: int | None = None,
        **details,
    ):
        resolved_severity = severity or ("success" if status == "success" else "warning" if status == "pending" else "danger")
        resolved_requires_password = (
            is_password_protection_enabled()
            if requires_password is None
            else requires_password
        )
        self.event_bus.publish("action", {
            "action": action,
            "status": status,
            "message": message or action.replace("_", " ").title(),
            "severity": resolved_severity,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "requires_admin": requires_admin,
            "requires_password": resolved_requires_password,
            "retry_after": retry_after,
            "timestamp": time.time(),
            **details
        })

    def _is_confirmed_request(self) -> bool:
        if not has_request_context():
            return False

        confirm_query = request.args.get("confirm", "")
        confirm_header = request.headers.get("X-Confirm", "")
        return str(confirm_query).lower() == "true" or str(confirm_header).lower() == "true"

    def _publish_audit(self, command, classification, return_code):
        caller_ip = request.remote_addr if has_request_context() else None
        self.event_bus.publish("audit", {
            "timestamp": time.time(),
            "command": command,
            "classification": classification,
            "return_code": return_code,
            "caller_ip": caller_ip
        })
