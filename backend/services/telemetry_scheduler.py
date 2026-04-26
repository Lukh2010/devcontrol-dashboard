"""Scheduling and snapshot orchestration for telemetry collection."""

from __future__ import annotations

import threading
import time


class TelemetrySchedulingMixin:
    """Owns periodic telemetry scheduling and snapshot publication."""

    def start(self):
        """Start the background telemetry publisher thread."""
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self):
        """Stop the background telemetry publisher thread."""
        self._running = False

    def _run(self):
        """Publish configured telemetry events on their configured intervals."""
        while self._running:
            now = time.time()
            for event_type, collector in self.collectors.items():
                interval = max(float(collector.get("interval", 5)), 1.0)
                last = self._last_emitted.get(event_type, 0.0)
                if now - last < interval:
                    continue

                try:
                    payload = collector["collect"]()
                    if isinstance(payload, dict) and "timestamp" not in payload:
                        payload["timestamp"] = now
                    self.live_updates.publish(event_type, payload)
                    self._last_emitted[event_type] = now
                except Exception as exc:
                    self.live_updates.publish("stream_error", {
                        "event_type": event_type,
                        "error": str(exc),
                        "timestamp": now
                    })

            time.sleep(1.0)

    def _collect_heartbeat(self):
        """Return a lightweight heartbeat payload."""
        return {"timestamp": time.time()}

    def collect_system_snapshot(self):
        """Build the full system snapshot payload."""
        return {
            "system_info": self.collect_system_info(),
            "performance": self.collect_system_performance(interval=0),
            "is_admin": self.collect_is_admin()
        }

    def collect_process_snapshot(self):
        """Build the process snapshot payload used by SSE/live updates."""
        processes = self.collect_processes(limit=25)
        return {
            "processes": processes,
            "inventory_source": self._resolve_inventory_source(processes),
            "inventory_degraded": self._resolve_inventory_degraded(processes),
        }

    def collect_network_snapshot(self):
        """Build the network snapshot payload used by SSE/live updates."""
        ports = self.collect_ports(limit=25)
        return {
            "ports": ports,
            "inventory_source": self._resolve_inventory_source(ports),
            "inventory_degraded": self._resolve_inventory_degraded(ports),
            "network_info": self.collect_network_info()
        }
