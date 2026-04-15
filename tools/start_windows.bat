@echo off
echo Starting DevControl Dashboard (Windows)...
echo.
cd /d "%~dp0\.."
echo Checking administrator privileges...
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running as Administrator
    echo.
    echo Forwarding to start.py run...
    echo.
    python start.py run
) else (
    echo [ERROR] Not running as Administrator!
    echo Please right-click this file and select "Run as administrator"
    echo.
    pause
)
echo.
echo [EXIT] Exiting...
