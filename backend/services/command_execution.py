"""Shared command parsing and builtin execution helpers."""

from __future__ import annotations

import os
import platform
import shlex
from datetime import datetime


WINDOWS_SHELL_BUILTINS = {
    "cd",
    "chdir",
    "cls",
    "dir",
    "echo",
    "set",
}


def parse_command_args(command: str) -> list[str]:
    """Parse a command string into argv without invoking a shell."""
    if platform.system() == "Windows":
        return shlex.split(command, posix=False)
    return shlex.split(command)


def build_subprocess_args(args: list[str]) -> list[str]:
    """Build subprocess argv without invoking a shell."""
    return list(args)


def is_internal_builtin(args: list[str]) -> bool:
    """Return whether argv can be handled without spawning a subprocess."""
    if not args:
        return False
    command = args[0].lower()
    if command in {"echo", "pwd"}:
        return True
    return platform.system() == "Windows" and command in WINDOWS_SHELL_BUILTINS


def run_internal_builtin(args: list[str], cwd: str) -> tuple[str, str]:
    """Run a small allowlisted builtin without invoking a shell."""
    command = args[0].lower() if args else ""

    if command == "echo":
        return f"{' '.join(args[1:])}\n", ""

    if command == "pwd":
        return f"{cwd}\n", ""

    if platform.system() != "Windows":
        return "", f"Unsupported builtin: {command}"

    if command in {"cd", "chdir"}:
        return f"{cwd}\n", ""

    if command == "cls":
        return "\x1bc", ""

    if command == "set":
        lines = [f"{key}={value}" for key, value in sorted(os.environ.items())]
        return "\n".join(lines) + ("\n" if lines else ""), ""

    if command == "dir":
        return _render_directory_listing(args, cwd), ""

    return "", f"Unsupported builtin: {command}"


def _resolve_dir_target(args: list[str], cwd: str) -> str:
    targets = [arg for arg in args[1:] if not arg.startswith("/")]
    target = targets[-1] if targets else "."
    expanded = os.path.expandvars(os.path.expanduser(target.strip('"').strip("'")))
    if os.path.isabs(expanded):
        return os.path.abspath(expanded)
    return os.path.abspath(os.path.join(cwd, expanded))


def _render_directory_listing(args: list[str], cwd: str) -> str:
    target = _resolve_dir_target(args, cwd)
    if not os.path.exists(target):
        return f"File Not Found: {target}\n"

    if os.path.isfile(target):
        entries = [target]
        display_dir = os.path.dirname(target) or cwd
    else:
        entries = [os.path.join(target, entry) for entry in sorted(os.listdir(target), key=str.lower)]
        display_dir = target

    lines = [f" Directory of {display_dir}", ""]
    for entry in entries:
        try:
            stat_result = os.stat(entry)
        except OSError:
            continue

        timestamp = datetime.fromtimestamp(stat_result.st_mtime).strftime("%m/%d/%Y  %I:%M %p")
        name = os.path.basename(entry)
        if os.path.isdir(entry):
            lines.append(f"{timestamp}    <DIR>          {name}")
        else:
            lines.append(f"{timestamp}    {stat_result.st_size:>14} {name}")

    lines.append("")
    return "\n".join(lines)
