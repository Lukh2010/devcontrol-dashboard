import asyncio
from http.cookies import SimpleCookie
import json
import os
import threading
import time

from websockets import exceptions as websocket_exceptions
from websockets.legacy.server import serve as websocket_serve

from dashboard_pids import register_dashboard_pid
from security import (
    PROTECTED_ENDPOINTS_MESSAGE,
    SESSION_COOKIE_NAME,
    RATE_LIMITED_MESSAGE,
    clear_failed_attempts,
    consume_rate_limit,
    get_rate_limit_status,
    has_valid_control_session,
    is_password_protection_enabled,
    register_failed_attempt,
    verify_control_password
)
from terminal_session import TerminalSessionManager


class TerminalGatewayService:
    """Owns terminal websocket lifecycle and session routing."""

    def __init__(self, event_bus, host: str = "127.0.0.1", port: int = 8003):
        self.event_bus = event_bus
        self.host = host
        self.port = port
        self.terminal_manager = TerminalSessionManager()
        self._thread = None
        self._thread_lock = threading.Lock()

    async def handle_websocket(self, websocket, path):
        try:
            client_ip = self._get_client_ip(websocket)
            allowed, retry_after = consume_rate_limit("terminal_handshake", client_ip)
            if not allowed:
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": RATE_LIMITED_MESSAGE,
                    "reason": "rate_limited",
                    "retry_after": retry_after,
                    "requires_password": is_password_protection_enabled(),
                }))
                self._publish_terminal_state(
                    "rate_limited",
                    message=RATE_LIMITED_MESSAGE,
                    severity="warning",
                    retry_after=retry_after,
                    reason="too_many_requests",
                    requires_password=is_password_protection_enabled(),
                )
                await websocket.close(code=4429, reason="Rate limited")
                return

            cookie_header = websocket.request_headers.get("Cookie", "")
            cookies = SimpleCookie()
            if cookie_header:
                cookies.load(cookie_header)

            session_cookie = cookies.get(SESSION_COOKIE_NAME)
            session_token = session_cookie.value if session_cookie else ""
            provided_password = websocket.request_headers.get("X-DevControl-Password", "")

            password_enabled = is_password_protection_enabled()
            authorized = (
                not password_enabled
                or has_valid_control_session(session_token)
                or verify_control_password(provided_password)
            )

            if not authorized:
                register_failed_attempt("terminal_handshake", client_ip)
                allowed_after_failure, failure_retry_after = get_rate_limit_status("terminal_handshake", client_ip)
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": PROTECTED_ENDPOINTS_MESSAGE,
                    "reason": "unauthorized",
                    "requires_password": password_enabled,
                    **({"retry_after": failure_retry_after} if not allowed_after_failure else {})
                }))
                self._publish_terminal_state(
                    "unauthorized",
                    message=PROTECTED_ENDPOINTS_MESSAGE,
                    severity="danger",
                    reason="invalid_password",
                    retry_after=failure_retry_after if not allowed_after_failure else None,
                    requires_password=True,
                )
                await websocket.close(code=4401, reason="Unauthorized")
                return

            clear_failed_attempts("terminal_handshake", client_ip)
            session_id = await self.terminal_manager.create_session(websocket)
            self._publish_terminal_state(
                "connected",
                message="Terminal session connected",
                severity="success",
                session_id=session_id,
                requires_password=password_enabled,
            )

            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self.terminal_manager.handle_message(session_id, data)
                except json.JSONDecodeError:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": "Invalid JSON message"
                    }))
                except Exception as exc:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": f"Error handling message: {str(exc)}"
                    }))

        except websocket_exceptions.ConnectionClosed:
            pass
        except Exception as exc:
            print(f"WebSocket error: {exc}")
        finally:
            if "session_id" in locals():
                await self.terminal_manager.close_session(session_id)
                self._publish_terminal_state(
                    "disconnected",
                    message="Terminal session disconnected",
                    severity="neutral",
                    session_id=session_id,
                )

    def start(self):
        with self._thread_lock:
            if self._thread and self._thread.is_alive():
                return
            self._thread = threading.Thread(target=self._start_server, daemon=True)
            self._thread.start()
            print("WebSocket server thread started")

    def _start_server(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            start_server = websocket_serve(self.handle_websocket, self.host, self.port)
            loop.run_until_complete(start_server)
            register_dashboard_pid("websocket", os.getpid())
            self._publish_action_event(
                "terminal_server",
                "ready",
                message=f"Terminal gateway ready on 127.0.0.1:{self.port}",
                severity="success",
                entity_type="terminal_server",
                entity_id=self.port,
                port=self.port,
                requires_password=is_password_protection_enabled(),
            )
            print(f"WebSocket terminal server started on ws://localhost:{self.port}")
            loop.run_forever()
        except OSError as exc:
            message = str(exc)
            self._publish_action_event(
                "terminal_server",
                "unavailable",
                message=message,
                severity="danger",
                entity_type="terminal_server",
                entity_id=self.port,
                port=self.port,
                reason=message,
                requires_password=is_password_protection_enabled(),
            )
            if "address already in use" in message.lower() or "10048" in message:
                print(f"WebSocket port {self.port} is unavailable: {message}")
            else:
                raise

    def _publish_terminal_state(self, status, message: str | None = None, severity: str | None = None, **details):
        self._publish_action_event(
            "terminal_state",
            status,
            message=message or f"Terminal {status}",
            severity=severity or ("success" if status == "connected" else "warning"),
            entity_type="terminal",
            entity_id=self.port,
            **details,
        )

    def _publish_action_event(
        self,
        action: str,
        status: str,
        message: str,
        severity: str,
        entity_type: str,
        entity_id,
        requires_admin: bool = False,
        requires_password: bool | None = None,
        retry_after: int | None = None,
        **details,
    ):
        resolved_requires_password = (
            is_password_protection_enabled()
            if requires_password is None
            else requires_password
        )
        self.event_bus.publish("action", {
            "action": action,
            "status": status,
            "message": message,
            "severity": severity,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "requires_admin": requires_admin,
            "requires_password": resolved_requires_password,
            "retry_after": retry_after,
            "timestamp": time.time(),
            **details,
        })

    def _get_client_ip(self, websocket) -> str:
        forwarded_for = websocket.request_headers.get("X-Forwarded-For", "").strip()
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        remote_address = getattr(websocket, "remote_address", None)
        if isinstance(remote_address, tuple) and remote_address:
            return str(remote_address[0])
        return "unknown"
