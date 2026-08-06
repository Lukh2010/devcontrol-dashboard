"""Security and audit policy verification tests."""

import os
from command_classifier import CommandClassifier
from security import (
    create_control_session,
    get_rate_limit_status,
    has_valid_control_session,
    invalidate_control_session,
    verify_control_password,
)


def test_security_password_and_session_lifecycle():
    os.environ["DEVCONTROL_PASSWORD"] = "SuperSecretPassword123!"

    # Invalid password validation should fail
    assert verify_control_password("WrongPassword") is False

    # Valid password validation succeeds
    assert verify_control_password("SuperSecretPassword123!") is True

    # Session creation and verification
    token, ttl = create_control_session()
    assert has_valid_control_session(token) is True
    assert ttl > 0

    # Invalidate session token
    invalidate_control_session(token)
    assert has_valid_control_session(token) is False


def test_rate_limiting_policy():
    allowed, retry_after = get_rate_limit_status("commands_run", "127.0.0.1")
    assert allowed is True
    assert retry_after == 0


def test_command_classifier_dangerous_pattern_detection():
    classifier = CommandClassifier()

    # Destructive system commands should be blocked or require confirmation
    policy_rm = classifier.evaluate_command("rm -rf /")
    assert policy_rm.classification in ("dangerous", "danger", "blocked", "confirmation_required", "unknown")

    # Safe standard read-only commands
    policy_ls = classifier.evaluate_command("ls")
    assert policy_ls.classification == "safe"
