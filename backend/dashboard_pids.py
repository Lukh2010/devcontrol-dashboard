import json
from pathlib import Path


PID_FILE = Path.home() / ".devcontrol_pids.json"


def load_dashboard_pids():
    """Load dashboard-managed PIDs from the shared PID file."""
    if not PID_FILE.exists():
        return {}

    try:
        with open(PID_FILE, "r", encoding="utf-8") as file_handle:
            return json.load(file_handle)
    except Exception:
        return {}


def save_dashboard_pids(pids):
    """Persist dashboard-managed PIDs to the shared PID file."""
    try:
        with open(PID_FILE, "w", encoding="utf-8") as file_handle:
            json.dump(pids, file_handle, indent=2)
    except Exception as exc:
        print(f"Warning: could not write PID file {PID_FILE}: {exc}")


def register_dashboard_pid(group: str, pid: int):
    """Register a dashboard PID in the shared PID file."""
    try:
        dashboard_pids = load_dashboard_pids()
        group_pids = dashboard_pids.setdefault(group, [])
        pid_str = str(pid)
        if pid_str not in group_pids:
            group_pids.append(pid_str)
            save_dashboard_pids(dashboard_pids)
    except Exception as exc:
        print(f"Warning: could not register PID {pid} for {group}: {exc}")


def is_dashboard_pid(pid: int) -> bool:
    """Check whether a PID is owned by this dashboard."""
    dashboard_pids = load_dashboard_pids()
    pid_str = str(pid)
    return any(pid_str in dashboard_pids.get(group, []) for group in ("backend", "frontend", "websocket"))
