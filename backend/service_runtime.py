import os
import threading

from dashboard_pids import register_dashboard_pid
from services.action_executor import ActionExecutorService
from services.live_update_hub import LiveUpdateHub
from services.system_inventory_service import SystemInventoryService
from services.telemetry_service import TelemetryCollectorService
from services.terminal_gateway import TerminalGatewayService


class ServiceRuntime:
    """Wires service boundaries together for the current single-process deployment."""

    def __init__(self):
        self.live_updates = LiveUpdateHub()
        self.inventory = SystemInventoryService()
        self.telemetry = TelemetryCollectorService(self.live_updates, inventory_service=self.inventory)
        self.actions = ActionExecutorService(self.live_updates, inventory_service=self.inventory)
        self.terminal_gateway = TerminalGatewayService(self.live_updates)

    def start(self):
        register_dashboard_pid("backend", os.getpid())
        self.telemetry.start()
        terminal_timer = threading.Timer(2.0, self.terminal_gateway.start)
        terminal_timer.daemon = True
        terminal_timer.start()
