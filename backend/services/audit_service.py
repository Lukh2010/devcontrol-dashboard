"""Persistent audit logging service for system and security action events."""

from __future__ import annotations

import json
import os
from pathlib import Path
import threading
import time
import uuid
from typing import Any, Dict, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[2]
RUNTIME_DIR = Path(os.environ.get("DEVCONTROL_RUNTIME_DIR", PROJECT_ROOT / ".devcontrol-runtime"))
AUDIT_LOG_FILE = RUNTIME_DIR / "audit.log"
MAX_AUDIT_ENTRIES = 5000


class AuditService:
    """Thread-safe persistent audit logger with JSONL storage and query filtering."""

    def __init__(self, log_file: Path | str | None = None, max_entries: int = MAX_AUDIT_ENTRIES):
        self.log_file = Path(log_file) if log_file else AUDIT_LOG_FILE
        self.max_entries = max_entries
        self._lock = threading.Lock()

    def _ensure_dir(self):
        self.log_file.parent.mkdir(parents=True, exist_ok=True)

    def record_action(self, action_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Record one structured action event to the persistent JSONL log."""
        if not isinstance(action_payload, dict):
            return {}

        entry = {
            "id": action_payload.get("id") or str(uuid.uuid4()),
            "timestamp": float(action_payload.get("timestamp") or time.time()),
            "action": str(action_payload.get("action", "unknown")),
            "status": str(action_payload.get("status", "unknown")),
            "severity": str(action_payload.get("severity", "neutral")),
            "message": str(action_payload.get("message", "")),
            "entity_type": action_payload.get("entity_type"),
            "entity_id": action_payload.get("entity_id"),
            "requires_admin": bool(action_payload.get("requires_admin", False)),
            "requires_password": bool(action_payload.get("requires_password", False)),
            "details": {
                k: v for k, v in action_payload.items()
                if k not in {
                    "id", "timestamp", "action", "status", "severity",
                    "message", "entity_type", "entity_id", "requires_admin", "requires_password"
                }
            }
        }

        with self._lock:
            try:
                self._ensure_dir()
                with open(self.log_file, "a", encoding="utf-8") as f:
                    f.write(json.dumps(entry) + "\n")
                self._truncate_if_needed()
            except Exception as exc:
                print(f"[WARN] Failed to write audit log: {exc}")

        return entry

    def _truncate_if_needed(self):
        """Keep the log file bounded to max_entries."""
        if not self.log_file.exists():
            return

        try:
            with open(self.log_file, "r", encoding="utf-8") as f:
                lines = f.readlines()

            if len(lines) > self.max_entries:
                keep_lines = lines[-int(self.max_entries * 0.8):]
                with open(self.log_file, "w", encoding="utf-8") as f:
                    f.writelines(keep_lines)
        except Exception as exc:
            print(f"[WARN] Audit log truncation error: {exc}")

    def get_audit_logs(
        self,
        limit: int = 50,
        offset: int = 0,
        severity: Optional[str] = None,
        action: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Query persistent audit logs with filtering and pagination."""
        if not self.log_file.exists():
            return {"total": 0, "logs": [], "limit": limit, "offset": offset}

        entries: List[Dict[str, Any]] = []

        with self._lock:
            try:
                with open(self.log_file, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            entries.append(json.loads(line))
                        except Exception:
                            continue
            except Exception as exc:
                print(f"[WARN] Failed to read audit logs: {exc}")
                return {"total": 0, "logs": [], "limit": limit, "offset": offset}

        entries.sort(key=lambda x: x.get("timestamp", 0), reverse=True)

        filtered = entries
        if severity:
            sev_lower = severity.lower()
            filtered = [e for e in filtered if e.get("severity", "").lower() == sev_lower]

        if action:
            act_lower = action.lower()
            filtered = [e for e in filtered if act_lower in e.get("action", "").lower()]

        if search:
            query = search.lower()
            filtered = [
                e for e in filtered
                if query in e.get("message", "").lower()
                or query in e.get("action", "").lower()
                or query in str(e.get("entity_id", "")).lower()
                or query in str(e.get("entity_type", "")).lower()
            ]

        total = len(filtered)
        paginated = filtered[offset : offset + limit] if limit > 0 else filtered[offset:]

        return {
            "total": total,
            "logs": paginated,
            "limit": limit,
            "offset": offset,
        }

    def clear_audit_logs(self):
        """Clear all audit log entries."""
        with self._lock:
            try:
                if self.log_file.exists():
                    self.log_file.unlink()
            except Exception as exc:
                print(f"[WARN] Failed to clear audit logs: {exc}")
