#!/bin/bash
echo "DevControl Dashboard - Linux Start Script"
echo "================================="

# PID-File für beide Prozesse
PID_FILE="$HOME/.devcontrol_pids.json"

# Funktion zum Beenden der Prozesse
cleanup() {
    echo "Stoppe Dashboard-Prozesse..."
    if [ -f "$PID_FILE" ]; then
        python3 -c "
import json, os, signal, time
with open('$PID_FILE') as f:
    pids = json.load(f)
for group in pids.values():
    for pid in group:
        try:
            os.kill(int(pid), signal.SIGTERM)
            print(f'SIGTERM an PID {pid} gesendet')
            # Warte max 5 Sekunden
            start = time.time()
            while time.time() - start < 5:
                try:
                    os.kill(int(pid), 0)
                    time.sleep(0.1)
                except ProcessLookupError:
                    print(f'PID {pid} beendet')
                    break
            else:
                os.kill(int(pid), signal.SIGKILL)
                print(f'PID {pid} mit SIGKILL beendet')
        except ProcessLookupError:
            print(f'PID {pid} bereits beendet')
        except Exception as e:
            print(f'Fehler bei PID {pid}: {e}')
"
        rm -f "$PID_FILE"
    fi
}

# Cleanup bei Strg+C
trap cleanup EXIT

if [ -z "${DEVCONTROL_PASSWORD:-}" ]; then
    echo "Setze ein Control-Passwort fuer geschuetzte Aktionen."
    while true; do
        read -rsp "Control-Passwort (mindestens 8 Zeichen): " DEVCONTROL_PASSWORD
        echo
        if [ ${#DEVCONTROL_PASSWORD} -lt 8 ]; then
            echo "Passwort ist zu kurz."
            continue
        fi

        read -rsp "Passwort bestaetigen: " DEVCONTROL_PASSWORD_CONFIRM
        echo
        if [ "$DEVCONTROL_PASSWORD" != "$DEVCONTROL_PASSWORD_CONFIRM" ]; then
            echo "Passwoerter stimmen nicht ueberein."
            continue
        fi

        export DEVCONTROL_PASSWORD
        unset DEVCONTROL_PASSWORD_CONFIRM
        break
    done
else
    echo "Verwende DEVCONTROL_PASSWORD aus der Umgebung."
fi

echo "Starte Backend..."
cd backend
python3 app.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

echo "Starte Frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# PIDs speichern
python3 -c "
import json
pids = {
    'backend': ['$BACKEND_PID'],
    'frontend': ['$FRONTEND_PID']
}
with open('$PID_FILE', 'w') as f:
    json.dump(pids, f, indent=2)
"

# Lokale IP-Adresse ermitteln
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "[OK] Dashboard wird gestartet..."
echo "Erreichbar im Heimnetz unter: http://$LOCAL_IP:3000"
echo "Backend API: http://$LOCAL_IP:8000"
echo "WebSocket Terminal: ws://$LOCAL_IP:8003"
echo "Control-Passwort im Frontend eingeben, um geschuetzte Aktionen freizuschalten."
echo ""
echo "[INFO] Servers laufen. Strg+C zum Beenden."

# Browser öffnen
if command -v xdg-open > /dev/null; then
    xdg-open "http://localhost:3000"
elif command -v open > /dev/null; then
    open "http://localhost:3000"
else
    echo "Öffne manuell: http://localhost:3000"
fi

# Auf Prozesse warten
wait
