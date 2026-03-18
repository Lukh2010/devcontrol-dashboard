#!/bin/bash
echo "DevControl Dashboard - Port Cleanup"
echo "===================================="

PID_FILE="$HOME/.devcontrol_pids.json"

if [ ! -f "$PID_FILE" ]; then
    echo "Kein PID-File gefunden, cleanup nicht nötig"
    exit 0
fi

echo "Stoppe Dashboard-Prozesse..."

# PIDs aus JSON lesen und killen (python als helper)
python3 -c "
import json, os, signal
with open('$PID_FILE') as f:
    pids = json.load(f)
for group in pids.values():
    for pid in group:
        try:
            os.kill(int(pid), signal.SIGTERM)
            print(f'Gestoppt: PID {pid}')
        except ProcessLookupError:
            print(f'PID {pid} bereits beendet')
        except Exception as e:
            print(f'Fehler bei PID {pid}: {e}')
"

rm -f "$PID_FILE"
echo "Cleanup abgeschlossen"
