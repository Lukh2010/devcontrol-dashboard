"""Facade for the dashboard telemetry collector service."""

from __future__ import annotations

from services.system_inventory_service import SystemInventoryService
from services.telemetry_collection import TelemetryCollectionMixin
from services.telemetry_scheduler import TelemetrySchedulingMixin


class TelemetryCollectorService(TelemetrySchedulingMixin, TelemetryCollectionMixin):
    """Collects host telemetry and publishes snapshots onto live updates."""

    def __init__(self, live_updates, inventory_service: SystemInventoryService | None = None):
        self.live_updates = live_updates
        self.inventory_service = inventory_service or SystemInventoryService()
        self._cpu_cache = {}
        self._last_cpu_update = 0
        self._process_cpu_times = {}
        self._cpu_cache_ready = False
        self._windows_live_cpu_cache = {}
        self._windows_live_cpu_last_update = 0.0
        self._windows_live_cpu_procs = {}
        self._running = False
        self._thread = None
        self.collectors = {
            "heartbeat": {"interval": 1, "collect": self._collect_heartbeat},
            "system_snapshot": {"interval": 4, "collect": self.collect_system_snapshot},
            "process_snapshot": {"interval": 5, "collect": self.collect_process_snapshot},
            "network_snapshot": {"interval": 10, "collect": self.collect_network_snapshot},
        }
        self._last_emitted = {}
