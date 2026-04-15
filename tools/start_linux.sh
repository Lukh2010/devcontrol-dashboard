#!/bin/bash
echo "DevControl Dashboard - Linux Start Script"
echo "================================="

cd "$(dirname "$0")/.."
echo "Forwarding to start.py run..."
exec python3 start.py run
