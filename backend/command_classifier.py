"""Backend command classification and confirmation policy."""

from __future__ import annotations

from dataclasses import asdict, dataclass
import re
from typing import Any, List, Tuple


SHELL_OPERATOR_MESSAGE = (
    "Shell operators like &, &&, ||, |, >, <, ;, backticks, and command substitution "
    "are not allowed for security reasons"
)

EMPTY_COMMAND_MESSAGE = "Enter a command to see how the backend will handle it."
SAFE_COMMAND_MESSAGE = "Command matches the allowlist and can run without confirmation."
DANGEROUS_COMMAND_MESSAGE = "Dangerous commands are blocked."
INTERACTIVE_COMMAND_MESSAGE = "Interactive commands are not supported in the current subprocess command runner."
CONFIRMATION_REQUIRED_MESSAGE = "Command is not on the allowlist and requires explicit confirmation."


@dataclass(frozen=True)
class CommandPolicy:
    """Structured backend decision for one command."""

    command: str
    classification: str
    status: str
    reason: str
    message: str
    requires_confirmation: bool

    def to_payload(self) -> dict[str, Any]:
        """Return a JSON-serializable payload for APIs and websocket messages."""
        return asdict(self)


def contains_dangerous_shell_metachars(command: str) -> bool:
    """Return whether the command contains blocked shell operators."""
    if not isinstance(command, str):
        return False

    stripped_command = command.strip()
    if not stripped_command:
        return False

    in_single_quote = False
    in_double_quote = False
    escaped = False
    index = 0

    while index < len(stripped_command):
        char = stripped_command[index]
        next_char = stripped_command[index + 1] if index + 1 < len(stripped_command) else ""

        if escaped:
            escaped = False
            index += 1
            continue

        if char == "\\" and not in_single_quote:
            escaped = True
            index += 1
            continue

        if char == "'" and not in_double_quote:
            in_single_quote = not in_single_quote
            index += 1
            continue

        if char == '"' and not in_single_quote:
            in_double_quote = not in_double_quote
            index += 1
            continue

        if in_single_quote or in_double_quote:
            index += 1
            continue

        if char == "`":
            return True

        if char == "$" and next_char in ("(", "{"):
            return True

        if char == "&" and next_char == "&":
            return True

        if char == "&":
            return True

        if char == "|" and next_char == "|":
            return True

        if char == ">" and next_char == ">":
            return True

        if char in {"|", ">", "<", ";"}:
            return True

        index += 1

    return False


class CommandClassifier:
    """Classifies commands and returns a consistent execution policy."""

    def __init__(self):
        self.dangerous_patterns = [
            r"rm\s+-rf\s+/",
            r"rm\s+-rf\s+\*",
            r"^(del|erase)(\s|$)",
            r"^(rmdir|rd)(\s|$)",
            r"format\s+",
            r"fdisk\s+",
            r"mkfs\.",
            r"shutdown(\s|$)",
            r"reboot(\s|$)",
            r"poweroff(\s|$)",
            r"halt(\s|$)",
            r"init\s+0",
            r"init\s+6",
            r"sudo\s+rm\s+-rf",
            r"sudo\s+del",
            r"sudo\s+format",
            r"sudo\s+shutdown",
            r"sudo\s+reboot",
            r"chmod\s+777\s+/",
            r"chown\s+.*\s+/",
            r"sudo\s+chmod\s+777",
            r"sudo\s+chown\s+.*\s+/",
            r"dd\s+if=/dev/zero",
            r":\(\)\{\.*:\|.*\}\.*:",
            r"eval\s+\$\(.*\)",
            r"exec\s+\$\(.*\)",
        ]

        self.interactive_patterns = [
            r"vim(\s|$)",
            r"vi(\s|$)",
            r"nano(\s|$)",
            r"emacs(\s|$)",
            r"top(\s|$)",
            r"htop(\s|$)",
            r"less(\s|$)",
            r"more(\s|$)",
            r"tail\s+-f",
            r"watch(\s|$)",
            r"irb(\s|$)",
            r"python\s*$",
            r"python3\s*$",
            r"node\s*$",
            r"ssh(\s|$)",
            r"ftp(\s|$)",
            r"telnet(\s|$)",
            r"mysql(\s|$)",
            r"psql(\s|$)",
            r"sqlite3(\s|$)",
        ]

        self.safe_patterns = [
            r"ls(\s|$)",
            r"dir(\s|$)",
            r"pwd(\s|$)",
            r"cd(\s|$)",
            r"cat\s+",
            r"type\s+",
            r"grep\s+",
            r"find(\s|$)",
            r"where(\s|$)",
            r"ps(\s|$)",
            r"tasklist(\s|$)",
            r"netstat(\s|$)",
            r"ipconfig(\s|$)",
            r"systeminfo(\s|$)",
            r"kill(\s|$)",
            r"git(\s|$)",
            r"npm(\s|$)",
            r"pip(\s|$)",
            r"python\s+.*\.py",
            r"node\s+.*\.js",
            r"mkdir(\s|$)",
            r"touch(\s|$)",
            r"cp(\s|$)",
            r"copy(\s|$)",
            r"mv(\s|$)",
            r"move(\s|$)",
            r"ren(\s|$)",
            r"rename(\s|$)",
            r"echo(\s|$)",
            r"cls(\s|$)",
            r"set(\s|$)",
            r"export(\s|$)",
            r"env(\s|$)",
            r"whoami(\s|$)",
            r"id(\s|$)",
            r"date(\s|$)",
            r"uptime(\s|$)",
            r"df\s+-h",
            r"du\s+-h",
            r"free\s+-h",
            r"uname\s+-a",
            r"ping(\s|$)",
            r"curl(\s|$)",
            r"wget(\s|$)",
            r"tar(\s|$)",
            r"zip(\s|$)",
            r"unzip(\s|$)",
            r"chmod\s+[0-7]{3,4}\s+",
            r"chown\s+.*\s+(?!=/)",
        ]

    def evaluate_command(self, command: str) -> CommandPolicy:
        """Return the backend policy that should be applied to the command."""
        normalized_command = command.strip() if isinstance(command, str) else ""
        command_lower = normalized_command.lower()

        if not normalized_command:
            return CommandPolicy(
                command="",
                classification="empty",
                status="idle",
                reason="empty_command",
                message=EMPTY_COMMAND_MESSAGE,
                requires_confirmation=False,
            )

        if contains_dangerous_shell_metachars(normalized_command):
            return CommandPolicy(
                command=normalized_command,
                classification="dangerous",
                status="blocked",
                reason="shell_operator_blocked",
                message=SHELL_OPERATOR_MESSAGE,
                requires_confirmation=False,
            )

        for pattern in self.dangerous_patterns:
            if re.search(pattern, command_lower, re.IGNORECASE):
                return CommandPolicy(
                    command=normalized_command,
                    classification="dangerous",
                    status="blocked",
                    reason="dangerous_command",
                    message=DANGEROUS_COMMAND_MESSAGE,
                    requires_confirmation=False,
                )

        for pattern in self.interactive_patterns:
            if re.search(pattern, command_lower, re.IGNORECASE):
                return CommandPolicy(
                    command=normalized_command,
                    classification="interactive",
                    status="blocked",
                    reason="interactive_command",
                    message=INTERACTIVE_COMMAND_MESSAGE,
                    requires_confirmation=False,
                )

        for pattern in self.safe_patterns:
            if re.match(pattern, command_lower, re.IGNORECASE):
                return CommandPolicy(
                    command=normalized_command,
                    classification="safe",
                    status="allowed",
                    reason="allowlisted_command",
                    message=SAFE_COMMAND_MESSAGE,
                    requires_confirmation=False,
                )

        return CommandPolicy(
            command=normalized_command,
            classification="unknown",
            status="confirmation_required",
            reason="confirmation_required",
            message=CONFIRMATION_REQUIRED_MESSAGE,
            requires_confirmation=True,
        )

    def classify_command(self, command: str) -> Tuple[str, str]:
        """Compatibility wrapper returning just classification and message."""
        policy = self.evaluate_command(command)
        return policy.classification, policy.message

    def requires_confirmation(self, command: str) -> bool:
        """Return whether the command needs explicit confirmation before execution."""
        return self.evaluate_command(command).requires_confirmation

    def needs_sudo(self, command: str) -> bool:
        """Backward-compatible alias for confirmation checks."""
        return self.requires_confirmation(command)

    def is_interactive(self, command: str) -> bool:
        """Return whether the command would be blocked as interactive."""
        return self.evaluate_command(command).classification == "interactive"

    def get_dangerous_commands(self) -> List[str]:
        """Get list of dangerous command descriptions."""
        return [
            "Delete system files (rm -rf /, del, rmdir)",
            "Format drives (format)",
            "Shutdown or reboot the system",
            "Change root permissions",
            "Disk destruction commands",
            "Fork bombs and injection attacks",
        ]

    def get_safe_commands_examples(self) -> List[str]:
        """Get examples of safe commands."""
        return [
            "ls, pwd, cd - Basic navigation",
            "cat, grep, find - File operations",
            "git, npm, pip - Development tools",
            "ps, kill - Process management",
            "ping, curl - Network tools",
        ]

    def get_confirmation_guidance(self) -> List[str]:
        """Get short review guidance for allowlist-miss confirmations."""
        return [
            "Verify the executable and arguments are expected.",
            "Unknown commands run outside the allowlist.",
            "Shell operators and command substitution remain blocked.",
        ]
