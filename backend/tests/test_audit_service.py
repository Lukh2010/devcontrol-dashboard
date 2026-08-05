"""Unit tests for AuditService and GET /api/audit/logs endpoint."""

import json
import pytest
from app import create_app
from services.audit_service import AuditService


@pytest.fixture
def audit_service(tmp_path):
    log_file = tmp_path / "audit_test.log"
    return AuditService(log_file=log_file, max_entries=10)


def test_record_and_query_action(audit_service):
    entry1 = audit_service.record_action({
        "action": "process_kill",
        "status": "success",
        "severity": "danger",
        "message": "Killed PID 1234",
        "entity_type": "process",
        "entity_id": 1234,
    })

    entry2 = audit_service.record_action({
        "action": "port_stop",
        "status": "success",
        "severity": "warning",
        "message": "Stopped port 8080",
        "entity_type": "port",
        "entity_id": 8080,
    })

    result = audit_service.get_audit_logs(limit=50)
    assert result["total"] == 2
    assert len(result["logs"]) == 2
    assert result["logs"][0]["action"] == "port_stop"
    assert result["logs"][1]["action"] == "process_kill"


def test_query_filtering(audit_service):
    audit_service.record_action({"action": "login", "severity": "success", "message": "User logged in"})
    audit_service.record_action({"action": "process_kill", "severity": "danger", "message": "Killed process"})
    audit_service.record_action({"action": "command_run", "severity": "warning", "message": "Ran custom script"})

    danger_result = audit_service.get_audit_logs(severity="danger")
    assert danger_result["total"] == 1
    assert danger_result["logs"][0]["action"] == "process_kill"

    search_result = audit_service.get_audit_logs(search="logged")
    assert search_result["total"] == 1
    assert search_result["logs"][0]["action"] == "login"


def test_audit_log_truncation(audit_service):
    for i in range(15):
        audit_service.record_action({"action": f"test_{i}", "severity": "info", "message": f"Message {i}"})

    result = audit_service.get_audit_logs(limit=100)
    assert result["total"] <= 10


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client


def test_audit_api_endpoint(client):
    response = client.get("/api/audit/logs")
    assert response.status_code == 200
    data = response.get_json()
    assert "total" in data
    assert "logs" in data
    assert isinstance(data["logs"], list)
