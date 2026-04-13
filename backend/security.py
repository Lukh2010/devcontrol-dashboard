import hmac
import os

from flask import jsonify, request


PROTECTED_ENDPOINTS_MESSAGE = "Protected action requires the launcher control password"


def is_password_protection_enabled() -> bool:
    """Return whether protected actions require a configured password."""
    return bool(get_configured_password())


def get_configured_password() -> str:
    """Return the configured control password."""
    return os.environ.get("DEVCONTROL_PASSWORD", "").strip()


def verify_control_password(password: str) -> bool:
    """Constant-time password verification for protected actions."""
    configured_password = get_configured_password()
    if not configured_password or not password:
        return False
    return hmac.compare_digest(password, configured_password)


def require_control_password():
    """Validate the control password sent with HTTP requests."""
    if not is_password_protection_enabled():
        return None

    provided_password = request.headers.get("X-DevControl-Password", "")
    if not verify_control_password(provided_password):
        return jsonify({"error": PROTECTED_ENDPOINTS_MESSAGE}), 401

    return None
