from pathlib import Path

import dashboard_pids


class FakeProcess:
    def __init__(self, create_time: float):
        self._create_time = create_time

    def create_time(self) -> float:
        return self._create_time


def _pid_file(name: str) -> Path:
    return Path(__file__).resolve().parent / name


def _cleanup_pid_file(pid_file: Path) -> None:
    if pid_file.exists():
        pid_file.unlink()


def test_register_dashboard_pid_persists_create_time_metadata(monkeypatch):
    pid_file = _pid_file(".dashboard-pids-register.json")
    _cleanup_pid_file(pid_file)
    monkeypatch.setattr(dashboard_pids, "PID_FILE", pid_file)
    monkeypatch.setattr(
        dashboard_pids.psutil,
        "Process",
        lambda pid: FakeProcess(1234.5),
    )

    try:
        dashboard_pids.register_dashboard_pid("backend", 4321)

        stored = dashboard_pids.load_dashboard_pids()
        assert stored["backend"] == [{"pid": "4321", "create_time": 1234.5}]
        assert dashboard_pids.is_dashboard_pid(4321) is True
    finally:
        _cleanup_pid_file(pid_file)


def test_is_dashboard_pid_rejects_reused_pid_with_new_create_time(monkeypatch):
    pid_file = _pid_file(".dashboard-pids-reused.json")
    _cleanup_pid_file(pid_file)
    monkeypatch.setattr(dashboard_pids, "PID_FILE", pid_file)
    monkeypatch.setattr(
        dashboard_pids.psutil,
        "Process",
        lambda pid: FakeProcess(100.0),
    )

    try:
        dashboard_pids.register_dashboard_pid("backend", 4321)

        monkeypatch.setattr(
            dashboard_pids.psutil,
            "Process",
            lambda pid: FakeProcess(200.0),
        )

        assert dashboard_pids.is_dashboard_pid(4321) is False
    finally:
        _cleanup_pid_file(pid_file)


def test_is_dashboard_pid_allows_small_create_time_drift(monkeypatch):
    pid_file = _pid_file(".dashboard-pids-tolerance.json")
    _cleanup_pid_file(pid_file)
    monkeypatch.setattr(dashboard_pids, "PID_FILE", pid_file)
    monkeypatch.setattr(
        dashboard_pids.psutil,
        "Process",
        lambda pid: FakeProcess(100.0),
    )

    try:
        dashboard_pids.register_dashboard_pid("backend", 4321)

        monkeypatch.setattr(
            dashboard_pids.psutil,
            "Process",
            lambda pid: FakeProcess(100.0005),
        )

        assert dashboard_pids.is_dashboard_pid(4321) is True
    finally:
        _cleanup_pid_file(pid_file)


def test_register_dashboard_pid_updates_existing_entry_instead_of_duplicating_it(monkeypatch):
    pid_file = _pid_file(".dashboard-pids-update.json")
    _cleanup_pid_file(pid_file)
    monkeypatch.setattr(dashboard_pids, "PID_FILE", pid_file)
    create_times = iter([100.0, 200.0])
    monkeypatch.setattr(
        dashboard_pids,
        "_get_process_create_time",
        lambda pid: next(create_times),
    )

    try:
        dashboard_pids.register_dashboard_pid("backend", 4321)
        dashboard_pids.register_dashboard_pid("backend", 4321)

        stored = dashboard_pids.load_dashboard_pids()
        assert stored["backend"] == [{"pid": "4321", "create_time": 200.0}]
    finally:
        _cleanup_pid_file(pid_file)


def test_legacy_pid_entries_without_create_time_are_not_trusted(monkeypatch):
    pid_file = _pid_file(".dashboard-pids-legacy.json")
    _cleanup_pid_file(pid_file)
    monkeypatch.setattr(dashboard_pids, "PID_FILE", pid_file)
    try:
        dashboard_pids.save_dashboard_pids({"backend": ["4321"]})
        monkeypatch.setattr(
            dashboard_pids.psutil,
            "Process",
            lambda pid: FakeProcess(1234.5),
        )

        assert dashboard_pids.is_dashboard_pid(4321) is False
    finally:
        _cleanup_pid_file(pid_file)
