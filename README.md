# DevControl Dashboard

DevControl Dashboard is a local machine control panel with a React frontend and a Python backend. It combines live telemetry, process and port controls, network inspection, and a WebSocket-backed terminal behind an optional control password.

It is designed for local or trusted-network use, not public exposure.

## What It Does

- live system performance monitoring
- process inspection and dashboard-owned process termination
- listening-port inspection and dashboard-owned port termination
- network interface and gateway overview
- browser terminal with command safety checks
- optional password protection for sensitive actions
- SSE-driven live updates from the backend

## Current Stack

### Frontend

- React 18
- Vite
- Tailwind CSS
- TanStack Query
- Zod
- Motion
- Vitest
- Playwright
- MSW

### Backend

- Flask
- psutil
- websockets
- Python 3.10+

## Requirements

- Python 3.10 or newer
- Node.js 20 recommended
- npm

## Quick Start

### Windows

Run the launcher as Administrator:

```bat
tools\start_windows.bat
```

What it does:

- starts backend on `http://127.0.0.1:8000`
- starts frontend on `http://127.0.0.1:3000`
- starts terminal WebSocket on `ws://127.0.0.1:8003`
- installs missing backend and frontend dependencies
- asks whether you want password protection enabled

If you enable a password, enter the same password in the dashboard UI to unlock protected actions.

### Linux

```bash
chmod +x tools/start_linux.sh
./tools/start_linux.sh
```

The Linux launcher also asks whether password protection should be enabled before startup.

### Manual Start

Backend:

```bash
cd backend
python -m pip install -r requirements.txt
python app.py
```

Frontend:

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

Optional password:

Windows PowerShell:

```powershell
$env:DEVCONTROL_PASSWORD = "your-password"
```

Bash:

```bash
export DEVCONTROL_PASSWORD="your-password"
```

If `DEVCONTROL_PASSWORD` is unset, the backend runs without password protection.

## Security Model

Sensitive actions can be protected by the launcher control password.

Protected endpoints:

- `POST /api/commands/run`
- `DELETE /api/port/<port>`
- `POST /api/processes/<pid>/kill`
- terminal WebSocket on port `8003`

Current safeguards:

- optional password gate for sensitive actions
- dashboard-owned PID restriction for process and port termination
- command classification and dangerous-command filtering
- admin check for process termination on Windows

Current limitations:

- backend binds to `0.0.0.0`
- Windows command execution still uses `shell=True` in some paths
- there is no multi-user auth or session model
- there are no rate limits
- terminal mode is subprocess-based, not a full PTY shell

Use this project only on a trusted machine or trusted local network.

## Architecture

The backend is split as a service-oriented monolith. It still runs as one Python deployable, but responsibilities are separated internally.

Backend services:

- API service
- telemetry collector
- action executor
- terminal gateway
- stream processor
- in-memory event bus

The frontend uses a typed data layer:

- TanStack Query for cached API state and mutations
- Zod for response and event payload validation
- SSE for live backend snapshots
- Motion for animated transitions

## Project Structure

```text
devcontrol-dashboard/
|-- backend/
|   |-- app.py
|   |-- command_classifier.py
|   |-- dashboard_pids.py
|   |-- event_bus.py
|   |-- requirements.txt
|   |-- security.py
|   |-- service_runtime.py
|   |-- terminal_session.py
|   `-- services/
|-- frontend/
|   |-- package.json
|   |-- package-lock.json
|   |-- playwright.config.js
|   |-- vite.config.js
|   |-- public/
|   |   `-- mockServiceWorker.js
|   |-- src/
|   |   |-- app/
|   |   |-- components/
|   |   |-- features/
|   |   |-- mocks/
|   |   `-- test/
|   `-- tests/
|       `-- e2e/
|-- tools/
|   |-- cleanup_ports.bat
|   |-- cleanup_ports.py
|   |-- cleanup_ports.sh
|   |-- start_linux.sh
|   `-- start_windows.bat
|-- .github/
|   `-- workflows/
|       `-- ci.yml
`-- start.py
```

## Frontend Development

### Commands

```bash
cd frontend
npm install
npm run dev
```

Build:

```bash
npm run build
```

Unit tests:

```bash
npm run test
```

E2E tests:

```bash
npm run test:e2e
```

### Mocked Frontend Mode

MSW is configured for optional browser mocking in development.

To run the frontend with mocked API responses instead of the live backend:

```bash
cd frontend
VITE_ENABLE_MSW=true npm run dev
```

On Windows PowerShell:

```powershell
$env:VITE_ENABLE_MSW = "true"
npm run dev
```

## Backend Development

```bash
cd backend
python -m pip install -r requirements.txt
python app.py
```

Useful API endpoints:

- `GET /api/system/info`
- `GET /api/system/performance`
- `GET /api/processes`
- `GET /api/ports`
- `GET /api/network/info`
- `GET /api/auth/status`
- `POST /api/auth/validate`
- `GET /api/events/stream`

## CI

The GitHub Actions workflow runs:

- backend syntax checks
- backend live API smoke tests
- frontend production build
- Vitest
- Playwright
- dependency review on pull requests
- Trivy security scanning

Workflow file:

- [.github/workflows/ci.yml](.github/workflows/ci.yml)

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

### Frontend test or build output appears in Git

Generated folders like `frontend/dist`, `frontend/test-results`, and Playwright reports should stay ignored. Only commit source files, configs, and the lockfile.

### Protected actions return `401`

The frontend password does not match the backend `DEVCONTROL_PASSWORD`.

### Process controls do not work on Windows

Run the dashboard as Administrator.

### Terminal stays disconnected

Check:

- backend is running
- port `8003` is free
- the password matches if protection is enabled

## Roadmap Direction

The current backend split is a foundation for future expansion into:

- multi-process services
- external queues or buses
- remote agents
- stronger auth and audit trails
- historical telemetry storage

## License

MIT. See [LICENSE](LICENSE).
