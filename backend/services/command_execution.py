"""Shared command parsing and builtin execution helpers."""

from __future__ import annotations

import platform
import shlex


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
    """Build subprocess argv, routing Windows shell builtins through cmd.exe."""
    if platform.system() == "Windows" and args and args[0].lower() in WINDOWS_SHELL_BUILTINS:
        return ["cmd.exe", "/C", args[0], *args[1:]]
    return list(args)


def is_windows_echo(args: list[str]) -> bool:
    """Return whether the parsed argv represents the Windows echo builtin."""
    return platform.system() == "Windows" and bool(args) and args[0].lower() == "echo"


def render_echo_output(args: list[str]) -> str:
    """Render the builtin echo output without spawning a subprocess."""
    return f"{' '.join(args[1:])}\n"
