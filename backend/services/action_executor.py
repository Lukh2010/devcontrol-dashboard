"""Facade for privileged dashboard actions."""

from __future__ import annotations

import time

from command_classifier import CommandClassifier
from security import is_password_protection_enabled
from services.action_executor_commands import ActionExecutorCommandMixin
from services.action_executor_processes import ActionExecutorProcessMixin
from services.system_inventory_service import SystemInventoryService


class ActionExecutorService(ActionExecutorProcessMixin, ActionExecutorCommandMixin):
    """Executes privileged dashboard actions and emits action events."""

    def __init__(self, live_updates, inventory_service: SystemInventoryService | None = None):
        self.live_updates = live_updates
        self.classifier = CommandClassifier()
        self.inventory_service = inventory_service or SystemInventoryService()

    def _publish_action(
        self,
        action,
        status,
        message: str | None = None,
        severity: str | None = None,
        entity_type: str | None = None,
        entity_id=None,
        requires_admin: bool = False,
        requires_password: bool | None = None,
        retry_after: int | None = None,
        **details,
    ):
        """Publish one normalized action event onto live updates."""
        resolved_severity = severity or ("success" if status == "success" else "warning" if status == "pending" else "danger")
        resolved_requires_password = (
            is_password_protection_enabled()
            if requires_password is None
            else requires_password
        )
        self.live_updates.publish("action", {
            "action": action,
            "status": status,
            "message": message or action.replace("_", " ").title(),
            "severity": resolved_severity,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "requires_admin": requires_admin,
            "requires_password": resolved_requires_password,
            "retry_after": retry_after,
            "timestamp": time.time(),
            **details
        })
