"""Process and port control logic for protected dashboard actions."""

from __future__ import annotations

import psutil

from process_control_policy import describe_process_control
from security import has_current_request_control_authorization


class ActionExecutorProcessMixin:
    """Handles process and port control actions."""

    def preview_process_stop(self, pid: int, is_admin: bool):
        """Describe the exact process stop target without terminating it."""
        try:
            process = psutil.Process(pid)
            process_name = process.name()
            process_username = self._safe_process_username(process)
            control_policy = self._resolve_control_policy(pid, is_admin, process_username)
            allowed = bool(control_policy.get("killable"))
            reason = control_policy.get("block_reason")
            message = (
                f"Process {pid} ({process_name}) can be stopped."
                if allowed
                else control_policy.get("kill_reason") or f"Process {pid} cannot be stopped."
            )
            return {
                "action": "kill_process",
                "dry_run": True,
                "allowed": allowed,
                "reason": reason,
                "message": message,
                "target": {
                    "pid": pid,
                    "process_name": process_name,
                    "owner_scope": control_policy.get("owner_scope"),
                    "username": process_username,
                },
                "policy": control_policy,
            }, 200
        except psutil.NoSuchProcess:
            return {
                "action": "kill_process",
                "dry_run": True,
                "allowed": False,
                "reason": "process_not_found",
                "message": f"Process {pid} was not found.",
                "target": {"pid": pid},
            }, 200
        except psutil.AccessDenied:
            return {
                "action": "kill_process",
                "dry_run": True,
                "allowed": False,
                "reason": "access_denied",
                "message": f"Access denied while inspecting process {pid}.",
                "target": {"pid": pid},
            }, 200

    def preview_port_stop(
        self,
        port: int,
        is_admin: bool = False,
        expected_pid: int | None = None,
        expected_protocol: str | None = None,
        expected_local_address: str | None = None,
    ):
        """Describe the exact port listener stop target without terminating it."""
        listeners = self._find_listeners_by_port(
            port,
            expected_pid=expected_pid,
            expected_protocol=expected_protocol,
            expected_local_address=expected_local_address,
        )
        if len(listeners) > 1:
            return {
                "action": "kill_by_port",
                "dry_run": True,
                "allowed": False,
                "reason": "ambiguous_listener",
                "message": f"Multiple listeners match port {port}. Select a specific PID or local address.",
                "target": {"port": port},
                "matches": listeners,
            }, 200

        listener = listeners[0] if listeners else None
        if listener is None:
            return {
                "action": "kill_by_port",
                "dry_run": True,
                "allowed": False,
                "reason": "port_not_found",
                "message": f"No process found listening on port {port}.",
                "target": {"port": port},
            }, 200

        pid = listener["pid"]
        if not pid:
            return {
                "action": "kill_by_port",
                "dry_run": True,
                "allowed": False,
                "reason": "protected_process",
                "message": f"Port {port} has no process PID to terminate.",
                "target": listener,
            }, 200

        try:
            process = psutil.Process(pid)
            process_name = process.name()
            process_username = self._safe_process_username(process)
            control_policy = self._resolve_control_policy(pid, is_admin, process_username)
            allowed = bool(control_policy.get("killable"))
            reason = control_policy.get("block_reason")
            message = (
                f"Listener {process_name} on port {port} can be stopped."
                if allowed
                else control_policy.get("kill_reason") or f"Listener on port {port} cannot be stopped."
            )
            return {
                "action": "kill_by_port",
                "dry_run": True,
                "allowed": allowed,
                "reason": reason,
                "message": message,
                "target": {
                    **listener,
                    "pid": pid,
                    "process_name": process_name,
                    "owner_scope": control_policy.get("owner_scope"),
                    "username": process_username,
                },
                "policy": control_policy,
            }, 200
        except psutil.NoSuchProcess:
            return {
                "action": "kill_by_port",
                "dry_run": True,
                "allowed": False,
                "reason": "process_not_found",
                "message": f"Cannot find the process on port {port}.",
                "target": listener,
            }, 200
        except psutil.AccessDenied:
            return {
                "action": "kill_by_port",
                "dry_run": True,
                "allowed": False,
                "reason": "access_denied",
                "message": f"Cannot inspect the process on port {port}.",
                "target": listener,
            }, 200

    def _resolve_control_policy(self, pid: int, is_admin: bool, username: str | None) -> dict:
        """Resolve stop policy and apply current request authorization state."""
        control_policy = describe_process_control(pid, is_admin=is_admin, username=username)
        if control_policy["external_killable"] and not has_current_request_control_authorization():
            return {
                **control_policy,
                "killable": False,
                "kill_reason": "Valid control password session required",
                "block_reason": "password_mode_required",
            }
        return control_policy

    def kill_process_by_port(
        self,
        port: int,
        is_admin: bool = False,
        expected_pid: int | None = None,
        expected_protocol: str | None = None,
        expected_local_address: str | None = None,
    ):
        """Terminate an allowed process listening on the given port."""
        listeners = self._find_listeners_by_port(
            port,
            expected_pid=expected_pid,
            expected_protocol=expected_protocol,
            expected_local_address=expected_local_address,
        )
        if len(listeners) > 1:
            self._publish_action(
                "kill_by_port",
                "failed",
                message=f"Multiple listeners match port {port}. Select a specific PID or local address.",
                severity="warning",
                entity_type="port",
                entity_id=port,
                port=port,
                reason="ambiguous_listener",
                matches=listeners,
            )
            return {
                "error": f"Multiple listeners match port {port}",
                "reason": "ambiguous_listener",
                "matches": listeners,
            }, 409

        listener = listeners[0] if listeners else None
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
                control_policy = self._resolve_control_policy(pid, is_admin, process_username)

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
                        requires_admin=reason == "admin_required",
                    )
                    return {"error": message, "reason": reason}, 403

                process.terminate()
                try:
                    process.wait(timeout=3)
                except psutil.TimeoutExpired:
                    process.kill()
                    try:
                        process.wait(timeout=2)
                    except psutil.TimeoutExpired:
                        self._publish_action(
                            "kill_by_port",
                            "failed",
                            message=f"Process {process_name} on port {port} did not exit after kill",
                            severity="danger",
                            entity_type="port",
                            entity_id=port,
                            port=port,
                            pid=pid,
                            process_name=process_name,
                            reason="termination_timeout",
                        )
                        return {
                            "error": f"Process {process_name} on port {port} did not exit after kill",
                            "reason": "termination_timeout",
                        }, 409

                if self._is_port_still_listening(port, pid):
                    self._publish_action(
                        "kill_by_port",
                        "failed",
                        message=f"Port {port} is still listening after stopping {process_name}",
                        severity="warning",
                        entity_type="port",
                        entity_id=port,
                        port=port,
                        pid=pid,
                        process_name=process_name,
                        reason="port_still_listening",
                    )
                    return {
                        "error": f"Port {port} is still listening after termination",
                        "reason": "port_still_listening",
                    }, 409

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
                    "message": f"Process {process_name} (PID: {pid}) terminated successfully",
                    "pid": pid,
                    "port": port,
                    "process_name": process_name,
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

    def _find_listeners_by_port(
        self,
        port: int,
        expected_pid: int | None = None,
        expected_protocol: str | None = None,
        expected_local_address: str | None = None,
    ) -> list[dict]:
        """Find listeners by port via inventory first and psutil second."""
        expected_protocol = expected_protocol.lower() if expected_protocol else None
        expected_local_address = expected_local_address.strip() if expected_local_address else None

        def matches(listener: dict) -> bool:
            if int(listener.get("port") or 0) != port:
                return False
            if expected_pid and int(listener.get("pid") or 0) != expected_pid:
                return False
            if expected_protocol and str(listener.get("protocol") or "").lower() != expected_protocol:
                return False
            if expected_local_address and str(listener.get("local_address") or "") != expected_local_address:
                return False
            return True

        def normalize(listener: dict) -> dict:
            return {
                "port": int(listener.get("port") or port),
                "pid": int(listener.get("pid") or 0),
                "process_name": str(listener.get("process_name") or "Unknown"),
                "protocol": str(listener.get("protocol") or "tcp").lower(),
                "local_address": listener.get("local_address"),
            }

        try:
            listeners = self.inventory_service.collect_ports()
            matches_from_inventory = [normalize(listener) for listener in listeners if matches(listener)]
            if matches_from_inventory:
                return self._dedupe_listeners(matches_from_inventory)
        except Exception as exc:
            print(f"Inventory-backed port lookup failed, falling back to psutil: {exc}")

        matches_from_psutil = []
        for conn in psutil.net_connections():
            if not conn.laddr:
                continue
            listener = {
                "port": getattr(conn.laddr, "port", None),
                "pid": int(conn.pid or 0),
                "process_name": "Unknown",
                "protocol": "tcp",
                "local_address": self._extract_address_host(conn.laddr),
            }
            if conn.status == "LISTEN" and matches(listener):
                matches_from_psutil.append({
                    "pid": int(conn.pid or 0),
                    "process_name": "Unknown",
                    "port": port,
                    "protocol": "tcp",
                    "local_address": self._extract_address_host(conn.laddr),
                })

        return self._dedupe_listeners(matches_from_psutil)

    def _dedupe_listeners(self, listeners: list[dict]) -> list[dict]:
        seen = set()
        deduped = []
        for listener in listeners:
            key = (
                listener.get("port"),
                listener.get("pid"),
                listener.get("protocol"),
                listener.get("local_address"),
            )
            if key in seen:
                continue
            seen.add(key)
            deduped.append(listener)
        return deduped

    def _is_port_still_listening(self, port: int, pid: int) -> bool:
        """Return whether the same PID still owns a listening socket on the port."""
        try:
            for conn in psutil.net_connections():
                if not conn.laddr or conn.status != "LISTEN":
                    continue
                if getattr(conn.laddr, "port", None) == port and int(conn.pid or 0) == pid:
                    return True
        except Exception:
            return False
        return False

    def _extract_address_host(self, address) -> str | None:
        if not address:
            return None
        if hasattr(address, "ip"):
            return address.ip
        if isinstance(address, tuple) and address:
            return str(address[0])
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

        control_policy = self._resolve_control_policy(pid, is_admin, process_username)

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
