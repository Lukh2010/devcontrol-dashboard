import json
from pathlib import Path
from typing import Any

import psutil


PID_FILE = Path.home() / ".devcontrol_pids.json"
TRUSTED_PID_GROUPS = ("backend", "frontend")


def _get_process_create_time(pid: int) -> float | None:
    """Return the current process create time for PID matching."""
    try:
        return float(psutil.Process(pid).create_time())
    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess, OSError, ValueError):
        return None


def _normalize_pid_entry(entry: Any) -> dict[str, Any] | None:
    """Normalize persisted PID entries into a metadata dict."""
    if isinstance(entry, dict):
        try:
            pid = int(entry.get("pid") or 0)
        except (TypeError, ValueError):
            return None

        if pid <= 0:
            return None

        create_time = entry.get("create_time")
        normalized_entry = {"pid": str(pid)}
        if create_time not in (None, ""):
            try:
                normalized_entry["create_time"] = float(create_time)
            except (TypeError, ValueError):
                normalized_entry["create_time"] = None
        else:
            normalized_entry["create_time"] = None
        return normalized_entry

    try:
        pid = int(str(entry))
    except (TypeError, ValueError):
        return None

    if pid <= 0:
        return None

    return {
        "pid": str(pid),
        "create_time": None,
    }


def _normalize_group_entries(entries: Any) -> list[dict[str, Any]]:
    """Return only valid normalized PID entries for one group."""
    if not isinstance(entries, list):
        return []

    normalized_entries: list[dict[str, Any]] = []
    for entry in entries:
        normalized_entry = _normalize_pid_entry(entry)
        if normalized_entry is not None:
            normalized_entries.append(normalized_entry)
    return normalized_entries


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
        group_entries = _normalize_group_entries(dashboard_pids.get(group, []))
        pid_str = str(pid)
        create_time = _get_process_create_time(pid)

        updated = False
        for entry in group_entries:
            if entry["pid"] != pid_str:
                continue
            if entry.get("create_time") != create_time:
                entry["create_time"] = create_time
                updated = True
            break
        else:
            group_entries.append({
                "pid": pid_str,
                "create_time": create_time,
            })
            updated = True

        if updated or dashboard_pids.get(group) != group_entries:
            dashboard_pids[group] = group_entries
            save_dashboard_pids(dashboard_pids)
    except Exception as exc:
        print(f"Warning: could not register PID {pid} for {group}: {exc}")


def is_dashboard_pid(pid: int) -> bool:
    """Check whether a PID is owned by this dashboard."""
    dashboard_pids = load_dashboard_pids()
    pid_str = str(pid)
    current_create_time = _get_process_create_time(pid)
    if current_create_time is None:
        return False

    for group in TRUSTED_PID_GROUPS:
        for entry in _normalize_group_entries(dashboard_pids.get(group, [])):
            if entry["pid"] != pid_str:
                continue

            stored_create_time = entry.get("create_time")
            if stored_create_time is None:
                continue

            if abs(float(stored_create_time) - current_create_time) <= 0.001:
                return True

    return False
