import hmac
import os
import secrets
import time
from typing import Any

from flask import jsonify, request


PROTECTED_ENDPOINTS_MESSAGE = "Protected action requires the launcher control password"
RATE_LIMITED_MESSAGE = "Too many requests. Please wait before retrying."
SESSION_COOKIE_NAME = "devcontrol_session"
SESSION_TTL_SECONDS = 4 * 60 * 60
SESSION_TOKENS = {}
RATE_LIMIT_STATE: dict[str, list[float]] = {}
FAILED_AUTH_STATE: dict[str, list[float]] = {}
LOCKOUT_STATE: dict[str, float] = {}

RATE_LIMIT_POLICIES = {
    "auth_validate": {
        "limit": 8,
        "window_seconds": 60,
        "failure_limit": 4,
        "failure_window_seconds": 300,
        "lockout_seconds": 300,
    },
    "auth_session": {
        "limit": 6,
        "window_seconds": 60,
        "failure_limit": 4,
        "failure_window_seconds": 300,
        "lockout_seconds": 300,
    },
    "commands_run": {
        "limit": 12,
        "window_seconds": 60,
    },
    "process_kill": {
        "limit": 10,
        "window_seconds": 60,
    },
    "port_delete": {
        "limit": 10,
        "window_seconds": 60,
    },
    "terminal_handshake": {
        "limit": 6,
        "window_seconds": 60,
        "failure_limit": 4,
        "failure_window_seconds": 300,
        "lockout_seconds": 300,
    },
}


def _now() -> float:
    return time.time()


def _state_key(action: str, client_ip: str) -> str:
    return f"{action}:{client_ip or 'unknown'}"


def _prune_bucket(state: dict[str, list[float]], key: str, window_seconds: int) -> list[float]:
    current_time = _now()
    entries = [entry for entry in state.get(key, []) if current_time - entry < window_seconds]
    if entries:
        state[key] = entries
    else:
        state.pop(key, None)
    return entries


def get_client_ip(explicit_ip: str | None = None) -> str:
    """Return a client IP for HTTP requests or explicit non-HTTP callers."""
    if explicit_ip:
        return explicit_ip

    forwarded_for = request.headers.get("X-Forwarded-For", "").strip()
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    return request.remote_addr or "unknown"


def get_rate_limit_status(action: str, client_ip: str | None = None) -> tuple[bool, int]:
    """Return whether the action is allowed and a retry-after value in seconds."""
    policy = RATE_LIMIT_POLICIES[action]
    resolved_ip = get_client_ip(client_ip)
    key = _state_key(action, resolved_ip)
    current_time = _now()

    locked_until = LOCKOUT_STATE.get(key)
    if locked_until and locked_until > current_time:
        return False, max(int(locked_until - current_time), 1)
    if locked_until and locked_until <= current_time:
        LOCKOUT_STATE.pop(key, None)

    entries = _prune_bucket(RATE_LIMIT_STATE, key, policy["window_seconds"])
    if len(entries) >= policy["limit"]:
        retry_after = max(int(policy["window_seconds"] - (current_time - entries[0])), 1)
        return False, retry_after

    return True, 0


def consume_rate_limit(action: str, client_ip: str | None = None) -> tuple[bool, int]:
    """Consume one request from the action bucket if allowed."""
    allowed, retry_after = get_rate_limit_status(action, client_ip)
    if not allowed:
        return False, retry_after

    resolved_ip = get_client_ip(client_ip)
    key = _state_key(action, resolved_ip)
    RATE_LIMIT_STATE.setdefault(key, []).append(_now())
    return True, 0


def register_failed_attempt(action: str, client_ip: str | None = None):
    """Track failed authentication-like attempts and trigger lockouts when needed."""
    policy = RATE_LIMIT_POLICIES.get(action, {})
    failure_limit = policy.get("failure_limit")
    failure_window_seconds = policy.get("failure_window_seconds")
    lockout_seconds = policy.get("lockout_seconds")
    if not failure_limit or not failure_window_seconds or not lockout_seconds:
        return

    resolved_ip = get_client_ip(client_ip)
    key = _state_key(action, resolved_ip)
    failures = _prune_bucket(FAILED_AUTH_STATE, key, failure_window_seconds)
    failures.append(_now())
    FAILED_AUTH_STATE[key] = failures
    if len(failures) >= failure_limit:
        LOCKOUT_STATE[key] = _now() + lockout_seconds


def clear_failed_attempts(action: str, client_ip: str | None = None):
    """Clear recorded failures after a successful authentication."""
    resolved_ip = get_client_ip(client_ip)
    key = _state_key(action, resolved_ip)
    FAILED_AUTH_STATE.pop(key, None)
    LOCKOUT_STATE.pop(key, None)


def make_rate_limit_response(retry_after: int, message: str = RATE_LIMITED_MESSAGE):
    """Create a standard HTTP 429 response."""
    response = jsonify({
        "error": message,
        "retry_after": retry_after,
    })
    response.status_code = 429
    response.headers["Retry-After"] = str(retry_after)
    return response


def check_rate_limit_or_response(action: str):
    """Consume rate limit budget for the current request or return a 429 response."""
    allowed, retry_after = consume_rate_limit(action)
    if allowed:
        return None
    return make_rate_limit_response(retry_after)


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


def require_control_password(action: str | None = None):
    """Validate the control password sent with HTTP requests."""
    if action:
        rate_limit_error = check_rate_limit_or_response(action)
        if rate_limit_error:
            return rate_limit_error

    if not is_password_protection_enabled():
        return None

    if has_valid_control_session(request.cookies.get(SESSION_COOKIE_NAME, "")):
        return None

    provided_password = request.headers.get("X-DevControl-Password", "")
    if not verify_control_password(provided_password):
        if action:
            register_failed_attempt(action)
        return jsonify({"error": PROTECTED_ENDPOINTS_MESSAGE}), 401

    if action:
        clear_failed_attempts(action)
    return None
