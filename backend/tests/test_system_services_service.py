"""Unit tests for SystemServicesService and /api/system/services endpoints."""

import pytest
from app import create_app
from services.system_services_service import SystemServicesService


@pytest.fixture
def service():
    return SystemServicesService()


def test_collect_services(service):
    results = service.collect_services(limit=5)
    assert isinstance(results, list)
    if results:
        first = results[0]
        assert "name" in first
        assert "status" in first


def test_collect_services_filtering(service):
    all_services = service.collect_services(limit=50)
    if not all_services:
        pytest.skip("No services found on platform")

    running = service.collect_services(status_filter="running", limit=50)
    for s in running:
        assert s["status"] in {"running", "active"}


def test_control_service_invalid_action(service):
    payload, status = service.control_service("non_existent_service", "invalid_action")
    assert status == 400
    assert "Invalid service action" in payload["error"]


def test_control_service_invalid_name(service):
    payload, status = service.control_service("invalid;service&&name", "start")
    assert status == 400
    assert "Invalid service name syntax" in payload["error"]


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client


def test_get_system_services_api(client):
    response = client.get("/api/system/services")
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
