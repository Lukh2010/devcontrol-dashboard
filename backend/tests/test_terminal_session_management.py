"""Unit tests for terminal session management API endpoints."""

import pytest
from app import create_app


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client


def test_get_terminal_sessions_api(client):
    response = client.get("/api/terminal/sessions")
    assert response.status_code == 200
    data = response.get_json()
    assert "sessions" in data
    assert "count" in data
    assert "max_sessions" in data
    assert isinstance(data["sessions"], list)


def test_terminate_terminal_session_not_found(client):
    import os
    pwd = os.environ.get("DEVCONTROL_PASSWORD", "ci-password")
    response = client.delete("/api/terminal/sessions/non_existent_session_id", headers={"X-DevControl-Password": pwd})
    assert response.status_code == 404
    data = response.get_json()
    assert "error" in data
