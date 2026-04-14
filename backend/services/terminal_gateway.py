import asyncio
from http.cookies import SimpleCookie
import json
import os
import threading

from websockets import exceptions as websocket_exceptions
from websockets.legacy.server import serve as websocket_serve

from dashboard_pids import register_dashboard_pid
from security import (
    PROTECTED_ENDPOINTS_MESSAGE,
    SESSION_COOKIE_NAME,
    has_valid_control_session,
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
            cookie_header = websocket.request_headers.get("Cookie", "")
            cookies = SimpleCookie()
            if cookie_header:
                cookies.load(cookie_header)

            session_cookie = cookies.get(SESSION_COOKIE_NAME)
            session_token = session_cookie.value if session_cookie else ""
            provided_password = websocket.request_headers.get("X-DevControl-Password", "")

            if not has_valid_control_session(session_token) and not verify_control_password(provided_password):
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": PROTECTED_ENDPOINTS_MESSAGE,
                    "reason": "unauthorized"
                }))
                self._publish_terminal_state("unauthorized", reason="invalid_password")
                await websocket.close(code=4401, reason="Unauthorized")
                return

            session_id = await self.terminal_manager.create_session(websocket)
            self._publish_terminal_state("connected", session_id=session_id)

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
                self._publish_terminal_state("disconnected", session_id=session_id)

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
            self.event_bus.publish("action", {
                "action": "terminal_server",
                "status": "ready",
                "port": self.port
            })
            print(f"WebSocket terminal server started on ws://localhost:{self.port}")
            loop.run_forever()
        except OSError as exc:
            message = str(exc)
            self.event_bus.publish("action", {
                "action": "terminal_server",
                "status": "unavailable",
                "port": self.port,
                "reason": message
            })
            if "address already in use" in message.lower() or "10048" in message:
                print(f"WebSocket port {self.port} is unavailable: {message}")
            else:
                raise

    def _publish_terminal_state(self, status, **details):
        self.event_bus.publish("action", {
            "action": "terminal_state",
            "status": status,
            **details
        })
