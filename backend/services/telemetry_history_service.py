"""Persistent time-series telemetry storage and history querying service."""

from __future__ import annotations

import json
import os
from pathlib import Path
import threading
import time
from typing import Any, Dict, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[2]
RUNTIME_DIR = Path(os.environ.get("DEVCONTROL_RUNTIME_DIR", PROJECT_ROOT / ".devcontrol-runtime"))
TELEMETRY_HISTORY_FILE = RUNTIME_DIR / "telemetry_history.jsonl"
MAX_TELEMETRY_SAMPLES = 2880  # 24 hours at 30-second intervals


class TelemetryHistoryService:
    """Thread-safe time-series collector and query engine for system performance history."""

    def __init__(self, log_file: Path | str | None = None, max_samples: int = MAX_TELEMETRY_SAMPLES):
        self.log_file = Path(log_file) if log_file else TELEMETRY_HISTORY_FILE
        self.max_samples = max_samples
        self._lock = threading.Lock()

    def _ensure_dir(self):
        self.log_file.parent.mkdir(parents=True, exist_ok=True)

    def record_sample(self, snapshot: Dict[str, Any]) -> Dict[str, Any]:
        """Record one performance sample to the JSONL history file."""
        if not isinstance(snapshot, dict):
            return {}

        sample = {
            "timestamp": float(snapshot.get("timestamp") or time.time()),
            "cpu_percent": float(snapshot.get("cpu_percent", 0.0)),
            "memory_percent": float(snapshot.get("memory_percent", 0.0)),
            "memory_used": snapshot.get("memory_used", 0),
            "memory_total": snapshot.get("memory_total", 0),
            "disk_percent": snapshot.get("disk_percent", 0.0),
        }

        with self._lock:
            try:
                self._ensure_dir()
                with open(self.log_file, "a", encoding="utf-8") as f:
                    f.write(json.dumps(sample) + "\n")
                self._prune_if_needed()
            except Exception as exc:
                print(f"[WARN] Failed to record telemetry sample: {exc}")

        return sample

    def _prune_if_needed(self):
        if not self.log_file.exists():
            return

        try:
            with open(self.log_file, "r", encoding="utf-8") as f:
                lines = f.readlines()

            if len(lines) > self.max_samples:
                keep_lines = lines[-int(self.max_samples * 0.8):]
                with open(self.log_file, "w", encoding="utf-8") as f:
                    f.writelines(keep_lines)
        except Exception as exc:
            print(f"[WARN] Telemetry history pruning error: {exc}")

    def get_history(
        self,
        time_range: str = "1h",
        limit: int = 500
    ) -> Dict[str, Any]:
        """Query time-series telemetry history for the specified time window (1h, 6h, 24h)."""
        if not self.log_file.exists():
            return {"range": time_range, "total": 0, "samples": []}

        seconds_map = {
            "15m": 15 * 60,
            "1h": 60 * 60,
            "6h": 6 * 60 * 60,
            "24h": 24 * 60 * 60,
        }
        cutoff_seconds = seconds_map.get(time_range, 60 * 60)
        now = time.time()
        min_timestamp = now - cutoff_seconds

        samples: List[Dict[str, Any]] = []

        with self._lock:
            try:
                with open(self.log_file, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            item = json.loads(line)
                            if item.get("timestamp", 0) >= min_timestamp:
                                samples.append(item)
                        except Exception:
                            continue
            except Exception as exc:
                print(f"[WARN] Failed to read telemetry history: {exc}")
                return {"range": time_range, "total": 0, "samples": []}

        # Chronological order
        samples.sort(key=lambda s: s.get("timestamp", 0))

        if limit > 0 and len(samples) > limit:
            # Subsample to limit if too many data points
            step = max(1, len(samples) // limit)
            samples = samples[::step][:limit]

        return {
            "range": time_range,
            "total": len(samples),
            "samples": samples
        }

    def clear_history(self):
        """Clear all historical samples."""
        with self._lock:
            try:
                if self.log_file.exists():
                    self.log_file.unlink()
            except Exception as exc:
                print(f"[WARN] Failed to clear telemetry history: {exc}")
