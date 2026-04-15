from command_classifier import CommandClassifier, contains_dangerous_shell_metachars


def test_safe_commands_are_classified_as_safe():
    classifier = CommandClassifier()

    for command in ("echo hello", "git status", "echo hello & world", 'type "file&name.txt"'):
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


def test_shell_metacharacters_are_detected_and_classified_as_dangerous():
    classifier = CommandClassifier()

    for command in (
        "echo hello && whoami",
        "git status | more",
        "type file.txt > out.txt",
        "echo $(whoami)",
    ):
        assert contains_dangerous_shell_metachars(command) is True
        classification, _ = classifier.classify_command(command)
        assert classification == "dangerous"


def test_harmless_ampersands_and_parentheses_are_allowed():
    classifier = CommandClassifier()

    for command in (
        "echo hello & world",
        'type "file&name.txt"',
        'dir "folder(name)"',
    ):
        assert contains_dangerous_shell_metachars(command) is False
        classification, _ = classifier.classify_command(command)
        assert classification in {"safe", "unknown"}
