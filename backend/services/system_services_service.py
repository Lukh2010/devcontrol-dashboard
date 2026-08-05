import os
import re
import subprocess
from typing import Any, Dict, List, Optional

import psutil


class SystemServicesService:
    """Inspects and manages OS background services across Linux and Windows."""

    def __init__(self, live_updates=None):
        self.live_updates = live_updates

    def collect_services(
        self,
        search: str = "",
        status_filter: str = "all",
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Collect system services matching search query and status filter."""
        services: List[Dict[str, Any]] = []

        if os.name == "nt":
            services = self._collect_windows_services()
        else:
            services = self._collect_linux_services()

        # Apply search filtering
        if search:
            query = search.lower()
            services = [
                s for s in services
                if query in s.get("name", "").lower()
                or query in s.get("display_name", "").lower()
                or query in s.get("description", "").lower()
            ]

        # Apply status filtering
        if status_filter in {"running", "active"}:
            services = [s for s in services if s.get("status") in {"running", "active"}]
        elif status_filter in {"stopped", "inactive"}:
            services = [s for s in services if s.get("status") in {"stopped", "inactive"}]

        # Sort alphabetically by name
        services.sort(key=lambda s: s.get("name", "").lower())

        if limit > 0:
            services = services[:limit]

        return services

    def _collect_windows_services(self) -> List[Dict[str, Any]]:
        services = []
        if not hasattr(psutil, "win_service_iter"):
            return services

        try:
            for svc in psutil.win_service_iter():
                try:
                    info = svc.as_dict()
                    services.append({
                        "name": info.get("name") or "",
                        "display_name": info.get("display_name") or info.get("name") or "",
                        "status": info.get("status") or "unknown",
                        "start_type": info.get("start_type") or "unknown",
                        "pid": info.get("pid"),
                        "description": info.get("description") or "",
                        "platform": "windows"
                    })
                except Exception:
                    continue
        except Exception as exc:
            print(f"[WARN] Failed to iterate Windows services: {exc}")

        return services

    def _collect_linux_services(self) -> List[Dict[str, Any]]:
        services = []
        try:
            cmd = ["systemctl", "list-units", "--type=service", "--all", "--no-pager", "--plain", "--no-legend"]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                for line in result.stdout.splitlines():
                    parts = line.strip().split(None, 4)
                    if len(parts) >= 4:
                        unit_name = parts[0]
                        name = unit_name.removesuffix(".service")
                        active_state = parts[2]
                        sub_state = parts[3]
                        description = parts[4] if len(parts) >= 5 else ""

                        status = "running" if active_state == "active" else "stopped"
                        services.append({
                            "name": name,
                            "display_name": name,
                            "status": status,
                            "active_state": active_state,
                            "sub_state": sub_state,
                            "description": description,
                            "platform": "linux"
                        })
                return services
        except (FileNotFoundError, subprocess.TimeoutExpired, Exception) as exc:
            print(f"[WARN] systemctl listing unavailable or timed out: {exc}")

        # Fallback to psutil process inspection for common daemon/service names
        common_daemons = {"nginx", "postgresql", "postgres", "redis-server", "mongod", "docker", "mariadb", "mysql"}
        seen_names = set()
        for proc in psutil.process_iter(["pid", "name"]):
            try:
                pname = (proc.info.get("name") or "").lower()
                for daemon in common_daemons:
                    if daemon in pname and daemon not in seen_names:
                        seen_names.add(daemon)
                        services.append({
                            "name": daemon,
                            "display_name": daemon,
                            "status": "running",
                            "pid": proc.info.get("pid"),
                            "description": f"Process {proc.info.get('name')}",
                            "platform": "linux"
                        })
            except Exception:
                continue

        return services

    def control_service(self, service_name: str, action: str, is_admin: bool = False) -> tuple[Dict[str, Any], int]:
        """Execute start/stop/restart on a system service with validation."""
        valid_actions = {"start", "stop", "restart"}
        if action not in valid_actions:
            return {"error": f"Invalid service action '{action}'. Allowed: {sorted(valid_actions)}"}, 400

        # Sanitize service name to avoid command injection
        if not re.match(r"^[a-zA-Z0-9_\-\.]+$", service_name):
            return {"error": "Invalid service name syntax"}, 400

        if os.name == "nt":
            return self._control_windows_service(service_name, action)
        else:
            return self._control_linux_service(service_name, action)

    def _control_windows_service(self, service_name: str, action: str) -> tuple[Dict[str, Any], int]:
        try:
            cmd = ["net", action, service_name]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                payload = {
                    "message": f"Successfully performed '{action}' on service '{service_name}'",
                    "service_name": service_name,
                    "action": action,
                    "status": "success"
                }
                if self.live_updates:
                    self.live_updates.publish("action", {
                        "action": f"service_{action}",
                        "status": "success",
                        "message": payload["message"],
                        "entity_type": "service",
                        "entity_id": service_name,
                        "severity": "success"
                    })
                return payload, 200
            else:
                return {
                    "error": f"Service action failed: {result.stderr.strip() or result.stdout.strip()}",
                    "service_name": service_name,
                    "action": action
                }, 400
        except Exception as exc:
            return {"error": f"Failed to execute service control: {exc}"}, 500

    def _control_linux_service(self, service_name: str, action: str) -> tuple[Dict[str, Any], int]:
        try:
            cmd = ["systemctl", action, f"{service_name}.service"]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                payload = {
                    "message": f"Successfully performed '{action}' on service '{service_name}'",
                    "service_name": service_name,
                    "action": action,
                    "status": "success"
                }
                if self.live_updates:
                    self.live_updates.publish("action", {
                        "action": f"service_{action}",
                        "status": "success",
                        "message": payload["message"],
                        "entity_type": "service",
                        "entity_id": service_name,
                        "severity": "success"
                    })
                return payload, 200
            else:
                return {
                    "error": f"Service action failed: {result.stderr.strip() or result.stdout.strip()}",
                    "service_name": service_name,
                    "action": action
                }, 400
        except FileNotFoundError:
            return {"error": "systemctl command not found on this Linux system"}, 500
        except Exception as exc:
            return {"error": f"Failed to execute service control: {exc}"}, 500
