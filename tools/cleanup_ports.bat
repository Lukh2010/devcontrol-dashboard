@echo off
echo DevControl Dashboard - Port Cleanup
echo ====================================
cd /d "%~dp0\.."
echo Forwarding to start.py stop...
python start.py stop
