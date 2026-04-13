import os
import threading

from dashboard_pids import register_dashboard_pid
from event_bus import InMemoryEventBus
from services.action_executor import ActionExecutorService
from services.stream_processor import StreamProcessor
from services.telemetry_service import TelemetryCollectorService
from services.terminal_gateway import TerminalGatewayService


class ServiceRuntime:
    """Wires service boundaries together for the current single-process deployment."""

    def __init__(self):
        self.event_bus = InMemoryEventBus()
        self.stream_processor = StreamProcessor(self.event_bus)
        self.telemetry = TelemetryCollectorService(self.event_bus)
        self.actions = ActionExecutorService(self.event_bus)
        self.terminal_gateway = TerminalGatewayService(self.event_bus)

    def start(self):
        register_dashboard_pid("backend", os.getpid())
        self.stream_processor.start()
        self.telemetry.start()
        terminal_timer = threading.Timer(2.0, self.terminal_gateway.start)
        terminal_timer.daemon = True
        terminal_timer.start()
