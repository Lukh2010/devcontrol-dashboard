from command_classifier import CommandClassifier


def test_safe_commands_are_classified_as_safe():
    classifier = CommandClassifier()

    for command in ("echo hello", "git status"):
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

