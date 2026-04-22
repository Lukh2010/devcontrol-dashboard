from services.telemetry_service import TelemetryCollectorService


class FakeEventBus:
    def publish(self, event_type, payload):
        return None


class FakeInventoryService:
    def __init__(self, processes=None, ports=None, process_error: Exception | None = None, port_error: Exception | None = None):
        self._processes = processes or []
        self._ports = ports or []
        self._process_error = process_error
        self._port_error = port_error

    def collect_processes(self):
        if self._process_error is not None:
            raise self._process_error
        return list(self._processes)

    def collect_ports(self):
        if self._port_error is not None:
            raise self._port_error
        return list(self._ports)


def test_collect_processes_uses_inventory_sorting_and_filters():
    service = TelemetryCollectorService(
        FakeEventBus(),
        inventory_service=FakeInventoryService(processes=[
            {
                "pid": 30,
                "parent_pid": 1,
                "name": "alpha-sync",
                "cpu_percent": 8.0,
                "memory_mb": 30.0,
                "status": "running",
                "username": "lukas",
                "command_line": "python alpha_sync.py",
            },
            {
                "pid": 10,
                "parent_pid": 1,
                "name": "alpha-api",
                "cpu_percent": 10.0,
                "memory_mb": 50.0,
                "status": "running",
                "username": "lukas",
                "command_line": "python alpha_api.py",
            },
            {
                "pid": 20,
                "parent_pid": 1,
                "name": "beta-worker",
                "cpu_percent": 5.0,
                "memory_mb": 20.0,
                "status": "sleeping",
                "username": "service",
                "command_line": "python beta_worker.py",
            },
        ])
    )

    snapshot = service.collect_processes(search="alpha", limit=1)

    assert len(snapshot) == 1
    assert snapshot[0]["pid"] == 10
    assert snapshot[0]["name"] == "alpha-api"
    assert snapshot[0]["cpu_percent"] == 10.0
    assert snapshot[0]["memory_mb"] == 50.0
    assert snapshot[0]["command_line"] == "python alpha_api.py"
    assert snapshot[0]["inventory_source"] == "command"
    assert snapshot[0]["inventory_degraded"] is False


def test_collect_ports_uses_inventory_sorting_and_filters():
    service = TelemetryCollectorService(
        FakeEventBus(),
        inventory_service=FakeInventoryService(ports=[
            {"port": 9000, "process_name": "sync", "pid": 30, "status": "LISTEN", "local_address": "127.0.0.1"},
            {"port": 8000, "process_name": "api", "pid": 10, "status": "LISTEN", "local_address": "127.0.0.1"},
            {"port": 8000, "process_name": "api", "pid": 10, "status": "LISTEN", "local_address": "127.0.0.1"},
        ])
    )

    snapshot = service.collect_ports(search="8000", limit=10)

    assert len(snapshot) == 1
    assert snapshot[0]["port"] == 8000
    assert snapshot[0]["process_name"] == "api"
    assert snapshot[0]["pid"] == 10
    assert snapshot[0]["inventory_source"] == "command"
    assert snapshot[0]["inventory_degraded"] is False


def test_collect_processes_falls_back_to_psutil_when_inventory_fails(monkeypatch):
    service = TelemetryCollectorService(
        FakeEventBus(),
        inventory_service=FakeInventoryService(process_error=RuntimeError("boom")),
    )

    monkeypatch.setattr(
        service,
        "_collect_processes_with_psutil",
        lambda **kwargs: [{"pid": 99, "name": "fallback", "cpu_percent": 0.0, "memory_mb": 1.0, "status": "running"}],
    )

    snapshot = service.collect_processes()

    assert snapshot == [{"pid": 99, "name": "fallback", "cpu_percent": 0.0, "memory_mb": 1.0, "status": "running"}]


def test_collect_ports_falls_back_to_psutil_when_inventory_fails(monkeypatch):
    service = TelemetryCollectorService(
        FakeEventBus(),
        inventory_service=FakeInventoryService(port_error=RuntimeError("boom")),
    )

    monkeypatch.setattr(
        service,
        "_collect_ports_with_psutil",
        lambda **kwargs: [{"port": 1234, "process_name": "fallback", "pid": 42, "status": "LISTEN"}],
    )

    snapshot = service.collect_ports()

    assert snapshot == [{"port": 1234, "process_name": "fallback", "pid": 42, "status": "LISTEN"}]


def test_collect_processes_derives_cpu_percent_from_inventory_cpu_time(monkeypatch):
    inventory = FakeInventoryService(processes=[
        {
            "pid": 10,
            "parent_pid": 1,
            "name": "alpha-api",
            "cpu_time_total": 1.0,
            "cpu_percent": 0.0,
            "memory_mb": 50.0,
            "status": "running",
        }
    ])
    service = TelemetryCollectorService(FakeEventBus(), inventory_service=inventory)

    monkeypatch.setattr("services.telemetry_service.platform.system", lambda: "Linux")
    monkeypatch.setattr("services.telemetry_service.psutil.cpu_count", lambda: 4)
    time_values = iter([100.0, 101.0])
    monkeypatch.setattr("services.telemetry_service.time.time", lambda: next(time_values))

    first_snapshot = service.collect_processes()

    inventory._processes = [
        {
            "pid": 10,
            "parent_pid": 1,
            "name": "alpha-api",
            "cpu_time_total": 3.0,
            "cpu_percent": 0.0,
            "memory_mb": 50.0,
            "status": "running",
        }
    ]

    second_snapshot = service.collect_processes()

    assert first_snapshot[0]["cpu_percent"] == 0.0
    assert second_snapshot[0]["cpu_percent"] == 50.0


def test_collect_processes_uses_windows_live_cpu_cache_when_it_is_higher(monkeypatch):
    inventory = FakeInventoryService(processes=[
        {
            "pid": 10,
            "parent_pid": 1,
            "name": "alpha-api",
            "cpu_time_total": 1.0,
            "cpu_percent": 0.0,
            "memory_mb": 50.0,
            "status": "running",
        }
    ])
    service = TelemetryCollectorService(FakeEventBus(), inventory_service=inventory)

    monkeypatch.setattr("services.telemetry_service.platform.system", lambda: "Windows")
    monkeypatch.setattr(service, "_update_inventory_cpu_cache", lambda records: {10: 0.0123})
    monkeypatch.setattr(service, "_update_windows_live_cpu_cache", lambda pids: {10: 0.0876})

    snapshot = service.collect_processes()

    assert snapshot[0]["cpu_percent"] == 0.0876
