"""Shared process ownership and killability policy."""

from __future__ import annotations

import getpass
import os

import psutil

from dashboard_pids import is_dashboard_pid
from security import is_password_protection_enabled


PROTECTED_PIDS = {0, 4}


def normalize_username(username: str | None) -> str | None:
    """Normalize OS usernames for same-user comparisons."""
    if not username:
        return None

    normalized = str(username).strip().lower()
    if not normalized:
        return None

    if "\\" in normalized:
        normalized = normalized.rsplit("\\", 1)[-1]
    if "@" in normalized:
        normalized = normalized.split("@", 1)[0]
    return normalized or None


def current_username() -> str | None:
    """Return the user running the dashboard backend."""
    try:
        return normalize_username(getpass.getuser())
    except Exception:
        return None


def is_current_user_process(pid: int, username: str | None = None) -> bool:
    """Return whether the process is owned by the same user as the backend."""
    resolved_username = username
    if resolved_username is None:
        try:
            resolved_username = psutil.Process(pid).username()
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess, OSError):
            return False

    return normalize_username(resolved_username) == current_username()


def describe_process_control(pid: int, is_admin: bool, username: str | None = None) -> dict:
    """Describe whether a process can be stopped and why."""
    dashboard_owned = bool(pid) and is_dashboard_pid(pid)
    password_enabled = is_password_protection_enabled()
    protected_process = pid in PROTECTED_PIDS or pid == os.getpid()
    current_user_owned = bool(pid) and is_current_user_process(pid, username=username)

    owner_scope = "managed" if dashboard_owned else "current_user" if current_user_owned else "system_or_other_user"
    external_killable = (
        not dashboard_owned
        and current_user_owned
        and password_enabled
        and not protected_process
    )

    if dashboard_owned:
        if protected_process:
            return {
                "dashboard_owned": True,
                "owner_scope": "managed",
                "external_killable": False,
                "killable": False,
                "kill_reason": "Protected DevControl process cannot be stopped",
                "block_reason": "protected_process",
            }
        if os.name == "nt" and not is_admin:
            return {
                "dashboard_owned": True,
                "owner_scope": "managed",
                "external_killable": False,
                "killable": False,
                "kill_reason": "Administrator privileges required on Windows",
                "block_reason": "admin_required",
            }
        return {
            "dashboard_owned": True,
            "owner_scope": "managed",
            "external_killable": False,
            "killable": True,
            "kill_reason": None,
            "block_reason": None,
        }

    if protected_process:
        kill_reason = "Protected system or DevControl process"
        block_reason = "protected_process"
    elif not current_user_owned:
        kill_reason = "System or other-user process"
        block_reason = "not_current_user_process"
    elif not password_enabled:
        kill_reason = "Enable startup password to stop non-dashboard processes"
        block_reason = "password_mode_required"
    else:
        kill_reason = None
        block_reason = None

    return {
        "dashboard_owned": False,
        "owner_scope": owner_scope,
        "external_killable": external_killable,
        "killable": external_killable,
        "kill_reason": kill_reason,
        "block_reason": block_reason,
    }
