#!/usr/bin/env python3
"""
Port Cleanup Script for DevControl Dashboard
Kills only dashboard processes using ports 3000, 8000, and 8003
"""

import os
import platform
import signal
import subprocess
import sys
import time
from pathlib import Path

import psutil

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from dashboard_pids import PID_FILE, is_dashboard_pid, register_dashboard_pid

PORTS_TO_CLEAN = {3000, 8000, 8003}


def terminate_pid(pid: int):
    if platform.system() == "Windows":
        result = subprocess.Popen(
            ["taskkill", "/T", "/F", "/PID", str(pid)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        stdout, stderr = result.communicate(timeout=10)
        if result.returncode == 0:
            print(f"Killed dashboard process {pid}")
            return
        print(f"Could not kill dashboard process {pid}: {stderr.strip() or stdout.strip()}")
        return

    try:
        os.kill(pid, signal.SIGTERM)
        start_time = time.time()
        while time.time() - start_time < 5:
            try:
                os.kill(pid, 0)
                time.sleep(0.1)
            except ProcessLookupError:
                print(f"Killed dashboard process {pid}")
                return
        os.kill(pid, signal.SIGKILL)
        print(f"Force killed dashboard process {pid}")
    except ProcessLookupError:
        print(f"PID {pid} already exited")


def cleanup_ports():
    print("DevControl Dashboard - Port Cleanup")
    print("=" * 50)

    matching_pids = set()

    for connection in psutil.net_connections():
        if connection.status not in {"LISTEN", "ESTABLISHED"}:
            continue
        if not connection.laddr:
            continue
        if connection.laddr.port not in PORTS_TO_CLEAN:
            continue
        if not connection.pid:
            continue
        if is_dashboard_pid(connection.pid):
            matching_pids.add(connection.pid)
        else:
            print(f"Skipping non-dashboard process {connection.pid} on port {connection.laddr.port}")

    if not matching_pids:
        print("No dashboard-owned processes found on tracked ports")
    else:
        for pid in sorted(matching_pids):
            try:
                terminate_pid(pid)
            except Exception as exc:
                print(f"Could not terminate PID {pid}: {exc}")

    try:
        if PID_FILE.exists():
            PID_FILE.unlink()
            print("Cleaned up PID file")
    except Exception:
        pass

    print("Port cleanup completed")


def register_pid(process_type, pid):
    register_dashboard_pid(process_type, int(pid))
    print(f"Registered {process_type} process PID: {pid}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--register":
        if len(sys.argv) >= 4:
            register_pid(sys.argv[2], sys.argv[3])
        else:
            print("Usage: python cleanup_ports.py --register <process_type> <pid>")
            sys.exit(1)
    else:
        try:
            cleanup_ports()
        except KeyboardInterrupt:
            print("\nCleanup interrupted by user")
            sys.exit(1)
        except Exception as exc:
            print(f"\nCleanup failed: {exc}")
            sys.exit(1)
