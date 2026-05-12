# DevControl Dashboard

DevControl is a local machine-control dashboard for development machines. It combines live system telemetry, process and port controls, network inspection, and a browser terminal behind an optional control password.

DevControl is intended for local or trusted-machine use only. Do not expose it publicly. The frontend, backend API, and terminal gateway are designed to bind to `127.0.0.1`.

## Highlights

- graphical launcher for starting, stopping, logging, and opening the dashboard
- React 18 dashboard with live SSE updates
- Flask backend with service-oriented internals
- optional password gate for sensitive actions
- safe process and port stop previews before destructive actions
- dashboard-owned PID tracking for startup and shutdown cleanup
- current-user external stop mode only when password protection is enabled and authenticated
- command classifier for terminal command safety
- terminal audit, action feed, and security health UI
- CI with backend tests, frontend checks, Playwright, dependency audit, and Trivy

## Runtime Ports

| Service | URL |
| --- | --- |
| Frontend | `http://127.0.0.1:3000` |
| Backend API | `http://127.0.0.1:8000` |
| Terminal Gateway | `ws://127.0.0.1:8003` |
| Live Updates | `GET /api/events/stream` |

## Requirements

- Python 3.10 or newer
- Node.js 20 recommended
- npm
- Windows: run as Administrator when process controls need elevated rights

## Recommended Start

Use the graphical launcher.

Windows:

```bat
tools\start_launcher_windows.bat
```

Linux:

```bash
chmod +x tools/start_launcher_linux.sh
./tools/start_launcher_linux.sh
```

The launcher provides:

- Start DevControl
- Stop DevControl
- Open Dashboard
- Check Git
- live log output
- backend/frontend/terminal status badges
- optional password dialog before startup
- advanced buttons for install, backend/frontend-only start, build, and tests

When starting from the launcher, password protection is selected in a small GUI dialog. The password is passed only to the startup process environment for that session and is not written to logs or stored permanently.

## Command-Line Start

`start.py` remains the main source of truth for startup, install, and shutdown.

```bash
python start.py install
python start.py run
python start.py stop
```

`install` checks Python, Node, npm, and installs backend/frontend dependencies.

`run` asks whether password protection should be enabled, installs or repairs dependencies, cleans only dashboard-owned processes on DevControl ports, starts backend, frontend, and terminal gateway, then monitors them.

`stop` terminates only registered dashboard-owned processes from the project-local PID file.

Legacy terminal wrappers still delegate to `start.py`:

```bat
tools\start_windows.bat
```

```bash
chmod +x tools/start_linux.sh
./tools/start_linux.sh
```

## Password Mode

Password protection is optional.

If `DEVCONTROL_PASSWORD` is set, protected HTTP routes and the terminal gateway require a valid control session or password header.

Windows PowerShell:

```powershell
$env:DEVCONTROL_PASSWORD = "your-password"
python start.py run
```

Bash:

```bash
export DEVCONTROL_PASSWORD="your-password"
python start.py run
```

If no password is configured, protected routes are allowed locally, but external current-user stop controls remain disabled with a password-required reason.

## Manual Development

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
npm run dev
```

The committed Vite config binds to `127.0.0.1`.

Build:

```bash
cd frontend
npm run build
```

Lint:

```bash
cd frontend
npm run lint
```

Unit tests:

```bash
cd frontend
npm run test
```

E2E tests:

```bash
cd frontend
npm run test:e2e
```

Backend tests:

```bash
cd backend
python -m pytest -q
```

## Windows Node/Vite Fallback

If a local Windows policy blocks Node child processes and Vite, Vitest, or Playwright fails with `spawn EPERM`, use the project-local Node helper:

```bash
python tools/devcontrol/frontend_lts.py install
python tools/devcontrol/frontend_lts.py dev
python tools/devcontrol/frontend_lts.py build
python tools/devcontrol/frontend_lts.py test
python tools/devcontrol/frontend_lts.py e2e
```

The helper downloads portable Node 22 into `.devcontrol-runtime/node-lts` and verifies that Node can spawn child processes before running frontend tooling.

If Vite is unavailable but `frontend/dist` already exists, serve the built frontend with the local dist proxy:

```bash
node tools/devcontrol/serve_dist_proxy.js
```

The dist proxy binds to `127.0.0.1:3000`, serves `frontend/dist`, and forwards `/api` requests to `127.0.0.1:8000`.

## Security Model

Protected surfaces:

- `POST /api/commands/run`
- `GET /api/processes/<pid>/stop-preview`
- `POST /api/processes/<pid>/kill`
- `GET /api/port/<port>/stop-preview`
- `DELETE /api/port/<port>`
- terminal WebSocket on `127.0.0.1:8003`

Important safeguards:

- localhost-only default binding
- optional password gate in `backend/security.py`
- server-side control session cookie
- `X-DevControl-Password` support for protected HTTP and terminal handshake
- peer-IP rate limiting by default
- `X-Forwarded-For` ignored unless trusted proxy mode is explicitly enabled
- dashboard-owned PID tracking in `.devcontrol-runtime/pids.json`
- no broad process cleanup when the PID file is missing
- protected PIDs and the active DevControl backend process are blocked
- other-user and system/service processes are blocked
- current-user external process/port stops require password mode and authentication
- process and port stop actions use dry-run preview before confirmation
- port stops verify that the listener is actually gone
- dangerous shell operators and command substitution are blocked
- public API errors return generic 500 responses while details remain server-side
- sensitive telemetry can be masked while locked

Current limitations:

- password sessions are in memory and reset on backend restart
- rate limits are in memory and reset on backend restart
- the browser terminal is subprocess-based, not a full PTY shell
- this is still a local control panel, not a hardened remote-admin product

## Architecture

The backend is a service-oriented monolith. It runs as one local Python application while keeping responsibilities separated.

Backend entry points:

- `backend/app.py` - Flask API facade and REST/SSE routes
- `backend/service_runtime.py` - wires runtime services
- `backend/security.py` - password gate, sessions, rate limits
- `backend/dashboard_pids.py` - dashboard-owned process tracking
- `backend/process_control_policy.py` - process and port stop policy
- `backend/command_classifier.py` - terminal command classification
- `backend/services/telemetry_service.py` - telemetry facade
- `backend/services/telemetry_collection.py` - system/process/port/network collection
- `backend/services/action_executor.py` - protected action facade
- `backend/services/action_executor_processes.py` - process and port stop execution
- `backend/services/action_executor_commands.py` - protected command execution
- `backend/services/terminal_gateway.py` - WebSocket gateway
- `backend/services/live_update_hub.py` - in-memory SSE event hub

Frontend entry points:

- `frontend/src/App.jsx` - top-level dashboard shell
- `frontend/src/features/dashboard/api/client.js` - API client and query keys
- `frontend/src/features/dashboard/api/schemas.js` - Zod validation
- `frontend/src/features/dashboard/context/DashboardStreamContext.jsx` - SSE state bridge
- `frontend/src/features/dashboard/hooks/useAuthStatus.js` - auth/session flow
- `frontend/src/features/dashboard/hooks/useActionMutations.js` - protected actions
- `frontend/src/components/ProcessManager.jsx` - process controls
- `frontend/src/components/PortControl.jsx` - port controls
- `frontend/src/components/WindowTerminal.jsx` - terminal UI
- `frontend/src/components/NetworkHub.jsx` - network page and lock flow

Frontend data flow:

- TanStack Query owns cached REST state.
- Zod validates API and SSE payloads.
- `EventSource('/api/events/stream')` delivers live snapshots.
- Protected mutations invalidate or refresh relevant query state after completion.

## Project Structure

```text
devcontrol-dashboard/
|-- backend/
|   |-- app.py
|   |-- command_classifier.py
|   |-- dashboard_pids.py
|   |-- process_control_policy.py
|   |-- security.py
|   |-- service_runtime.py
|   |-- terminal_session.py
|   |-- terminal_command_executor.py
|   |-- services/
|   `-- tests/
|-- docs/
|   `-- SECURITY.md
|-- frontend/
|   |-- package.json
|   |-- playwright.config.js
|   |-- vite.config.js
|   |-- src/
|   `-- tests/
|-- tools/
|   |-- devcontrol/
|   |   |-- devcontrol_launcher.py
|   |   |-- frontend_lts.py
|   |   `-- serve_dist_proxy.js
|   |-- start_launcher_linux.sh
|   |-- start_launcher_windows.bat
|   |-- start_linux.sh
|   `-- start_windows.bat
|-- .github/
|   `-- workflows/
|-- AI Info.md
|-- AGENTS.md
|-- README.md
`-- start.py
```

## API Overview

Common read routes:

- `GET /api/system/info`
- `GET /api/system/performance`
- `GET /api/processes`
- `GET /api/ports`
- `GET /api/network/info`
- `GET /api/system/is-admin`
- `GET /api/health`
- `GET /api/auth/status`
- `GET /api/events/stream`

Auth routes:

- `POST /api/auth/validate`
- `POST /api/auth/session`
- `DELETE /api/auth/session`

Protected action routes:

- `POST /api/commands/run`
- `GET /api/processes/<pid>/stop-preview`
- `POST /api/processes/<pid>/kill`
- `GET /api/port/<port>/stop-preview`
- `DELETE /api/port/<port>`

## Live Events

SSE event types:

- `heartbeat`
- `system_snapshot`
- `process_snapshot`
- `network_snapshot`
- `action`
- `stream_error`

On connect, the backend sends bootstrap snapshots and then continues with live hub updates.

## Testing

Backend:

```bash
cd backend
python -m compileall .
python -m pytest -q
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
npm run test
npm run test:e2e
```

Root-level smoke checks:

```bash
python start.py install
python start.py stop
```

Test files are currently present in the repo, but local test directories and generated test artifacts may still be ignored. Check `git status --ignored` before assuming new tests will be committed.

## CI

The GitHub Actions workflow in `.github/workflows/ci.yml` includes:

- workflow lint
- backend matrix for Python 3.10, 3.11, and 3.12
- `python -m compileall backend`
- backend pytest
- `pip-audit`
- backend live smoke tests, including terminal gateway coverage
- frontend lint
- frontend production build
- Vitest
- Playwright
- dependency review on pull requests
- Trivy filesystem scan and SARIF upload

CI is split into granular jobs so failures show whether the issue is backend, frontend, E2E, dependency audit, or security scan.

## Troubleshooting

### GUI launcher does not open

Check that Python includes Tkinter:

```bash
python -m tkinter
```

If Tkinter is unavailable, use `python start.py run` until Tkinter is installed for your Python distribution.

### Password prompt appears in terminal

That is expected only for `python start.py run` or the legacy terminal wrappers. The graphical launcher uses its own password dialog.

### Ports are already in use

Use:

```bash
python start.py stop
```

`start.py stop` only stops registered dashboard-owned processes. It does not perform broad system-wide port kills.

### Frontend will not start on Windows

If Vite fails with `spawn EPERM`, try:

```bash
python tools/devcontrol/frontend_lts.py dev
```

If that also fails, the host policy is blocking Node child processes globally. Run the frontend outside that policy or use the dist proxy after building.

### Protected actions return `401`

The browser session is not unlocked, the password is wrong, or the backend was restarted and the in-memory session was lost.

### Protected actions return `429`

The in-memory rate limiter temporarily throttled repeated failures or bursts. Wait for the reported `Retry-After` interval.

### Terminal is disconnected

Check:

- backend is running on `127.0.0.1:8000`
- terminal gateway is listening on `127.0.0.1:8003`
- the dashboard is unlocked when password protection is enabled
- the terminal handshake rate limit has not been triggered

### Process or port stop is disabled

Common reasons:

- password protection is required but not enabled
- dashboard is locked
- process belongs to another user or system scope
- process is protected
- Windows admin rights are required
- listener is ambiguous and needs a more specific target

## Operational Notes

- Do not run DevControl on a public interface.
- Keep `127.0.0.1` binding unless you intentionally review the full security impact.
- Avoid manually killing processes that DevControl did not register as dashboard-owned.
- Prefer stop previews and the UI confirmation flow for destructive actions.
- Keep generated frontend artifacts and Playwright reports out of commits.

## Roadmap Direction

The current service split supports future work such as:

- multi-process backend services
- external queues or event buses
- remote agents
- stronger persistent audit logs
- historical telemetry storage
- TypeScript migration for the frontend

## License

MIT. See [LICENSE](LICENSE).
