#!/bin/bash
echo "DevControl Dashboard - Port Cleanup"
echo "===================================="

PID_FILE="$HOME/.devcontrol_pids.json"

if [ ! -f "$PID_FILE" ]; then
    echo "No PID file found, cleanup not needed"
    exit 0
fi

echo "Stopping dashboard processes..."

# Read PIDs from JSON and stop them (Python helper)
python3 -c "
import json, os, signal
with open('$PID_FILE') as f:
    pids = json.load(f)
for group in pids.values():
    for pid in group:
        try:
            os.kill(int(pid), signal.SIGTERM)
            print(f'Stopped: PID {pid}')
        except ProcessLookupError:
            print(f'PID {pid} already stopped')
        except Exception as e:
            print(f'Error while stopping PID {pid}: {e}')
"

rm -f "$PID_FILE"
echo "Cleanup completed"
