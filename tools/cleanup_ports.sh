#!/bin/bash
echo "🧹 DevControl Dashboard - Port Cleanup"
echo "===================================="
echo ""
echo "This will kill all processes using ports 3000, 8000, and 8003"
echo ""
read -p "Press Enter to continue..."

echo "Cleaning port 3000..."
lsof -ti:3000 | xargs -r kill -9

echo "Cleaning port 8000..."
lsof -ti:8000 | xargs -r kill -9

echo "Cleaning port 8003..."
lsof -ti:8003 | xargs -r kill -9

echo ""
echo "✅ Port cleanup completed!"
echo "🚀 You can now restart the dashboard with: python start.py"
echo ""
