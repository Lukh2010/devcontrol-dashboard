@echo off
echo DevControl Dashboard - Port Cleanup
echo ====================================

set PID_FILE=%USERPROFILE%\.devcontrol_pids.json

if not exist "%PID_FILE%" (
    echo Kein PID-File gefunden, cleanup nicht noetig
    exit /b 0
)

echo Stoppe Dashboard-Prozesse...
python -c "
import json, os, subprocess
with open(r'%PID_FILE%') as f:
    pids = json.load(f)
for group in pids.values():
    for pid in group:
        try:
            subprocess.run(['taskkill', '/F', '/PID', str(pid)], 
                         capture_output=True)
            print(f'Gestoppt: PID {pid}')
        except Exception as e:
            print(f'Fehler bei PID {pid}: {e}')
"

del "%PID_FILE%"
echo Cleanup abgeschlossen
