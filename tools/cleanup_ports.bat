@echo off
echo DevControl Dashboard - Port Cleanup
echo ====================================
echo.
echo Cleaning up processes...

echo Cleaning Python processes...
taskkill /F /IM python.exe 2>nul >nul 2>&1
taskkill /F /IM python3.exe 2>nul >nul 2>&1

echo Cleaning Node.js processes...
taskkill /F /IM node.exe 2>nul >nul 2>&1

echo.
echo [OK] Cleanup completed!
echo All processes cleaned up successfully
echo.
