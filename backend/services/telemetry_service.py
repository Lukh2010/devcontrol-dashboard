import os
import platform
import socket
import subprocess
import threading
import time

import psutil


class TelemetryCollectorService:
    """Collects host telemetry and publishes snapshots onto the event bus."""

    def __init__(self, event_bus):
        self.event_bus = event_bus
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

    def collect_processes(self):
        self._update_cpu_cache()
        processes = []
        for proc in psutil.process_iter(["pid", "name", "memory_info", "status"]):
            try:
                pinfo = proc.info
                cpu_percent = self._cpu_cache.get(proc.pid, 0.0) if self._cpu_cache_ready else 0.0
                memory_mb = pinfo["memory_info"].rss / 1024 / 1024 if pinfo["memory_info"] else 0
                if pinfo["name"] and pinfo["name"] != "System Idle Process":
                    processes.append({
                        "pid": pinfo["pid"],
                        "name": pinfo["name"] or "Unknown",
                        "cpu_percent": round(cpu_percent, 2),
                        "memory_mb": round(memory_mb, 2),
                        "status": pinfo["status"]
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        processes.sort(
            key=lambda process: (-process["cpu_percent"], -process["memory_mb"], process["pid"])
        )
        return processes[:15]

    def collect_ports(self):
        connections = {}
        for conn in psutil.net_connections():
            if conn.status == "LISTEN":
                try:
                    process = psutil.Process(conn.pid) if conn.pid else None
                    if process:
                        key = (conn.laddr.port, conn.pid, process.name())
                        connections[key] = {
                            "port": conn.laddr.port,
                            "process_name": process.name(),
                            "pid": conn.pid,
                            "status": conn.status
                        }
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        return sorted(connections.values(), key=lambda conn: (conn["port"], conn["pid"]))

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
        return {"processes": self.collect_processes()}

    def collect_network_snapshot(self):
        return {
            "ports": self.collect_ports(),
            "network_info": self.collect_network_info()
        }
