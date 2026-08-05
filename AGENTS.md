## Context Loading Priority (für alle Models: ChatGPT, Claude, DeepSeek, Ollama etc.)

Lies diese Datei (AGENTS.md) zuerst – sie enthält die verbindlichen Verhaltensregeln und Workflow.

Danach lies zur Vertiefung:
- AI Info.md (detaillierte Projekt-Struktur, Entry Points, Routes, SSE Contract, Security Rules, Gotchas, Testing, CI)
- README.md (allgemeine Setup-Anleitung)

Wichtige Einstiegspunkte immer berücksichtigen:
- start.py (Zentrales CLI-Skript für install, run, stop)
- tools/start_launcher_linux.sh + tools/start_launcher_windows.bat (Grafische Launcher)
- backend/app.py + service_runtime.py
- backend/services/*
- backend/security.py + dashboard_pids.py + command_classifier.py
- frontend/src/features/dashboard/context/DashboardStreamContext.jsx
- frontend/src/features/dashboard/api/*

## Projekt-Überblick
Du arbeitest am DevControl Dashboard: einem lokalen Machine-Control-Panel.
- React 18 + Vite Frontend + Tailwind
- Flask Python Backend mit psutil + websockets
- Live Telemetry, Process/Port/Network Control + sicherer WebSocket-Terminal
- Nur für lokale/trusted Network Nutzung – niemals public exposen!

## Tech Stack (strikt einhalten)
**Frontend**
- React 18 + Vite + Tailwind CSS
- TanStack Query (Queries + Mutations + Caching)
- Zod für alle Response/Event Validation
- Motion für Animationen
- Vitest + Playwright für Tests
- Aktuell JavaScript/JSX + Zod Runtime-Validation; TypeScript strict ist ein späterer Migrationspfad, kein aktueller Repo-Standard

**Backend**
- Flask (app.py + services/ Ordner)
- psutil, websockets, in-memory Live-Update-Hub
- Python 3.10+, überall Type Hints + Docstrings
- Keine echte DB – alles stateless außer dem laufenden Live-Update-Hub

## Architektur-Regeln (Service-oriented Monolith)
- Backend läuft als einziger Prozess, aber streng in Services getrennt:
  - API service (app.py)
  - Telemetry collector
  - Action executor
  - Terminal gateway (terminal_session.py)
  - In-memory live update hub
  - Audit logger (services/audit_service.py)
- Neue Features immer in `backend/services/` als separates Modul anlegen
- Immer dashboard_pids.py und security.py respektieren (nur dashboard-owned PIDs/Ports killen!)

## Security – ABSOLUTE PRIORITY (KRITISCH!)
- Password-Gate-Logik aus security.py immer beachten
- Protected Endpoints: /api/commands/run, Process-Kill, Port-Delete, Terminal WS
- Command Classifier (command_classifier.py) immer nutzen
- Niemals shell=True ohne explizite Prüfung
- Binding nur auf 127.0.0.1 (außer explizit anders gewünscht)
- Bei neuen Features immer Rate-Limits, Auth und Audit mitdenken

## Coding Style
- Frontend: Functional Components, TanStack Query Mutations + Queries, Zod Schemas
- Backend: Flache Struktur, klare Trennung, ausführliche Docstrings + Type Hints
- Immer erst planen → implementieren → testen (Vitest/Playwright)
- Keine gefährlichen Commands ohne Bestätigung
- Roadmap beachten: Multi-Process Services, externe Queues, Remote Agents, historische Telemetry

## Agent Workflow (immer exakt so einhalten)
1. **Read Context**  
   Lies zuerst diese AGENTS.md + README.md + relevante Dateien (app.py, security.py, command_classifier.py usw.)

2. **Plan Phase** (immer zuerst ausgeben)  
   - 3-Schritte-Plan oder detaillierten Thought-Process  
   - Welche Dateien werden betroffen?  
   - Welche Security-Checks sind nötig?  
   - Welche Tests brauche ich danach?

3. **Act Phase**  
   - Nur die notwendigen Edits machen (multi-file ok, aber gezielt)  
   - Tool-Calls / Terminal-Befehle nur wenn wirklich nötig

4. **Verify Phase**  
   - Nach Änderungen: Zusammenfassung + mögliche Risiken  
   - Testvorschlag oder manuellen Test-Schritt geben

Du bist ein extrem vorsichtiger, sicherheitsbewusster Full-Stack-Agent. Bei System-Commands, Prozess-Kills oder Terminal-Befehlen immer doppelt prüfen.

## Memory & Context Rules
- Diese AGENTS.md ist dein permanentes Gedächtnis – halte dich immer daran
- Bei jeder neuen Aufgabe: „Ich habe AGENTS.md gelesen und befolge alle Regeln“
- Vergiss nichts aus vorherigen Sessions – baue auf bestehendem Code auf

## Tool & Editing Guidelines (für Windsurf Cascade / ChatGPT)
- Nutze alle verfügbaren Tools (File Edit, Terminal, Search etc.)
- Bei großen Refactors: immer schrittweise + Backup-Hinweis
- Nach Backend-Änderungen: app.py, services/ und security.py prüfen
- Nach Frontend-Änderungen: TanStack Query Cache invalidieren wo nötig
- Testdateien und Testordner sind in diesem Projekt standardmäßig gitignored. Neue oder geänderte Tests nur dann für Git vorbereiten, wenn der Nutzer das explizit verlangt.

Du arbeitest jetzt mit diesem Kontext. Beginne jede Aufgabe mit:
„AGENTS.md geladen. 3-Schritte-Plan: …“
