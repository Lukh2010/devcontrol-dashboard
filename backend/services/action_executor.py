import platform
import shlex
import subprocess

import psutil

from dashboard_pids import is_dashboard_pid


class ActionExecutorService:
    """Executes privileged dashboard actions and emits action events."""

    def __init__(self, event_bus):
        self.event_bus = event_bus

    def kill_process_by_port(self, port: int):
        for conn in psutil.net_connections():
            if conn.status == "LISTEN" and conn.laddr.port == port:
                try:
                    if not conn.pid or not is_dashboard_pid(conn.pid):
                        self._publish_action("kill_by_port", "failed", port=port, reason="not_dashboard_pid")
                        return {
                            "error": f"Port {port} is not owned by a dashboard-managed process"
                        }, 403

                    process = psutil.Process(conn.pid)
                    process.terminate()
                    self._publish_action(
                        "kill_by_port",
                        "success",
                        port=port,
                        pid=conn.pid,
                        process_name=process.name()
                    )
                    return {
                        "message": f"Process {process.name()} (PID: {conn.pid}) terminated successfully"
                    }, 200
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    self._publish_action("kill_by_port", "failed", port=port, reason="access_denied_or_missing")
                    return {"error": f"Cannot terminate process on port {port}"}, 403

        self._publish_action("kill_by_port", "failed", port=port, reason="port_not_found")
        return {"error": f"No process found using port {port}"}, 404

    def run_command(self, command: str, name: str = ""):
        if not isinstance(command, str) or not command.strip():
            return {"error": "Request JSON must include a non-empty string 'command'"}, 400
        if name and not isinstance(name, str):
            return {"error": "Optional field 'name' must be a string"}, 400

        dangerous_commands = ["rm -rf", "format", "del /f", "shutdown", "reboot"]
        if any(dangerous in command.lower() for dangerous in dangerous_commands):
            return {"error": "Dangerous command detected"}, 400

        try:
            if platform.system() == "Windows":
                if any(cmd in command.lower() for cmd in ["del", "rmdir", "format", "shutdown"]):
                    return {"error": "Dangerous command blocked for security"}, 403

                result = subprocess.run(
                    command,
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=30,
                    check=False
                )
            else:
                try:
                    args = shlex.split(command)
                    result = subprocess.run(
                        args,
                        capture_output=True,
                        text=True,
                        timeout=30,
                        check=False
                    )
                except ValueError:
                    result = subprocess.run(
                        command,
                        shell=True,
                        capture_output=True,
                        text=True,
                        timeout=30,
                        check=False
                    )
        except subprocess.TimeoutExpired:
            self._publish_action("run_command", "failed", command=command, name=name, reason="timeout")
            return {"error": "Command execution timed out"}, 408
        except Exception as exc:
            self._publish_action("run_command", "failed", command=command, name=name, reason=str(exc))
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
            command=command,
            name=name,
            return_code=result.returncode
        )
        return payload, 200

    def kill_process(self, pid: int, is_admin: bool):
        if platform.system() == "Windows" and not is_admin:
            return {
                "error": "Administrator privileges required",
                "message": "Please run the dashboard as Administrator"
            }, 403

        try:
            process = psutil.Process(pid)
            process_name = process.name()
        except psutil.NoSuchProcess:
            return {"error": f"Process {pid} not found"}, 404

        if not is_dashboard_pid(pid):
            self._publish_action("kill_process", "failed", pid=pid, reason="not_dashboard_pid", name=process_name)
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
            self._publish_action("kill_process", "failed", pid=pid, reason="process_not_found")
            return {"error": f"Process {pid} not found"}, 404
        except psutil.AccessDenied:
            self._publish_action("kill_process", "failed", pid=pid, reason="access_denied")
            return {"error": f"Access denied to process {pid}"}, 403

        self._publish_action("kill_process", "success", pid=pid, name=process_name)
        return {
            "success": True,
            "message": f"Process {pid} ({process_name}) killed successfully",
            "pid": pid,
            "name": process_name
        }, 200

    def _publish_action(self, action, status, **details):
        self.event_bus.publish("action", {
            "action": action,
            "status": status,
            **details
        })
