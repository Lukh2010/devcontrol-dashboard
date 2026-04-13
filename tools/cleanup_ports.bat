@echo off
echo DevControl Dashboard - Port Cleanup
echo ====================================

set PID_FILE=%USERPROFILE%\.devcontrol_pids.json

if not exist "%PID_FILE%" (
    echo No PID file found, cleanup not needed
    exit /b 0
)

echo Stopping dashboard processes...
python -c "
import json, os, subprocess
with open(r'%PID_FILE%') as f:
    pids = json.load(f)
for group in pids.values():
    for pid in group:
        try:
            subprocess.run(['taskkill', '/F', '/PID', str(pid)],
                         capture_output=True)
            print(f'Stopped: PID {pid}')
        except Exception as e:
            print(f'Error while stopping PID {pid}: {e}')
"

del "%PID_FILE%"
echo Cleanup completed
