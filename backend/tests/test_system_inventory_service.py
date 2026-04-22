from services.system_inventory_service import SystemInventoryService


def test_normalize_json_records_handles_null_object_and_array():
    service = SystemInventoryService()

    assert service._normalize_json_records(None) == []
    assert service._normalize_json_records({"pid": 1}) == [{"pid": 1}]
    assert service._normalize_json_records([{"pid": 1}, {"pid": 2}, "skip-me"]) == [{"pid": 1}, {"pid": 2}]


def test_split_host_port_handles_ipv4_and_ipv6():
    service = SystemInventoryService()

    assert service._split_host_port("127.0.0.1:8000") == ("127.0.0.1", 8000)
    assert service._split_host_port("[::1]:8003") == ("::1", 8003)


def test_collect_processes_uses_posix_collector_outside_windows(monkeypatch):
    service = SystemInventoryService()

    monkeypatch.setattr("services.system_inventory_service.platform.system", lambda: "Linux")
    monkeypatch.setattr(
        service,
        "_collect_posix_processes",
        lambda: [{"pid": 1, "name": "python", "cpu_percent": 1.0, "memory_mb": 5.0, "status": "S"}],
    )

    records = service.collect_processes()

    assert records == [{"pid": 1, "name": "python", "cpu_percent": 1.0, "memory_mb": 5.0, "status": "S"}]


def test_collect_ports_uses_posix_collector_outside_windows(monkeypatch):
    service = SystemInventoryService()

    monkeypatch.setattr("services.system_inventory_service.platform.system", lambda: "Linux")
    monkeypatch.setattr(
        service,
        "_collect_posix_ports",
        lambda: [{"port": 8000, "process_name": "python", "pid": 1, "status": "LISTEN"}],
    )

    records = service.collect_ports()

    assert records == [{"port": 8000, "process_name": "python", "pid": 1, "status": "LISTEN"}]


def test_normalize_process_record_keeps_cpu_time_total():
    service = SystemInventoryService()

    record = service._normalize_process_record({
        "pid": 15,
        "name": "worker.exe",
        "cpu_time_total": 12.34567,
        "memory_mb": 256.4,
    })

    assert record["cpu_time_total"] == 12.3457
    assert record["memory_mb"] == 256.4


def test_windows_process_records_raise_when_all_metrics_are_zero():
    service = SystemInventoryService()

    try:
        service._ensure_windows_process_records_are_usable([
            {"pid": 4, "name": "System", "cpu_time_total": 0.0, "memory_mb": 0.0},
            {"pid": 88, "name": "Secure System", "cpu_time_total": 0.0, "memory_mb": 0.0},
        ])
    except RuntimeError as exc:
        assert "zeroed process metrics" in str(exc)
    else:
        raise AssertionError("Expected unusable Windows records to raise")
