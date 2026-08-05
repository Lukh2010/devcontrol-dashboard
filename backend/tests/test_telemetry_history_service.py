"""Unit tests for TelemetryHistoryService and GET /api/system/history endpoint."""

import time
import pytest
from app import create_app
from services.telemetry_history_service import TelemetryHistoryService


@pytest.fixture
def history_service(tmp_path):
    log_file = tmp_path / "telemetry_test.jsonl"
    return TelemetryHistoryService(log_file=log_file, max_samples=10)


def test_record_and_query_samples(history_service):
    sample1 = history_service.record_sample({
        "cpu_percent": 15.5,
        "memory_percent": 42.0,
        "memory_used": 4096,
        "memory_total": 16384,
        "disk_percent": 65.0,
    })

    sample2 = history_service.record_sample({
        "cpu_percent": 25.0,
        "memory_percent": 45.0,
        "memory_used": 4500,
        "memory_total": 16384,
        "disk_percent": 65.0,
    })

    result = history_service.get_history(time_range="1h")
    assert result["total"] == 2
    assert len(result["samples"]) == 2
    assert result["samples"][0]["cpu_percent"] == 15.5
    assert result["samples"][1]["cpu_percent"] == 25.0


def test_telemetry_pruning(history_service):
    for i in range(15):
        history_service.record_sample({"cpu_percent": float(i)})

    result = history_service.get_history(time_range="24h")
    assert result["total"] <= 10


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client


def test_get_system_history_api(client):
    response = client.get("/api/system/history?range=1h")
    assert response.status_code == 200
    data = response.get_json()
    assert "range" in data
    assert "total" in data
    assert "samples" in data
    assert isinstance(data["samples"], list)
