"""Process and port control logic for protected dashboard actions."""

from __future__ import annotations

import psutil

from process_control_policy import describe_process_control
from security import has_current_request_control_authorization


class ActionExecutorProcessMixin:
    """Handles process and port control actions."""

    def kill_process_by_port(self, port: int):
        """Terminate an allowed process listening on the given port."""
        listener = self._find_listener_by_port(port)
        if listener is not None:
            pid = listener["pid"]
            try:
                if not pid:
                    self._publish_action(
                        "kill_by_port",
                        "failed",
                        message=f"Port {port} has no process PID to terminate",
                        severity="danger",
                        entity_type="port",
                        entity_id=port,
                        port=port,
                        reason="protected_process",
                    )
                    return {"error": f"Port {port} has no process PID to terminate"}, 403

                process = psutil.Process(pid)
                process_name = process.name()
                process_username = self._safe_process_username(process)
                control_policy = describe_process_control(pid, is_admin=True, username=process_username)
                if control_policy["external_killable"] and not has_current_request_control_authorization():
                    control_policy = {
                        **control_policy,
                        "killable": False,
                        "kill_reason": "Valid control password session required",
                        "block_reason": "password_mode_required",
                    }

                if not control_policy["killable"]:
                    reason = control_policy.get("block_reason") or "not_current_user_process"
                    message = control_policy.get("kill_reason") or "Port listener cannot be stopped"
                    self._publish_action(
                        "kill_by_port",
                        "failed",
                        message=message,
                        severity="danger",
                        entity_type="port",
                        entity_id=port,
                        port=port,
                        pid=pid,
                        process_name=process_name,
                        reason=reason,
                    )
                    return {"error": message, "reason": reason}, 403

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
                    process_name=process_name,
                    owner_scope=control_policy.get("owner_scope"),
                )
                return {
                    "message": f"Process {process_name} (PID: {pid}) terminated successfully"
                }, 200
            except psutil.NoSuchProcess:
                self._publish_action(
                    "kill_by_port",
                    "failed",
                    message=f"Cannot find the process on port {port}",
                    severity="warning",
                    entity_type="port",
                    entity_id=port,
                    port=port,
                    reason="process_not_found",
                )
                return {"error": f"Cannot find process on port {port}", "reason": "process_not_found"}, 404
            except psutil.AccessDenied:
                self._publish_action(
                    "kill_by_port",
                    "failed",
                    message=f"Cannot terminate the process on port {port}",
                    severity="danger",
                    entity_type="port",
                    entity_id=port,
                    port=port,
                    reason="access_denied",
                )
                return {"error": f"Cannot terminate process on port {port}", "reason": "access_denied"}, 403

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
        """Terminate one allowed process if it is safe to do so."""
        try:
            process = psutil.Process(pid)
            process_name = process.name()
            process_username = self._safe_process_username(process)
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
                message=f"Access denied while inspecting process {pid}",
                severity="danger",
                entity_type="process",
                entity_id=pid,
                pid=pid,
                reason="access_denied",
            )
            return {"error": f"Access denied to process {pid}", "reason": "access_denied"}, 403

        control_policy = describe_process_control(pid, is_admin=is_admin, username=process_username)
        if control_policy["external_killable"] and not has_current_request_control_authorization():
            control_policy = {
                **control_policy,
                "killable": False,
                "kill_reason": "Valid control password session required",
                "block_reason": "password_mode_required",
            }

        if not control_policy["killable"]:
            reason = control_policy.get("block_reason") or "not_current_user_process"
            requires_admin = reason == "admin_required"
            self._publish_action(
                "kill_process",
                "failed",
                message=control_policy.get("kill_reason") or f"Process {pid} cannot be stopped",
                severity="warning" if requires_admin else "danger",
                entity_type="process",
                entity_id=pid,
                pid=pid,
                reason=reason,
                name=process_name,
                requires_admin=requires_admin,
                owner_scope=control_policy.get("owner_scope"),
            )
            return {
                "error": control_policy.get("kill_reason") or f"Process {pid} cannot be stopped",
                "message": f"Process {pid} ({process_name}) cannot be stopped",
                "reason": reason,
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
            owner_scope=control_policy.get("owner_scope"),
        )
        return {
            "success": True,
            "message": f"Process {pid} ({process_name}) killed successfully",
            "pid": pid,
            "name": process_name
        }, 200

    def _safe_process_username(self, process) -> str | None:
        """Return process username without letting access errors escape."""
        try:
            return process.username()
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess, OSError):
            return None
