#!/bin/bash
echo "DevControl Dashboard - Port Cleanup"
echo "===================================="

cd "$(dirname "$0")/.."
echo "Forwarding to start.py stop..."
exec python3 start.py stop
