#!/bin/bash
echo "Starting DevControl Dashboard with elevated privileges..."
echo ""
cd "$(dirname "$0")"
if [ "$(uname)" = "Darwin" ]; then
    # macOS
    echo "Running on macOS..."
    sudo python3 start.py
else
    # Linux
    echo "Running on Linux..."
    sudo python3 start.py
fi
