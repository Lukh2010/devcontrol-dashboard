@echo off
echo Starting DevControl Dashboard (Windows)...
echo.
cd /d "%~dp0\.."
echo Checking administrator privileges...
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running as Administrator
    echo.
    echo Starting dashboard with admin privileges...
    echo You will be asked for a control password unless DEVCONTROL_PASSWORD is already set.
    echo Enter the same password in the frontend to unlock protected actions.
    echo Press Ctrl+C to stop (will clean up automatically)
    echo.
    python start.py
    echo.
    echo [STOP] Dashboard stopped, running cleanup...
    call tools\cleanup_ports.bat
    echo [OK] All processes cleaned up
) else (
    echo [ERROR] Not running as Administrator!
    echo Please right-click this file and select "Run as administrator"
    echo.
    pause
)
echo.
echo [EXIT] Exiting...
