import sys
import time

sys.path.insert(0, r"C:\Users\lukas\Documents\Windsurf\CascadeProjects\Admin Pannel\backend")

from services.terminal_gateway import TerminalGatewayService
from services.live_update_hub import LiveUpdateHub

service = TerminalGatewayService(LiveUpdateHub())
service.start()
while True:
    time.sleep(60)
