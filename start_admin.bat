@echo off
echo Starting DevControl Dashboard as Administrator...
echo.
cd /d "%~dp0"
echo Checking administrator privileges...
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running as Administrator
    echo.
    echo Starting dashboard with admin privileges...
    echo Press Ctrl+C to stop (will clean up automatically)
    echo.
    python start.py
    echo.
    echo [STOP] Dashboard stopped
) else (
    echo [ERROR] Not running as Administrator!
    echo Please right-click this file and select "Run as administrator"
    echo.
    pause
)
echo.
echo [EXIT] Exiting...
