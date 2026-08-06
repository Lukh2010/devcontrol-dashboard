import pytest

from command_classifier import CommandClassifier, contains_dangerous_shell_metachars


def test_safe_commands_are_classified_as_safe():
    classifier = CommandClassifier()

    for command in ("echo hello", "git status", 'type "file&name.txt"'):
        classification, _ = classifier.classify_command(command)
        assert classification == "safe"


def test_dangerous_commands_are_classified_as_dangerous():
    classifier = CommandClassifier()

    for command in ("shutdown now", "rm -rf /"):
        classification, _ = classifier.classify_command(command)
        assert classification == "dangerous"


def test_interactive_commands_are_classified_as_interactive():
    classifier = CommandClassifier()

    for command in ("vim test.txt", "ssh example.com"):
        classification, _ = classifier.classify_command(command)
        assert classification == "interactive"


def test_unknown_commands_are_classified_as_unknown():
    classifier = CommandClassifier()

    for command in ("foo_bar_baz_command", "custom-tool --flag"):
        classification, _ = classifier.classify_command(command)
        assert classification == "unknown"


@pytest.mark.parametrize(
    "command",
    [
        "evilgit status",
        "notnpm install",
        "mycurl --help",
        "false",
        "lsbad",
    ],
)
def test_allowlist_does_not_match_command_substrings(command):
    classifier = CommandClassifier()

    policy = classifier.evaluate_command(command)

    assert policy.classification == "unknown"
    assert policy.status == "confirmation_required"
    assert policy.requires_confirmation is True


def test_command_policy_uses_confirmation_required_for_unknown_commands():
    classifier = CommandClassifier()

    policy = classifier.evaluate_command("custom-tool --flag")

    assert policy.classification == "unknown"
    assert policy.status == "confirmation_required"
    assert policy.requires_confirmation is True


@pytest.mark.parametrize(
    ("command", "reason"),
    [
        ("echo hello && whoami", "double ampersand chain"),
        ("dir & whoami", "single ampersand command separator"),
        ("git status || more", "double pipe chain"),
        ("type file.txt > out.txt", "output redirection"),
        ("echo hello; whoami", "semicolon command separator"),
        ("echo $(whoami)", "command substitution"),
        ("echo ${USERNAME}", "variable-style command substitution"),
    ],
)
def test_shell_metacharacters_are_detected_and_classified_as_dangerous(command, reason):
    classifier = CommandClassifier()

    assert contains_dangerous_shell_metachars(command) is True, reason

    policy = classifier.evaluate_command(command)
    assert policy.classification == "dangerous"
    assert policy.status == "blocked"
    assert policy.reason == "shell_operator_blocked"


@pytest.mark.parametrize(
    "command",
    [
        'type "file&name.txt"',
        'dir "folder(name)"',
        'echo "$(whoami)"',
        "echo '&'",
    ],
)
def test_quoted_metacharacters_are_treated_as_literal_text(command):
    classifier = CommandClassifier()

    assert contains_dangerous_shell_metachars(command) is False

    policy = classifier.evaluate_command(command)
    assert policy.classification in {"safe", "unknown"}
    assert policy.reason != "shell_operator_blocked"
