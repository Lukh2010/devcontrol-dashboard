# DevControl Dashboard

Modern local dashboard for system monitoring, process control, port control, network inspection, and password-protected terminal access.

## Requirements

- Python 3.10+
- Node.js 16+
- npm

## Quick Start

### Windows

Run the Windows launcher as Administrator:

```bat
tools\start_windows.bat
```

Behavior:

- Starts backend on `http://127.0.0.1:8000`
- Starts frontend on `http://127.0.0.1:3000`
- Starts terminal WebSocket on `ws://127.0.0.1:8003`
- Prompts for a control password if `DEVCONTROL_PASSWORD` is not already set

You must enter the same control password in the frontend to unlock:

- terminal access
- custom command execution
- process termination
- port termination

### Linux

Run the Linux launcher:

```bash
chmod +x tools/start_linux.sh
./tools/start_linux.sh
```

The Linux launcher now prompts for a control password and exports it as `DEVCONTROL_PASSWORD` before starting the backend.

### Manual Start

Backend:

```bash
cd backend
python app.py
```

Frontend:

```bash
cd frontend
npm run dev -- --host 127.0.0.1
```

If you start the backend manually, set a password first:

```bash
set DEVCONTROL_PASSWORD=your-password
```

PowerShell:

```powershell
$env:DEVCONTROL_PASSWORD = "your-password"
```

Bash:

```bash
export DEVCONTROL_PASSWORD="your-password"
```

## Security Model

Protected actions require the launcher control password. The frontend sends it to the backend using the `X-DevControl-Password` header, and the terminal WebSocket requires it at connect time.

Protected actions:

- `/api/commands/run`
- `/api/port/<port>`
- `/api/processes/<pid>/kill`
- WebSocket terminal access on port `8003`

Current safeguards:

- password gate for sensitive actions
- dashboard-owned process restriction for process and port termination
- dangerous-command filtering in terminal and command execution paths
- admin check for Windows process termination

Current limitations:

- the backend still binds to `0.0.0.0`
- Windows command execution still uses `shell=True` for compatibility
- there is no user/session system, only a shared control password
- there are no rate limits

Use this project only on a trusted local network. Do not expose it to the public internet.

## Project Structure

```text
devcontrol-dashboard/
|-- backend/
|   |-- app.py
|   |-- command_classifier.py
|   |-- requirements.txt
|   `-- terminal_session.py
|-- frontend/
|   |-- package.json
|   |-- vite.config.js
|   `-- src/
|-- tools/
|   |-- cleanup_ports.bat
|   |-- cleanup_ports.py
|   |-- cleanup_ports.sh
|   |-- start_linux.sh
|   `-- start_windows.bat
`-- start.py
```

## Troubleshooting

### Ports already in use

Use one of:

```bat
tools\cleanup_ports.bat
```

```bash
./tools/cleanup_ports.sh
```

```bash
python tools/cleanup_ports.py
```

### Frontend fails with `spawn EPERM`

That is an environment/process-spawn restriction, usually caused by sandboxing or host policy, not by the React code itself. Run the frontend outside the sandbox or from a normal local terminal.

### Protected actions return `401`

The frontend password does not match the backend `DEVCONTROL_PASSWORD`. Re-enter the same password used during launch.

### Process controls do not work on Windows

Run the dashboard as Administrator.

## Development Notes

- Frontend dev server: Vite
- Backend API: Flask
- System/process metrics: psutil
- Terminal transport: websockets

## License

MIT. See [LICENSE](LICENSE).
