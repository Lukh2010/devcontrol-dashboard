"""Command-backed inventory collection for processes and listening ports.

This service intentionally executes only fixed, internal commands without any
user-provided input. It normalizes platform-specific command output into a
stable list-of-dicts shape for telemetry consumers.
"""

from __future__ import annotations

import json
import platform
import re
import subprocess
from typing import Any


class SystemInventoryService:
    """Collect process and port inventory using platform-native commands."""

    def __init__(self, command_timeout: float = 10.0):
        self.command_timeout = command_timeout

    def collect_processes(self) -> list[dict[str, Any]]:
        """Return normalized process inventory for the current platform."""
        system = platform.system()
        if system == "Windows":
            return self._collect_windows_processes()
        return self._collect_posix_processes()

    def collect_ports(self) -> list[dict[str, Any]]:
        """Return normalized listening-port inventory for the current platform."""
        system = platform.system()
        if system == "Windows":
            return self._collect_windows_ports()
        return self._collect_posix_ports()

    def _collect_windows_processes(self) -> list[dict[str, Any]]:
        output = self._run_command([
            "powershell.exe",
            "-NoProfile",
            "-Command",
            (
                "$perf = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process;"
                "$processes = Get-CimInstance Win32_Process;"
                "$result = foreach ($proc in $processes) {"
                "  $metric = $perf | Where-Object { $_.IDProcess -eq $proc.ProcessId } | Select-Object -First 1;"
                "  [PSCustomObject]@{"
                "    pid = [int]$proc.ProcessId;"
                "    parent_pid = [int]$proc.ParentProcessId;"
                "    name = $proc.Name;"
                "    cpu_percent = if ($metric) { [double]$metric.PercentProcessorTime } else { 0 };"
                "    memory_mb = if ($metric) { [math]::Round(([double]$metric.WorkingSetPrivate / 1MB), 2) } else { 0 };"
                "    status = $null;"
                "    username = $null;"
                "    exe_path = $proc.ExecutablePath;"
                "    command_line = $proc.CommandLine;"
                "    started_at = if ($proc.CreationDate) { ([System.Management.ManagementDateTimeConverter]::ToDateTime($proc.CreationDate)).ToString('o') } else { $null };"
                "  };"
                "};"
                "$result | ConvertTo-Json -Depth 4 -Compress"
            ),
        ])
        return [self._normalize_process_record(record) for record in self._load_json_records(output)]

    def _collect_windows_ports(self) -> list[dict[str, Any]]:
        output = self._run_command([
            "powershell.exe",
            "-NoProfile",
            "-Command",
            (
                "$processes = Get-CimInstance Win32_Process | Select-Object ProcessId,Name,ExecutablePath;"
                "$listeners = Get-NetTCPConnection -State Listen | Select-Object LocalAddress,LocalPort,State,OwningProcess;"
                "$result = foreach ($conn in $listeners) {"
                "  $proc = $processes | Where-Object { $_.ProcessId -eq $conn.OwningProcess } | Select-Object -First 1;"
                "  [PSCustomObject]@{"
                "    port = [int]$conn.LocalPort;"
                "    protocol = 'tcp';"
                "    local_address = $conn.LocalAddress;"
                "    remote_address = $null;"
                "    state = $conn.State;"
                "    status = $conn.State;"
                "    pid = [int]$conn.OwningProcess;"
                "    process_name = if ($proc) { $proc.Name } else { 'Unknown' };"
                "    exe_path = if ($proc) { $proc.ExecutablePath } else { $null };"
                "  };"
                "};"
                "$result | ConvertTo-Json -Depth 4 -Compress"
            ),
        ])
        return [self._normalize_port_record(record) for record in self._load_json_records(output)]

    def _collect_posix_processes(self) -> list[dict[str, Any]]:
        output = self._run_command([
            "ps",
            "-eo",
            "pid=,ppid=,user=,stat=,pcpu=,rss=,comm=,args=",
            "--no-headers",
            "-ww",
        ])
        records = []
        for raw_line in output.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            parts = re.split(r"\s+", line, maxsplit=7)
            if len(parts) < 7:
                continue

            pid, parent_pid, username, status, cpu_percent, rss_kb, name = parts[:7]
            command_line = parts[7] if len(parts) > 7 else name
            records.append(self._normalize_process_record({
                "pid": pid,
                "parent_pid": parent_pid,
                "username": username,
                "status": status,
                "cpu_percent": cpu_percent,
                "memory_mb": round(self._to_float(rss_kb) / 1024, 2),
                "name": name,
                "command_line": command_line,
                "exe_path": None,
                "started_at": None,
            }))
        return records

    def _collect_posix_ports(self) -> list[dict[str, Any]]:
        output = self._run_command(["ss", "-ltnpH"])
        records = []
        for raw_line in output.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            match = re.match(
                r"^(?P<state>\S+)\s+\S+\s+\S+\s+(?P<local>\S+)\s+(?P<peer>\S+)(?:\s+users:\(\((?P<users>.+)\)\))?",
                line,
            )
            if not match:
                continue

            local_host, local_port = self._split_host_port(match.group("local"))
            process_name, pid = self._parse_ss_users(match.group("users"))
            records.append(self._normalize_port_record({
                "port": local_port,
                "protocol": "tcp",
                "local_address": local_host,
                "remote_address": match.group("peer"),
                "state": match.group("state"),
                "status": match.group("state"),
                "pid": pid,
                "process_name": process_name,
                "exe_path": None,
            }))
        return records

    def _run_command(self, args: list[str]) -> str:
        """Run a fixed internal command and return stdout."""
        try:
            result = subprocess.run(
                args,
                capture_output=True,
                text=True,
                timeout=self.command_timeout,
                check=False,
            )
        except FileNotFoundError as exc:
            raise RuntimeError(f"Inventory command not available: {args[0]}") from exc
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError(f"Inventory command timed out: {args[0]}") from exc

        if result.returncode != 0:
            stderr = (result.stderr or "").strip()
            raise RuntimeError(stderr or f"Inventory command failed: {args[0]}")

        return result.stdout.strip()

    def _load_json_records(self, raw_output: str) -> list[dict[str, Any]]:
        """Normalize PowerShell JSON output into a list of records."""
        if not raw_output:
            return []

        try:
            payload = json.loads(raw_output)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Inventory JSON parsing failed: {exc}") from exc

        return self._normalize_json_records(payload)

    def _normalize_json_records(self, payload: Any) -> list[dict[str, Any]]:
        """Convert null/object/array JSON payloads into a list of dicts."""
        if payload is None:
            return []
        if isinstance(payload, dict):
            return [payload]
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
        raise RuntimeError(f"Unexpected inventory payload type: {type(payload).__name__}")

    def _normalize_process_record(self, record: dict[str, Any]) -> dict[str, Any]:
        """Return a consistent process record shape."""
        pid = self._to_int(record.get("pid"))
        name = str(record.get("name") or "Unknown").strip() or "Unknown"
        return {
            "pid": pid,
            "parent_pid": self._to_int(record.get("parent_pid")),
            "name": name,
            "cpu_percent": round(self._to_float(record.get("cpu_percent")), 2),
            "memory_mb": round(self._to_float(record.get("memory_mb")), 2),
            "status": str(record.get("status") or "unknown"),
            "username": self._to_optional_str(record.get("username")),
            "exe_path": self._to_optional_str(record.get("exe_path")),
            "command_line": self._to_optional_str(record.get("command_line")),
            "started_at": self._to_optional_str(record.get("started_at")),
        }

    def _normalize_port_record(self, record: dict[str, Any]) -> dict[str, Any]:
        """Return a consistent port record shape."""
        return {
            "port": self._to_int(record.get("port")),
            "protocol": str(record.get("protocol") or "tcp"),
            "local_address": self._to_optional_str(record.get("local_address")),
            "remote_address": self._to_optional_str(record.get("remote_address")),
            "state": self._to_optional_str(record.get("state")),
            "status": str(record.get("status") or "LISTEN"),
            "pid": self._to_int(record.get("pid")),
            "process_name": str(record.get("process_name") or "Unknown").strip() or "Unknown",
            "exe_path": self._to_optional_str(record.get("exe_path")),
        }

    def _parse_ss_users(self, users_blob: str | None) -> tuple[str, int]:
        """Extract process name and PID from an ss users blob."""
        if not users_blob:
            return "Unknown", 0

        match = re.search(r'"(?P<name>[^"]+)"(?:,pid=(?P<pid>\d+))?', users_blob)
        if not match:
            return "Unknown", 0
        return match.group("name"), self._to_int(match.group("pid"))

    def _split_host_port(self, local_value: str) -> tuple[str | None, int]:
        """Split an address like 127.0.0.1:8000 or [::1]:8000 into host/port."""
        if not local_value:
            return None, 0

        if local_value.startswith("[") and "]:" in local_value:
            host, _, port = local_value[1:].partition("]:")
            return host, self._to_int(port)

        host, _, port = local_value.rpartition(":")
        return (host or None), self._to_int(port)

    def _to_int(self, value: Any) -> int:
        try:
            if value in (None, ""):
                return 0
            return int(float(value))
        except (TypeError, ValueError):
            return 0

    def _to_float(self, value: Any) -> float:
        try:
            if value in (None, ""):
                return 0.0
            return float(value)
        except (TypeError, ValueError):
            return 0.0

    def _to_optional_str(self, value: Any) -> str | None:
        if value in (None, ""):
            return None
        normalized = str(value).strip()
        return normalized or None
