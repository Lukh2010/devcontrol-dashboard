@echo off
echo Starting DevControl Launcher...
echo.
cd /d "%~dp0\.."
python tools\devcontrol_launcher.py
echo.
echo [EXIT] Launcher closed.
