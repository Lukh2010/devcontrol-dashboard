import queue
from datetime import datetime, timezone
from email.utils import format_datetime
import time

from flask import Flask, Response, jsonify, make_response, request, stream_with_context
from flask_cors import CORS

from security import (
    SESSION_COOKIE_NAME,
    SESSION_TTL_SECONDS,
    check_rate_limit_or_response,
    clear_failed_attempts,
    create_control_session,
    invalidate_request_control_session,
    is_password_protection_enabled,
    register_failed_attempt,
    require_control_password,
    verify_control_password
)
from service_runtime import ServiceRuntime
from services.stream_processor import to_sse

def create_app(runtime: ServiceRuntime | None = None) -> Flask:
    runtime = runtime or ServiceRuntime()
    runtime.start()

    app = Flask(__name__)
    CORS(app, origins=["http://127.0.0.1:3000", "http://localhost:3000"])

    @app.route("/")
    def root():
        return jsonify({"message": "DevControl Dashboard API"})

    @app.route("/docs")
    def api_docs():
        docs = {
            "title": "DevControl Dashboard API",
            "version": "2.0.0",
            "description": "REST API for DevControl Dashboard",
            "architecture": {
                "api_service": "Flask API facade for the frontend contract",
                "telemetry_collector": "Periodic system/process/network collectors",
                "terminal_gateway": "WebSocket terminal service",
                "action_executor": "Protected command/process/port actions",
                "stream_processor": "Internal event bus consumer and SSE fanout"
            },
            "endpoints": {
                "/": "API Root - Returns API information",
                "/docs": "This API documentation",
                "/api/system/info": "Get system information (CPU, memory, platform)",
                "/api/system/performance": "Get real-time performance metrics",
                "/api/processes": "Get running processes with CPU and memory usage",
                "/api/ports": "Get active network ports and listening services",
                "/api/network/info": "Get network interface information",
                "/api/commands/run": "Execute system command (POST with command)"
            },
            "methods": {
                "GET": "Retrieve data",
                "POST": "Submit data/execute commands"
            },
            "examples": {
                "run_command": {
                    "url": "/api/commands/run",
                    "method": "POST",
                    "body": {"command": "dir", "name": "List Directory"}
                }
            }
        }
        return jsonify(docs)

    @app.route("/api/system/info")
    def get_system_info():
        try:
            return jsonify(runtime.telemetry.collect_system_info())
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    @app.route("/api/system/performance")
    def get_system_performance():
        try:
            return jsonify(runtime.telemetry.collect_system_performance())
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    @app.route("/api/processes")
    def get_processes():
        try:
            return jsonify(runtime.telemetry.collect_processes())
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    @app.route("/api/ports")
    def get_ports():
        try:
            return jsonify(runtime.telemetry.collect_ports())
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    @app.route("/api/port/<int:port>", methods=["DELETE"])
    def kill_process_by_port(port):
        auth_error = require_control_password("port_delete")
        if auth_error:
            return auth_error

        payload, status = runtime.actions.kill_process_by_port(port)
        return jsonify(payload), status

    @app.route("/api/commands/run", methods=["POST"])
    def run_command():
        auth_error = require_control_password("commands_run")
        if auth_error:
            return auth_error

        data = request.get_json(silent=True) or {}
        payload, status = runtime.actions.run_command(
            command=data.get("command", ""),
            name=data.get("name", "")
        )
        return jsonify(payload), status

    @app.route("/api/network/info")
    def get_network_info():
        try:
            return jsonify(runtime.telemetry.collect_network_info())
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    @app.route("/api/processes/<int:pid>/kill", methods=["POST"])
    def kill_process(pid):
        auth_error = require_control_password("process_kill")
        if auth_error:
            return auth_error

        payload, status = runtime.actions.kill_process(
            pid=pid,
            is_admin=runtime.telemetry.collect_is_admin()
        )
        return jsonify(payload), status

    @app.route("/api/system/is-admin")
    def is_admin():
        try:
            return jsonify({
                "is_admin": runtime.telemetry.collect_is_admin(),
                "platform": runtime.telemetry.collect_system_info()["platform"]
            })
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    @app.route("/api/events/stream")
    def stream_events():
        subscriber_id, subscriber_queue = runtime.stream_processor.subscribe()

        def generate():
            try:
                bootstrap_collectors = [
                    ("system_snapshot", runtime.telemetry.collect_system_snapshot),
                    ("process_snapshot", runtime.telemetry.collect_process_snapshot),
                    ("network_snapshot", runtime.telemetry.collect_network_snapshot),
                ]
                for event_type, collect_payload in bootstrap_collectors:
                    try:
                        payload = collect_payload()
                        payload["timestamp"] = time.time()
                        yield to_sse({"type": event_type, "payload": payload})
                    except Exception as bootstrap_error:
                        yield to_sse({
                            "type": "action",
                            "payload": {
                                "action": "bootstrap_snapshot_error",
                                "status": "failed",
                                "snapshot_type": event_type,
                                "reason": str(bootstrap_error),
                                "timestamp": time.time()
                            }
                        })

                while True:
                    try:
                        event = subscriber_queue.get(timeout=20)
                        yield to_sse(event)
                    except queue.Empty:
                        yield "event: heartbeat\ndata: {}\n\n"
            finally:
                runtime.stream_processor.unsubscribe(subscriber_id)

        response = Response(stream_with_context(generate()), mimetype="text/event-stream")
        response.headers["Cache-Control"] = "no-cache"
        response.headers["X-Accel-Buffering"] = "no"
        return response

    @app.route("/api/auth/validate", methods=["POST"])
    def validate_control_password():
        try:
            rate_limit_error = check_rate_limit_or_response("auth_validate")
            if rate_limit_error:
                return rate_limit_error

            if not is_password_protection_enabled():
                return jsonify({
                    "valid": True,
                    "configured": False,
                    "required": False
                })

            data = request.get_json(silent=True) or {}
            provided_password = data.get("password", "")
            is_valid = verify_control_password(provided_password)
            if is_valid:
                clear_failed_attempts("auth_validate")
            else:
                register_failed_attempt("auth_validate")

            return jsonify({
                "valid": is_valid,
                "configured": True,
                "required": True
            })
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    @app.route("/api/auth/session", methods=["POST"])
    def create_auth_session():
        try:
            rate_limit_error = check_rate_limit_or_response("auth_session")
            if rate_limit_error:
                return rate_limit_error

            if not is_password_protection_enabled():
                return jsonify({
                    "valid": True,
                    "configured": False,
                    "required": False
                })

            data = request.get_json(silent=True) or {}
            provided_password = data.get("password", "")

            if not verify_control_password(provided_password):
                register_failed_attempt("auth_session")
                response = make_response(jsonify({
                    "valid": False,
                    "configured": True,
                    "required": True
                }), 401)
                response.delete_cookie(SESSION_COOKIE_NAME, path="/")
                return response

            clear_failed_attempts("auth_session")
            token, expires_at = create_control_session()
            response = make_response(jsonify({
                "valid": True,
                "configured": True,
                "required": True
            }))
            response.set_cookie(
                SESSION_COOKIE_NAME,
                token,
                httponly=True,
                samesite="Strict",
                path="/",
                max_age=SESSION_TTL_SECONDS,
                expires=format_datetime(datetime.fromtimestamp(expires_at, tz=timezone.utc), usegmt=True)
            )
            return response
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    @app.route("/api/auth/session", methods=["DELETE"])
    def delete_auth_session():
        try:
            invalidate_request_control_session()
            response = make_response(jsonify({"success": True}))
            response.delete_cookie(SESSION_COOKIE_NAME, path="/")
            return response
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    @app.route("/api/auth/status")
    def auth_status():
        try:
            enabled = is_password_protection_enabled()
            return jsonify({
                "enabled": enabled,
                "required": enabled
            })
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="127.0.0.1", port=8000, debug=False)
