# DevControl Dashboard

DevControl Dashboard is a local machine control panel with a React frontend and a Python backend. It combines live telemetry, process and port controls, network inspection, and a WebSocket-backed terminal behind an optional control password.

It is designed for local or trusted-network use, not public exposure.
The frontend dev server, backend API, and terminal gateway are intended to bind to `127.0.0.1` only.

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

### Root Starter Commands

The root helper now exposes explicit subcommands:

```bash
python start.py install
python start.py run
python start.py stop
```

`install` checks dependencies and installs backend/frontend packages.

`run` performs install checks, prompts for the optional control password, cleans up only dashboard-owned processes, then starts backend and frontend.

`stop` terminates only dashboard-owned registered processes.

The wrapper scripts in `tools/` are thin entrypoints only. They delegate to `start.py` instead of carrying separate startup or cleanup logic.

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

The committed Vite config already binds the frontend dev server to `127.0.0.1`, so it is not reachable from other interfaces unless you explicitly override it.

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
- server-side auth session cookie for protected HTTP actions
- `X-DevControl-Password` support for protected HTTP actions and terminal handshake
- dashboard-owned PID restriction for process and port termination
- command classification with dangerous-command blocking and explicit confirmation for unknown commands
- shell operators such as `&`, `&&`, `|`, `>`, `<`, backticks, and command substitution are blocked for user input
- in-memory rate limiting for auth, protected HTTP actions, and terminal handshakes
- localhost-only frontend, backend, and terminal binding
- admin check for process termination on Windows

Current limitations:

- terminal WebSocket still uses a single local-session model, not multi-user auth
- terminal mode is subprocess-based, not a full PTY shell

Use this project only on a trusted machine or trusted local network.

## Architecture

The backend is split as a service-oriented monolith. It still runs as one Python deployable, but responsibilities are separated internally.

Backend services:

- API service
- telemetry collector
- action executor
- terminal gateway
- live update hub

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
|   |-- requirements.txt
|   |-- security.py
|   |-- service_runtime.py
|   |-- terminal_session.py
|   `-- services/
|       `-- live_update_hub.py
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

By default, Vite binds to `127.0.0.1:3000` in this repo.

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Unit tests:

```bash
npm run test
```

E2E tests:

```bash
npm run test:e2e
```

Test directories and test files are gitignored in this repo. Keep local test work local unless you explicitly decide to force-add it.

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

Mocked mode still stays bound to `127.0.0.1`.

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
- `POST /api/auth/session`
- `DELETE /api/auth/session`
- `GET /api/events/stream`

## CI

The GitHub Actions workflow runs:

- workflow lint with `actionlint`
- backend syntax checks
- backend pytest
- backend dependency audit with `pip-audit`
- backend live API smoke tests
- frontend ESLint
- frontend production build
- Vitest
- Playwright
- dependency review on pull requests
- Trivy security scanning

The workflow is split into granular jobs so branch protection can show exactly which gate failed.

Note: local test files are ignored by Git, so any new or modified tests will not be picked up for commits unless you deliberately override the ignore rules.

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

All cleanup wrappers now forward to `python start.py stop`.

### Frontend test or build output appears in Git

Generated folders like `frontend/dist`, `frontend/test-results`, and Playwright reports should stay ignored. Only commit source files, configs, and the lockfile.

### Protected actions return `401`

The frontend password does not match the backend `DEVCONTROL_PASSWORD`, or the HTTP auth session cookie is missing/expired.

### Protected actions return `429`

The in-memory rate limiter has temporarily throttled repeated auth failures or bursts against protected actions. Wait for the reported `Retry-After` interval and try again.

### Process controls do not work on Windows

Run the dashboard as Administrator.

### Terminal stays disconnected

Check:

- backend is running
- port `8003` is free
- the password matches if protection is enabled
- the current browser session has a valid control session cookie
- you have not triggered the terminal handshake rate limit

## Roadmap Direction

The current backend split is a foundation for future expansion into:

- multi-process services
- external queues or buses
- remote agents
- stronger auth and audit trails
- historical telemetry storage

## License

MIT. See [LICENSE](LICENSE).
