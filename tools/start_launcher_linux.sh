#!/bin/bash
echo "Starting DevControl Launcher..."
echo ""

cd "$(dirname "$0")/.."

python3 tools/devcontrol/devcontrol_launcher.py

EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo "[WARN] Could not start graphical launcher."
    echo "[INFO] You can run DevControl directly from terminal using: python3 start.py run"
fi

echo ""
echo "[EXIT] Launcher closed."
