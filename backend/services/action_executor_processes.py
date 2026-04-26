"""Process and port control logic for protected dashboard actions."""

from __future__ import annotations

import platform

import psutil

from dashboard_pids import is_dashboard_pid


class ActionExecutorProcessMixin:
    """Handles process and port control actions."""

    def kill_process_by_port(self, port: int):
        """Terminate the dashboard-owned process listening on the given port."""
        listener = self._find_listener_by_port(port)
        if listener is not None:
            pid = listener["pid"]
            try:
                if not pid or not is_dashboard_pid(pid):
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

                process = psutil.Process(pid)
                process_name = process.name()
                process.terminate()
                self._publish_action(
                    "kill_by_port",
                    "success",
                    message=f"Stopped {process_name} on port {port}",
                    severity="success",
                    entity_type="port",
                    entity_id=port,
                    port=port,
                    pid=pid,
                    process_name=process_name
                )
                return {
                    "message": f"Process {process_name} (PID: {pid}) terminated successfully"
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

    def _find_listener_by_port(self, port: int) -> dict | None:
        """Find one listener by port via inventory first and psutil second."""
        try:
            listeners = self.inventory_service.collect_ports()
            for listener in listeners:
                if int(listener.get("port") or 0) == port:
                    return {
                        "pid": int(listener.get("pid") or 0),
                        "process_name": str(listener.get("process_name") or "Unknown"),
                    }
        except Exception as exc:
            print(f"Inventory-backed port lookup failed, falling back to psutil: {exc}")

        for conn in psutil.net_connections():
            if conn.status == "LISTEN" and conn.laddr.port == port:
                return {
                    "pid": int(conn.pid or 0),
                    "process_name": None,
                }

        return None

    def kill_process(self, pid: int, is_admin: bool):
        """Terminate one dashboard-owned process if it is allowed."""
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
