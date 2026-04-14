import hmac
import os
import secrets
import time

from flask import jsonify, request


PROTECTED_ENDPOINTS_MESSAGE = "Protected action requires the launcher control password"
SESSION_COOKIE_NAME = "devcontrol_session"
SESSION_TTL_SECONDS = 4 * 60 * 60
SESSION_TOKENS = {}


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


def _purge_expired_sessions():
    now = time.time()
    expired_tokens = [
        token for token, expires_at in SESSION_TOKENS.items()
        if expires_at <= now
    ]
    for token in expired_tokens:
        SESSION_TOKENS.pop(token, None)


def create_control_session() -> tuple[str, int]:
    """Create a new cookie-backed control session."""
    _purge_expired_sessions()
    token = secrets.token_hex(32)
    expires_at = int(time.time() + SESSION_TTL_SECONDS)
    SESSION_TOKENS[token] = expires_at
    return token, expires_at


def has_valid_control_session(token: str) -> bool:
    """Return whether the provided session token is present and unexpired."""
    if not token:
        return False

    _purge_expired_sessions()
    expires_at = SESSION_TOKENS.get(token)
    if not expires_at:
        return False
    if expires_at <= time.time():
        SESSION_TOKENS.pop(token, None)
        return False
    return True


def invalidate_control_session(token: str):
    """Invalidate a stored control session token."""
    if token:
        SESSION_TOKENS.pop(token, None)


def invalidate_request_control_session():
    """Invalidate the control session token provided by the current request cookie."""
    invalidate_control_session(request.cookies.get(SESSION_COOKIE_NAME, ""))


def require_control_password():
    """Validate the control password sent with HTTP requests."""
    if not is_password_protection_enabled():
        return None

    if has_valid_control_session(request.cookies.get(SESSION_COOKIE_NAME, "")):
        return None

    provided_password = request.headers.get("X-DevControl-Password", "")
    if not verify_control_password(provided_password):
        return jsonify({"error": PROTECTED_ENDPOINTS_MESSAGE}), 401

    return None
