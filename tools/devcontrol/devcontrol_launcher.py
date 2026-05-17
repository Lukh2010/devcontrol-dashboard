#!/usr/bin/env python3
"""Graphical launcher for the local DevControl dashboard."""

from __future__ import annotations

import os
import queue
import socket
import subprocess
import sys
import threading
import tkinter as tk
import webbrowser
import re
from pathlib import Path
from tkinter import ttk


PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
START_SCRIPT = PROJECT_ROOT / "start.py"
DASHBOARD_URL = "http://127.0.0.1:3000"
BACKEND_URL = "http://127.0.0.1:8000"
TERMINAL_URL = "ws://127.0.0.1:8003"
PORTS = {
    "backend": ("127.0.0.1", 8000),
    "frontend": ("127.0.0.1", 3000),
    "terminal": ("127.0.0.1", 8003),
}


def npm_command() -> str:
    """Return the platform-correct npm executable name."""
    return "npm.cmd" if os.name == "nt" else "npm"


def is_port_listening(host: str, port: int, timeout: float = 0.35) -> bool:
    """Return whether a TCP port accepts local connections."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


class DevControlLauncher(tk.Tk):
    """Tkinter application that delegates DevControl lifecycle commands."""

    def __init__(self) -> None:
        super().__init__()
        self.title("DevControl Launcher")
        self.geometry("1080x760")
        self.minsize(980, 700)

        self.log_queue: queue.Queue[tuple[str, str]] = queue.Queue()
        self.processes: dict[str, subprocess.Popen[str]] = {}
        self.command_buttons: dict[str, ttk.Button] = {}
        self.badge_vars = {
            "backend": tk.StringVar(value="Unknown"),
            "frontend": tk.StringVar(value="Unknown"),
            "terminal": tk.StringVar(value="Unknown"),
            "git": tk.StringVar(value="Unknown"),
        }
        self.status_var = tk.StringVar(value="Idle")
        self.git_url: str | None = None
        self.advanced_visible = tk.BooleanVar(value=False)

        self._configure_style()
        self._build_layout()
        self._append_startup_message()
        self.after(100, self._drain_log_queue)
        self.after(500, self._refresh_status_loop)

    def _configure_style(self) -> None:
        self.configure(bg="#f5f7fb")
        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass

        style.configure(".", font=("Segoe UI", 10), background="#f5f7fb", foreground="#162033")
        style.configure("Card.TFrame", background="#ffffff", relief="flat")
        style.configure("Header.TFrame", background="#f5f7fb")
        style.configure("Title.TLabel", font=("Segoe UI Semibold", 26), background="#f5f7fb", foreground="#101828")
        style.configure("Subtitle.TLabel", font=("Segoe UI", 11), background="#f5f7fb", foreground="#667085")
        style.configure("Section.TLabel", font=("Segoe UI Semibold", 11), background="#ffffff", foreground="#101828")
        style.configure("Muted.TLabel", background="#ffffff", foreground="#667085")
        style.configure("Status.TLabel", font=("Segoe UI Semibold", 10), background="#ffffff", foreground="#344054")
        style.configure("Primary.TButton", font=("Segoe UI Semibold", 12), padding=(18, 12))
        style.configure("Secondary.TButton", font=("Segoe UI Semibold", 10), padding=(12, 9))
        style.configure("Advanced.TButton", font=("Segoe UI", 9), padding=(9, 7))
        style.configure("Badge.TLabel", font=("Segoe UI Semibold", 9), padding=(10, 5), background="#eef2f7", foreground="#344054")

    def _build_layout(self) -> None:
        root = ttk.Frame(self, padding=24, style="Header.TFrame")
        root.pack(fill="both", expand=True)
        root.columnconfigure(0, weight=1)
        root.rowconfigure(5, weight=1)

        header = ttk.Frame(root, style="Header.TFrame")
        header.grid(row=0, column=0, sticky="ew")
        header.columnconfigure(0, weight=1)
        ttk.Label(header, text="DevControl", style="Title.TLabel").grid(row=0, column=0, sticky="w")
        ttk.Label(header, text="Local machine-control dashboard", style="Subtitle.TLabel").grid(row=1, column=0, sticky="w", pady=(2, 0))

        self._build_badges(root)
        self._build_actions(root)
        self._build_status(root)
        self._build_advanced(root)
        self._build_logs(root)
        ttk.Label(root, text="DevControl Launcher", style="Subtitle.TLabel").grid(row=6, column=0, sticky="e", pady=(8, 0))

    def _build_badges(self, root: ttk.Frame) -> None:
        badges = ttk.Frame(root, style="Header.TFrame")
        badges.grid(row=1, column=0, sticky="ew", pady=(18, 14))
        for index, (label, key) in enumerate(
            (("Backend", "backend"), ("Frontend", "frontend"), ("Terminal Gateway", "terminal"), ("Git", "git"))
        ):
            card = ttk.Frame(badges, padding=(14, 12), style="Card.TFrame")
            card.grid(row=0, column=index, sticky="ew", padx=(0 if index == 0 else 10, 0))
            badges.columnconfigure(index, weight=1)
            ttk.Label(card, text=label, style="Muted.TLabel").pack(anchor="w")
            ttk.Label(card, textvariable=self.badge_vars[key], style="Status.TLabel").pack(anchor="w", pady=(5, 0))

    def _build_actions(self, root: ttk.Frame) -> None:
        card = ttk.Frame(root, padding=16, style="Card.TFrame")
        card.grid(row=2, column=0, sticky="ew", pady=(0, 12))
        for column in range(5):
            card.columnconfigure(column, weight=1)

        self.start_button = ttk.Button(card, text="Start DevControl", style="Primary.TButton", command=self.start_devcontrol)
        self.start_button.grid(row=0, column=0, sticky="ew", padx=(0, 10))
        ttk.Button(card, text="Stop DevControl", style="Secondary.TButton", command=self.stop_devcontrol).grid(row=0, column=1, sticky="ew", padx=(0, 10))
        ttk.Button(card, text="Open Dashboard", style="Secondary.TButton", command=self.open_dashboard).grid(row=0, column=2, sticky="ew", padx=(0, 10))
        ttk.Button(card, text="Check Git", style="Secondary.TButton", command=self.check_git).grid(row=0, column=3, sticky="ew", padx=(0, 10))
        self.github_button = ttk.Button(card, text="Open GitHub Repo", style="Secondary.TButton", command=self.open_github_repo)
        self.github_button.grid(row=0, column=4, sticky="ew")
        self.github_button.state(["disabled"])

    def _build_status(self, root: ttk.Frame) -> None:
        card = ttk.Frame(root, padding=16, style="Card.TFrame")
        card.grid(row=3, column=0, sticky="ew", pady=(0, 12))
        card.columnconfigure(1, weight=1)

        ttk.Label(card, text="Status", style="Section.TLabel").grid(row=0, column=0, sticky="w")
        ttk.Label(card, textvariable=self.status_var, style="Badge.TLabel").grid(row=0, column=1, sticky="w", padx=(12, 0))
        urls = f"Dashboard: {DASHBOARD_URL}     Backend: {BACKEND_URL}     Terminal: {TERMINAL_URL}"
        ttk.Label(card, text=urls, style="Muted.TLabel").grid(row=1, column=0, columnspan=2, sticky="w", pady=(9, 0))

    def _build_advanced(self, root: ttk.Frame) -> None:
        wrapper = ttk.Frame(root, style="Header.TFrame")
        wrapper.grid(row=4, column=0, sticky="new", pady=(0, 12))
        wrapper.columnconfigure(0, weight=1)

        self.advanced_toggle = ttk.Button(wrapper, text="Advanced ▸", style="Secondary.TButton", command=self.toggle_advanced)
        self.advanced_toggle.grid(row=0, column=0, sticky="w")

        self.advanced_frame = ttk.Frame(wrapper, padding=14, style="Card.TFrame")
        for column in range(4):
            self.advanced_frame.columnconfigure(column, weight=1)

        buttons = [
            ("Install Dependencies", "install", [sys.executable, str(START_SCRIPT), "install"], PROJECT_ROOT, False),
            ("Start Backend Only", "backend-only", [sys.executable, "app.py"], BACKEND_DIR, True),
            ("Start Frontend Only", "frontend-only", [npm_command(), "run", "dev"], FRONTEND_DIR, True),
            ("Build Frontend", "build-frontend", [npm_command(), "run", "build"], FRONTEND_DIR, False),
            ("Run Frontend Tests", "frontend-tests", [npm_command(), "run", "test"], FRONTEND_DIR, False),
            ("Run Frontend E2E", "frontend-e2e", [npm_command(), "run", "test:e2e"], FRONTEND_DIR, False),
            ("Run Backend Tests", "backend-tests", [sys.executable, "-m", "pytest"], BACKEND_DIR, False),
            ("Stop DevControl", "advanced-stop", [sys.executable, str(START_SCRIPT), "stop"], PROJECT_ROOT, False),
        ]

        for index, (text, key, command, cwd, keep_ref) in enumerate(buttons):
            button = ttk.Button(
                self.advanced_frame,
                text=text,
                style="Advanced.TButton",
                command=lambda k=key, c=command, d=cwd, r=keep_ref: self.run_command(k, c, d, keep_ref=r),
            )
            button.grid(row=index // 4, column=index % 4, sticky="ew", padx=4, pady=4)
            self.command_buttons[key] = button

    def _build_logs(self, root: ttk.Frame) -> None:
        card = ttk.Frame(root, padding=14, style="Card.TFrame")
        card.grid(row=5, column=0, sticky="nsew")
        card.rowconfigure(1, weight=1)
        card.columnconfigure(0, weight=1)

        header = ttk.Frame(card, style="Card.TFrame")
        header.grid(row=0, column=0, sticky="ew", pady=(0, 8))
        header.columnconfigure(0, weight=1)
        ttk.Label(header, text="Live Log", style="Section.TLabel").grid(row=0, column=0, sticky="w")
        ttk.Button(header, text="Clear Log", style="Advanced.TButton", command=self.clear_log).grid(row=0, column=1, sticky="e")

        log_frame = ttk.Frame(card, style="Card.TFrame")
        log_frame.grid(row=1, column=0, sticky="nsew")
        log_frame.rowconfigure(0, weight=1)
        log_frame.columnconfigure(0, weight=1)
        self.log_text = tk.Text(
            log_frame,
            height=24,
            wrap="word",
            bg="#0f172a",
            fg="#e5e7eb",
            insertbackground="#e5e7eb",
            relief="flat",
            padx=12,
            pady=10,
            font=("Cascadia Mono", 9),
        )
        scrollbar = ttk.Scrollbar(log_frame, command=self.log_text.yview)
        self.log_text.configure(yscrollcommand=scrollbar.set)
        self.log_text.grid(row=0, column=0, sticky="nsew")
        scrollbar.grid(row=0, column=1, sticky="ns")

    def _append_startup_message(self) -> None:
        self.log("Launcher ready.")
        self.log("Start DevControl delegates to start.py run. Password choice is handled by the launcher dialog.")

    def toggle_advanced(self) -> None:
        if self.advanced_visible.get():
            self.advanced_frame.grid_remove()
            self.advanced_toggle.configure(text="Advanced ▸")
            self.advanced_visible.set(False)
        else:
            self.advanced_frame.grid(row=1, column=0, sticky="ew", pady=(8, 0))
            self.advanced_toggle.configure(text="Advanced ▾")
            self.advanced_visible.set(True)

    def start_devcontrol(self) -> None:
        if self._is_process_running("devcontrol"):
            self.log("DevControl is already starting or running from this launcher.")
            return
        if all(is_port_listening(*address) for address in PORTS.values()):
            self.status_var.set("Running")
            self.log("DevControl ports are already running. Not starting a duplicate instance.")
            return

        password_choice = self.ask_control_password()
        if password_choice is None:
            self.log("Start cancelled.")
            return

        self.status_var.set("Starting")
        self.log("Starting DevControl through start.py run...")
        if password_choice:
            env_overrides = {"DEVCONTROL_PASSWORD": password_choice, "DEVCONTROL_SKIP_PASSWORD_PROMPT": ""}
            self.log("Password protection enabled for this launcher session.")
        else:
            env_overrides = {"DEVCONTROL_PASSWORD": "", "DEVCONTROL_SKIP_PASSWORD_PROMPT": "1"}
            self.log("Password protection skipped for this launcher session.")
        self.run_command("devcontrol", [sys.executable, str(START_SCRIPT), "run"], PROJECT_ROOT, keep_ref=True, env_overrides=env_overrides)

    def ask_control_password(self) -> str | None:
        dialog = tk.Toplevel(self)
        dialog.title("Control Password")
        dialog.configure(bg="#f5f7fb")
        dialog.resizable(False, False)
        dialog.transient(self)
        dialog.grab_set()

        result = tk.StringVar(value="")
        password_var = tk.StringVar(value="")
        error_var = tk.StringVar(value="")

        frame = ttk.Frame(dialog, padding=22, style="Card.TFrame")
        frame.grid(row=0, column=0, sticky="nsew")
        frame.columnconfigure(0, weight=1)

        ttk.Label(frame, text="Control Password", style="Section.TLabel").grid(row=0, column=0, sticky="w")
        explanation = "Password protection is optional. Enter a control password or skip to start without one."
        ttk.Label(frame, text=explanation, style="Muted.TLabel", wraplength=390).grid(row=1, column=0, sticky="w", pady=(8, 14))

        password_entry = ttk.Entry(frame, textvariable=password_var, show="*", width=42)
        password_entry.grid(row=2, column=0, sticky="ew")
        ttk.Label(frame, textvariable=error_var, style="Muted.TLabel").grid(row=3, column=0, sticky="w", pady=(7, 0))

        actions = ttk.Frame(frame, style="Card.TFrame")
        actions.grid(row=4, column=0, sticky="e", pady=(18, 0))
        continue_button = ttk.Button(actions, text="Continue", style="Secondary.TButton")
        skip_button = ttk.Button(actions, text="Skip", style="Secondary.TButton")
        skip_button.grid(row=0, column=0, padx=(0, 8))
        continue_button.grid(row=0, column=1)
        continue_button.state(["disabled"])

        def update_continue_state(*_args: object) -> None:
            error_var.set("")
            if password_var.get():
                continue_button.state(["!disabled"])
            else:
                continue_button.state(["disabled"])

        def skip() -> None:
            result.set("__skip__")
            dialog.destroy()

        def continue_with_password() -> None:
            password = password_var.get()
            if len(password) < 8:
                error_var.set("Password must be at least 8 characters long.")
                return
            result.set(password)
            dialog.destroy()

        def cancel() -> None:
            result.set("__cancel__")
            dialog.destroy()

        password_var.trace_add("write", update_continue_state)
        skip_button.configure(command=skip)
        continue_button.configure(command=continue_with_password)
        dialog.protocol("WM_DELETE_WINDOW", cancel)
        dialog.bind("<Escape>", lambda _event: cancel())
        dialog.bind("<Return>", lambda _event: continue_with_password() if password_var.get() else skip())

        dialog.update_idletasks()
        x = self.winfo_rootx() + (self.winfo_width() // 2) - (dialog.winfo_width() // 2)
        y = self.winfo_rooty() + (self.winfo_height() // 2) - (dialog.winfo_height() // 2)
        dialog.geometry(f"+{max(x, 0)}+{max(y, 0)}")
        password_entry.focus_set()
        self.wait_window(dialog)

        choice = result.get()
        if choice == "__skip__":
            return ""
        if choice == "__cancel__":
            return None
        return choice

    def stop_devcontrol(self) -> None:
        self.status_var.set("Stopped")
        self.log("Stopping DevControl through start.py stop...")
        self.run_command("stop", [sys.executable, str(START_SCRIPT), "stop"], PROJECT_ROOT, keep_ref=False)

    def open_dashboard(self) -> None:
        webbrowser.open(DASHBOARD_URL)
        self.log(f"Opened dashboard: {DASHBOARD_URL}")

    def open_github_repo(self) -> None:
        if not self.git_url:
            self.log("No GitHub remote URL detected yet. Run Check Git first.")
            return
        webbrowser.open(self.git_url)
        self.log(f"Opened GitHub remote: {self.git_url}")

    def check_git(self) -> None:
        self.log("Checking Git remote state...")
        self.badge_vars["git"].set("Checking")
        thread = threading.Thread(target=self._check_git_worker, daemon=True)
        thread.start()

    def _check_git_worker(self) -> None:
        try:
            fetch = subprocess.run(["git", "fetch"], cwd=PROJECT_ROOT, text=True, capture_output=True, timeout=60)
            self.log_queue.put(("log", "$ git fetch\n"))
            self._queue_process_output(fetch.stdout)
            self._queue_process_output(fetch.stderr)
            if fetch.returncode != 0:
                self.log_queue.put(("git", "Unknown"))
                self.log_queue.put(("log", "Git fetch failed. Git may be missing, offline, or the repo may have no remote.\n"))
                return

            status = subprocess.run(["git", "status", "-sb"], cwd=PROJECT_ROOT, text=True, capture_output=True, timeout=30)
            self.log_queue.put(("log", "$ git status -sb\n"))
            self._queue_process_output(status.stdout)
            self._queue_process_output(status.stderr)
            if status.returncode != 0:
                self.log_queue.put(("git", "Unknown"))
                return

            self.git_url = self._detect_remote_url()
            state = self._parse_git_status(status.stdout)
            self.log_queue.put(("git", state))
            if self.git_url:
                self.log_queue.put(("github-ready", self.git_url))
        except FileNotFoundError:
            self.log_queue.put(("git", "Unknown"))
            self.log_queue.put(("log", "Git is not installed or is not available on PATH.\n"))
        except subprocess.TimeoutExpired:
            self.log_queue.put(("git", "Unknown"))
            self.log_queue.put(("log", "Git check timed out.\n"))
        except Exception as exc:
            self.log_queue.put(("git", "Unknown"))
            self.log_queue.put(("log", f"Git check failed: {exc}\n"))

    def _detect_remote_url(self) -> str | None:
        result = subprocess.run(["git", "remote", "get-url", "origin"], cwd=PROJECT_ROOT, text=True, capture_output=True, timeout=10)
        if result.returncode != 0:
            return None
        remote = result.stdout.strip()
        if remote.startswith("git@github.com:"):
            return "https://github.com/" + remote.removeprefix("git@github.com:").removesuffix(".git")
        if remote.startswith("https://github.com/"):
            return remote.removesuffix(".git")
        return None

    def _parse_git_status(self, output: str) -> str:
        first_line = output.splitlines()[0] if output.splitlines() else ""
        if "[ahead" in first_line and "behind" in first_line:
            return "Diverged"
        if "[behind" in first_line:
            return "Behind remote"
        if "[ahead" in first_line:
            return "Ahead of remote"
        if first_line.startswith("## "):
            return "Up to date"
        return "Unknown"

    def run_command(
        self,
        key: str,
        command: list[str],
        cwd: Path,
        keep_ref: bool,
        env_overrides: dict[str, str] | None = None,
    ) -> None:
        if self._is_process_running(key):
            self.log(f"Command already running: {key}")
            return

        button = self.command_buttons.get(key)
        if button:
            button.state(["disabled"])
        if key == "devcontrol":
            self.start_button.state(["disabled"])

        thread = threading.Thread(target=self._command_worker, args=(key, command, cwd, keep_ref, env_overrides), daemon=True)
        thread.start()

    def _command_worker(
        self,
        key: str,
        command: list[str],
        cwd: Path,
        keep_ref: bool,
        env_overrides: dict[str, str] | None,
    ) -> None:
        self.log_queue.put(("log", f"$ {' '.join(command)}\n"))
        try:
            child_env = os.environ.copy()
            if env_overrides:
                for env_key, env_value in env_overrides.items():
                    if env_value:
                        child_env[env_key] = env_value
                    else:
                        child_env.pop(env_key, None)

            process = subprocess.Popen(
                command,
                cwd=cwd,
                stdin=None,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                bufsize=1,
                env=child_env,
            )
            if keep_ref:
                self.processes[key] = process

            for line in process.stdout:
                self.log_queue.put(("log", line))

            return_code = process.wait()
            if self.processes.get(key) is process:
                self.processes.pop(key, None)
            self.log_queue.put(("done", f"{key}:{return_code}"))
            self.log_queue.put(("log", f"[launcher] Command finished with exit code {return_code}: {key}\n"))
        except FileNotFoundError as exc:
            self.log_queue.put(("log", f"[launcher] Command not found: {exc}\n"))
            self.log_queue.put(("done", f"{key}:127"))
        except Exception as exc:
            self.log_queue.put(("log", f"[launcher] Command failed: {exc}\n"))
            self.log_queue.put(("done", f"{key}:1"))

    def _is_process_running(self, key: str) -> bool:
        process = self.processes.get(key)
        return bool(process and process.poll() is None)

    def _queue_process_output(self, output: str) -> None:
        if output:
            self.log_queue.put(("log", output if output.endswith("\n") else output + "\n"))

    def _drain_log_queue(self) -> None:
        try:
            while True:
                event, payload = self.log_queue.get_nowait()
                if event == "log":
                    self._write_log(payload)
                elif event == "done":
                    key, _, code = payload.partition(":")
                    self._on_command_done(key, int(code or "0"))
                elif event == "git":
                    self.badge_vars["git"].set(payload)
                elif event == "github-ready":
                    self.git_url = payload
                    self.github_button.state(["!disabled"])
        except queue.Empty:
            pass
        self.after(100, self._drain_log_queue)

    def _on_command_done(self, key: str, return_code: int) -> None:
        button = self.command_buttons.get(key)
        if button:
            button.state(["!disabled"])
        if key == "devcontrol":
            self.start_button.state(["!disabled"])
            if return_code != 0:
                self.status_var.set("Error")
        elif return_code != 0 and key not in {"stop", "advanced-stop"}:
            self.status_var.set("Error")

    def _write_log(self, text: str) -> None:
        stripped = self._strip_ansi(text)
        self.log_text.insert("end", stripped)
        self.log_text.see("end")

    def log(self, text: str) -> None:
        self._write_log(text + "\n")

    def clear_log(self) -> None:
        self.log_text.delete("1.0", "end")

    def _strip_ansi(self, text: str) -> str:
        import re
        ansi_escape = re.compile(r'\x1b\[[0-9;]*[a-zA-Z]')
        return ansi_escape.sub('', text)

    def _refresh_status_loop(self) -> None:
        states = {key: is_port_listening(*address) for key, address in PORTS.items()}
        self.badge_vars["backend"].set("Running" if states["backend"] else "Stopped")
        self.badge_vars["frontend"].set("Running" if states["frontend"] else "Stopped")
        self.badge_vars["terminal"].set("Running" if states["terminal"] else "Stopped")

        if self._is_process_running("devcontrol"):
            self.status_var.set("Starting" if not all(states.values()) else "Running")
        elif all(states.values()):
            self.status_var.set("Running")
        elif not any(states.values()) and self.status_var.get() not in {"Error", "Starting"}:
            self.status_var.set("Stopped")

        self.after(2500, self._refresh_status_loop)

    def on_close(self) -> None:
        running = [key for key, process in self.processes.items() if process.poll() is None]
        if running:
            self.log("Launcher window closed while background commands are still running.")
        self.destroy()


def main() -> int:
    app = DevControlLauncher()
    app.protocol("WM_DELETE_WINDOW", app.on_close)
    app.mainloop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
