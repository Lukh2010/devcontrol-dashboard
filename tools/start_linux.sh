#!/bin/bash
echo "DevControl Dashboard - Linux Start Script"
echo "================================="

# PID file for both processes
PID_FILE="$HOME/.devcontrol_pids.json"

# Cleanup function
cleanup() {
    echo "Stopping dashboard processes..."
    if [ -f "$PID_FILE" ]; then
        python3 -c "
import json, os, signal, time
with open('$PID_FILE') as f:
    pids = json.load(f)
for group in pids.values():
    for pid in group:
        try:
            os.kill(int(pid), signal.SIGTERM)
            print(f'Sent SIGTERM to PID {pid}')
            # Wait up to 5 seconds
            start = time.time()
            while time.time() - start < 5:
                try:
                    os.kill(int(pid), 0)
                    time.sleep(0.1)
                except ProcessLookupError:
                    print(f'PID {pid} stopped')
                    break
            else:
                os.kill(int(pid), signal.SIGKILL)
                print(f'PID {pid} force stopped with SIGKILL')
        except ProcessLookupError:
            print(f'PID {pid} already stopped')
        except Exception as e:
            print(f'Error while stopping PID {pid}: {e}')
"
        rm -f "$PID_FILE"
    fi
}

# Cleanup on exit
trap cleanup EXIT

if [ -z "${DEVCONTROL_PASSWORD:-}" ]; then
    echo "Password protection for sensitive actions is optional."
    while true; do
        read -rp "Use control password? (y/n): " USE_CONTROL_PASSWORD
        case "${USE_CONTROL_PASSWORD,,}" in
            y|yes)
                while true; do
                    read -rsp "Control password (minimum 8 characters): " DEVCONTROL_PASSWORD
                    echo
                    if [ ${#DEVCONTROL_PASSWORD} -lt 8 ]; then
                        echo "Password is too short."
                        continue
                    fi

                    read -rsp "Confirm password: " DEVCONTROL_PASSWORD_CONFIRM
                    echo
                    if [ "$DEVCONTROL_PASSWORD" != "$DEVCONTROL_PASSWORD_CONFIRM" ]; then
                        echo "Passwords do not match."
                        continue
                    fi

                    export DEVCONTROL_PASSWORD
                    unset DEVCONTROL_PASSWORD_CONFIRM
                    break
                done
                break
                ;;
            n|no)
                unset DEVCONTROL_PASSWORD
                echo "Password protection disabled."
                break
                ;;
            *)
                echo "Please enter y or n."
                ;;
        esac
    done
else
    echo "Using DEVCONTROL_PASSWORD from the environment."
fi

echo "Installing backend dependencies..."
cd backend
python3 -m pip install -r requirements.txt || exit 1

echo "Installing frontend dependencies if needed..."
cd ../frontend
if [ ! -d node_modules ]; then
    npm install || exit 1
else
    npm ls --depth=0 >/dev/null 2>&1 || npm install || exit 1
fi

echo "Starting backend..."
cd ../backend
python3 app.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

echo "Starting frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Save PIDs
python3 -c "
import json
pids = {
    'backend': ['$BACKEND_PID'],
    'frontend': ['$FRONTEND_PID'],
    'websocket': ['$BACKEND_PID']
}
with open('$PID_FILE', 'w') as f:
    json.dump(pids, f, indent=2)
"

# Determine local IP address
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "[OK] Dashboard is starting..."
echo "Available on your local network at: http://$LOCAL_IP:3000"
echo "Backend API: http://$LOCAL_IP:8000"
echo "WebSocket Terminal: ws://$LOCAL_IP:8003"
if [ -n "${DEVCONTROL_PASSWORD:-}" ]; then
    echo "Enter the control password in the frontend to unlock sensitive actions."
else
    echo "Password protection is disabled."
fi
echo ""
echo "[INFO] Servers are running. Press Ctrl+C to stop."

# Open browser
if command -v xdg-open > /dev/null; then
    xdg-open "http://localhost:3000"
elif command -v open > /dev/null; then
    open "http://localhost:3000"
else
    echo "Open manually: http://localhost:3000"
fi

# Wait for processes
wait
