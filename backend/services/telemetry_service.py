import os
import platform
import socket
import subprocess
import threading
import time

import psutil

from dashboard_pids import is_dashboard_pid
from services.system_inventory_service import SystemInventoryService


class TelemetryCollectorService:
    """Collects host telemetry and publishes snapshots onto the event bus."""

    def __init__(self, event_bus, inventory_service: SystemInventoryService | None = None):
        self.event_bus = event_bus
        self.inventory_service = inventory_service or SystemInventoryService()
        self._cpu_cache = {}
        self._last_cpu_update = 0
        self._process_cpu_times = {}
        self._cpu_cache_ready = False
        self._running = False
        self._thread = None
        self.collectors = {
            "heartbeat": {"interval": 1, "collect": self._collect_heartbeat},
            "system_snapshot": {"interval": 4, "collect": self.collect_system_snapshot},
            "process_snapshot": {"interval": 5, "collect": self.collect_process_snapshot},
            "network_snapshot": {"interval": 10, "collect": self.collect_network_snapshot},
        }
        self._last_emitted = {}

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

    def _run(self):
        while self._running:
            now = time.time()
            for event_type, collector in self.collectors.items():
                interval = max(float(collector.get("interval", 5)), 1.0)
                last = self._last_emitted.get(event_type, 0.0)
                if now - last < interval:
                    continue

                try:
                    payload = collector["collect"]()
                    if isinstance(payload, dict) and "timestamp" not in payload:
                        payload["timestamp"] = now
                    self.event_bus.publish(event_type, payload)
                    self._last_emitted[event_type] = now
                except Exception as exc:
                    self.event_bus.publish("stream_error", {
                        "event_type": event_type,
                        "error": str(exc),
                        "timestamp": now
                    })

            time.sleep(1.0)

    def _collect_heartbeat(self):
        return {"timestamp": time.time()}

    def collect_system_info(self):
        return {
            "platform": platform.system(),
            "platform_release": platform.release(),
            "platform_version": platform.version(),
            "architecture": platform.machine(),
            "hostname": socket.gethostname(),
            "processor": platform.processor(),
            "cpu_count": psutil.cpu_count(),
            "memory_total": psutil.virtual_memory().total,
            "memory_available": psutil.virtual_memory().available
        }

    def collect_system_performance(self, interval=1):
        cpu_percent = psutil.cpu_percent(interval=interval)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        return {
            "cpu_percent": cpu_percent,
            "cpu_count": psutil.cpu_count(),
            "memory": {
                "total": memory.total,
                "available": memory.available,
                "percent": memory.percent,
                "used": memory.used,
                "free": memory.free
            },
            "disk": {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": (disk.used / disk.total) * 100
            },
            "timestamp": time.time()
        }

    def _build_process_entry(self, process_info: dict, is_admin: bool) -> dict:
        pid = process_info["pid"]
        dashboard_owned = bool(pid) and is_dashboard_pid(pid)
        killable = dashboard_owned and (platform.system() != "Windows" or is_admin)
        kill_reason = None

        if not dashboard_owned:
            kill_reason = "Not managed by DevControl"
        elif platform.system() == "Windows" and not is_admin:
            kill_reason = "Administrator privileges required on Windows"

        return {
            **process_info,
            "dashboard_owned": dashboard_owned,
            "killable": killable,
            "kill_reason": kill_reason,
        }

    def _build_port_entry(self, port_info: dict, is_admin: bool) -> dict:
        pid = port_info["pid"]
        dashboard_owned = bool(pid) and is_dashboard_pid(pid)
        killable = dashboard_owned and (platform.system() != "Windows" or is_admin)
        kill_reason = None

        if not dashboard_owned:
            kill_reason = "Not managed by DevControl"
        elif platform.system() == "Windows" and not is_admin:
            kill_reason = "Administrator privileges required on Windows"

        return {
            **port_info,
            "dashboard_owned": dashboard_owned,
            "killable": killable,
            "kill_reason": kill_reason,
        }

    def _sort_processes(self, processes: list[dict], sort: str) -> list[dict]:
        normalized_sort = (sort or "cpu_desc").lower()
        if normalized_sort == "memory_desc":
            return sorted(processes, key=lambda process: (-process["memory_mb"], -process["cpu_percent"], process["pid"]))
        if normalized_sort == "name_asc":
            return sorted(processes, key=lambda process: (process["name"].lower(), process["pid"]))
        if normalized_sort == "pid_asc":
            return sorted(processes, key=lambda process: process["pid"])
        if normalized_sort == "status_asc":
            return sorted(processes, key=lambda process: (process["status"], process["name"].lower(), process["pid"]))
        return sorted(processes, key=lambda process: (-process["cpu_percent"], -process["memory_mb"], process["pid"]))

    def _sort_ports(self, ports: list[dict], sort: str) -> list[dict]:
        normalized_sort = (sort or "port_asc").lower()
        if normalized_sort == "process_asc":
            return sorted(ports, key=lambda port: (port["process_name"].lower(), port["port"], port["pid"]))
        if normalized_sort == "pid_asc":
            return sorted(ports, key=lambda port: (port["pid"], port["port"]))
        return sorted(ports, key=lambda port: (port["port"], port["pid"]))

    def _update_cpu_cache(self):
        current_time = time.time()
        if current_time - self._last_cpu_update < 1.0:
            return

        try:
            cpu_count = max(psutil.cpu_count() or 1, 1)
            new_cache = {}
            new_cpu_times = {}
            previous_snapshot_exists = bool(self._process_cpu_times) and self._last_cpu_update > 0
            elapsed = current_time - self._last_cpu_update if previous_snapshot_exists else 0.0

            for proc in psutil.process_iter(["pid"]):
                try:
                    cpu_times = proc.cpu_times()
                    total_cpu_time = float(cpu_times.user + cpu_times.system)
                    new_cpu_times[proc.pid] = total_cpu_time

                    previous_cpu_time = self._process_cpu_times.get(proc.pid)
                    if previous_cpu_time is None or elapsed <= 0:
                        new_cache[proc.pid] = 0.0
                        continue

                    cpu_delta = max(total_cpu_time - previous_cpu_time, 0.0)
                    normalized_cpu = min(max((cpu_delta / elapsed) / cpu_count * 100, 0.0), 100.0)
                    new_cache[proc.pid] = normalized_cpu
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue

            self._cpu_cache = new_cache
            self._process_cpu_times = new_cpu_times
            self._last_cpu_update = current_time
            self._cpu_cache_ready = previous_snapshot_exists and elapsed > 0
        except Exception as exc:
            print(f"Error updating CPU cache: {exc}")

    def collect_processes(
        self,
        search: str = "",
        sort: str = "cpu_desc",
        limit: int | None = 15,
        dashboard_only: bool = False,
        killable_only: bool = False,
    ):
        try:
            return self._collect_processes_with_inventory(
                search=search,
                sort=sort,
                limit=limit,
                dashboard_only=dashboard_only,
                killable_only=killable_only,
            )
        except Exception as exc:
            print(f"Inventory-backed process collection failed, falling back to psutil: {exc}")
            return self._collect_processes_with_psutil(
                search=search,
                sort=sort,
                limit=limit,
                dashboard_only=dashboard_only,
                killable_only=killable_only,
            )

    def _collect_processes_with_inventory(
        self,
        search: str = "",
        sort: str = "cpu_desc",
        limit: int | None = 15,
        dashboard_only: bool = False,
        killable_only: bool = False,
    ):
        is_admin = self.collect_is_admin()
        normalized_search = (search or "").strip().lower()
        processes = []

        for record in self.inventory_service.collect_processes():
            process_name = str(record.get("name") or "Unknown").strip() or "Unknown"
            if process_name == "System Idle Process":
                continue

            process_entry = self._build_process_entry({
                "pid": int(record.get("pid") or 0),
                "name": process_name,
                "cpu_percent": round(float(record.get("cpu_percent") or 0.0), 2),
                "memory_mb": round(float(record.get("memory_mb") or 0.0), 2),
                "status": str(record.get("status") or "unknown"),
                "parent_pid": int(record.get("parent_pid") or 0),
                "username": record.get("username"),
                "exe_path": record.get("exe_path"),
                "command_line": record.get("command_line"),
                "started_at": record.get("started_at"),
            }, is_admin)

            if dashboard_only and not process_entry["dashboard_owned"]:
                continue
            if killable_only and not process_entry["killable"]:
                continue

            searchable = " ".join([
                process_entry["name"],
                str(process_entry["pid"]),
                str(process_entry.get("username") or ""),
                str(process_entry.get("command_line") or ""),
            ]).lower()
            if normalized_search and normalized_search not in searchable:
                continue

            processes.append(process_entry)

        sorted_processes = self._sort_processes(processes, sort)
        if limit is None or limit <= 0:
            return sorted_processes
        return sorted_processes[:limit]

    def _collect_processes_with_psutil(
        self,
        search: str = "",
        sort: str = "cpu_desc",
        limit: int | None = 15,
        dashboard_only: bool = False,
        killable_only: bool = False,
    ):
        self._update_cpu_cache()
        is_admin = self.collect_is_admin()
        normalized_search = (search or "").strip().lower()
        processes = []
        for proc in psutil.process_iter(["pid", "name", "memory_info", "status"]):
            try:
                pinfo = proc.info
                cpu_percent = self._cpu_cache.get(proc.pid, 0.0) if self._cpu_cache_ready else 0.0
                memory_mb = pinfo["memory_info"].rss / 1024 / 1024 if pinfo["memory_info"] else 0
                if pinfo["name"] and pinfo["name"] != "System Idle Process":
                    process_entry = self._build_process_entry({
                        "pid": pinfo["pid"],
                        "name": pinfo["name"] or "Unknown",
                        "cpu_percent": round(cpu_percent, 2),
                        "memory_mb": round(memory_mb, 2),
                        "status": pinfo["status"]
                    }, is_admin)

                    if dashboard_only and not process_entry["dashboard_owned"]:
                        continue
                    if killable_only and not process_entry["killable"]:
                        continue
                    if normalized_search and normalized_search not in process_entry["name"].lower() and normalized_search not in str(process_entry["pid"]):
                        continue

                    processes.append(process_entry)
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        sorted_processes = self._sort_processes(processes, sort)
        if limit is None or limit <= 0:
            return sorted_processes
        return sorted_processes[:limit]

    def collect_ports(
        self,
        search: str = "",
        sort: str = "port_asc",
        limit: int | None = 100,
        dashboard_only: bool = False,
        killable_only: bool = False,
    ):
        try:
            return self._collect_ports_with_inventory(
                search=search,
                sort=sort,
                limit=limit,
                dashboard_only=dashboard_only,
                killable_only=killable_only,
            )
        except Exception as exc:
            print(f"Inventory-backed port collection failed, falling back to psutil: {exc}")
            return self._collect_ports_with_psutil(
                search=search,
                sort=sort,
                limit=limit,
                dashboard_only=dashboard_only,
                killable_only=killable_only,
            )

    def _collect_ports_with_inventory(
        self,
        search: str = "",
        sort: str = "port_asc",
        limit: int | None = 100,
        dashboard_only: bool = False,
        killable_only: bool = False,
    ):
        normalized_search = (search or "").strip().lower()
        is_admin = self.collect_is_admin()
        connections = {}

        for record in self.inventory_service.collect_ports():
            port_entry = self._build_port_entry({
                "port": int(record.get("port") or 0),
                "process_name": str(record.get("process_name") or "Unknown").strip() or "Unknown",
                "pid": int(record.get("pid") or 0),
                "status": str(record.get("status") or "LISTEN"),
                "protocol": record.get("protocol"),
                "local_address": record.get("local_address"),
                "remote_address": record.get("remote_address"),
                "state": record.get("state"),
                "exe_path": record.get("exe_path"),
            }, is_admin)

            if dashboard_only and not port_entry["dashboard_owned"]:
                continue
            if killable_only and not port_entry["killable"]:
                continue

            searchable = " ".join([
                str(port_entry["port"]),
                port_entry["process_name"],
                str(port_entry["pid"]),
                str(port_entry.get("local_address") or ""),
            ]).lower()
            if normalized_search and normalized_search not in searchable:
                continue

            key = (port_entry["port"], port_entry["pid"], port_entry["process_name"])
            connections[key] = port_entry

        sorted_ports = self._sort_ports(list(connections.values()), sort)
        if limit is None or limit <= 0:
            return sorted_ports
        return sorted_ports[:limit]

    def _collect_ports_with_psutil(
        self,
        search: str = "",
        sort: str = "port_asc",
        limit: int | None = 100,
        dashboard_only: bool = False,
        killable_only: bool = False,
    ):
        connections = {}
        normalized_search = (search or "").strip().lower()
        is_admin = self.collect_is_admin()
        for conn in psutil.net_connections():
            if conn.status == "LISTEN":
                try:
                    process = psutil.Process(conn.pid) if conn.pid else None
                    if process:
                        key = (conn.laddr.port, conn.pid, process.name())
                        port_entry = self._build_port_entry({
                            "port": conn.laddr.port,
                            "process_name": process.name(),
                            "pid": conn.pid,
                            "status": conn.status
                        }, is_admin)

                        if dashboard_only and not port_entry["dashboard_owned"]:
                            continue
                        if killable_only and not port_entry["killable"]:
                            continue
                        searchable = f"{port_entry['port']} {port_entry['process_name']} {port_entry['pid']}".lower()
                        if normalized_search and normalized_search not in searchable:
                            continue

                        connections[key] = port_entry
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        sorted_ports = self._sort_ports(list(connections.values()), sort)
        if limit is None or limit <= 0:
            return sorted_ports
        return sorted_ports[:limit]

    def collect_network_info(self):
        network_info = {}
        for interface, addrs in psutil.net_if_addrs().items():
            network_info[interface] = []
            for addr in addrs:
                if addr.family == socket.AF_INET:
                    network_info[interface].append({
                        "family": "IPv4",
                        "address": addr.address,
                        "netmask": addr.netmask,
                        "broadcast": addr.broadcast
                    })
                elif addr.family == socket.AF_INET6:
                    network_info[interface].append({
                        "family": "IPv6",
                        "address": addr.address,
                        "netmask": addr.netmask
                    })

        default_gateway = "Unknown"
        if platform.system() == "Windows":
            try:
                result = subprocess.run("ipconfig", capture_output=True, text=True, check=False)
                lines = result.stdout.split("\n")
                for line in lines:
                    if "Default Gateway" in line:
                        gateway = line.split(":")[-1].strip()
                        if gateway:
                            default_gateway = gateway
                            break
            except Exception:
                pass

        return {
            "interfaces": network_info,
            "default_gateway": default_gateway,
            "hostname": socket.gethostname()
        }

    def collect_is_admin(self):
        if platform.system() == "Windows":
            try:
                import ctypes
                return ctypes.windll.shell32.IsUserAnAdmin() != 0
            except Exception:
                return False
        return os.geteuid() == 0 if hasattr(os, "geteuid") else False

    def collect_system_snapshot(self):
        return {
            "system_info": self.collect_system_info(),
            "performance": self.collect_system_performance(interval=0),
            "is_admin": self.collect_is_admin()
        }

    def collect_process_snapshot(self):
        return {"processes": self.collect_processes(limit=25)}

    def collect_network_snapshot(self):
        return {
            "ports": self.collect_ports(limit=25),
            "network_info": self.collect_network_info()
        }
