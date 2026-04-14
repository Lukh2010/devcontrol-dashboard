#!/usr/bin/env python3
"""
DevControl Dashboard startup utility.
"""

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

import psutil

PROJECT_ROOT = Path(__file__).resolve().parent
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from dashboard_pids import PID_FILE, is_dashboard_pid, load_dashboard_pids, register_dashboard_pid

starter = None
PORTS_TO_CLEAN = {3000, 8000, 8003}


class DevControlStarter:
    def __init__(self):
        self.backend_process = None
        self.frontend_process = None
        self.project_root = PROJECT_ROOT
        self.backend_dir = self.project_root / "backend"
        self.frontend_dir = self.project_root / "frontend"

    def check_dependencies(self):
        print("[INFO] Checking dependencies...")

        python_version = sys.version_info
        if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 10):
            print("[ERROR] Python 3.10+ is required")
            return False
        print(f"[OK] Python {python_version.major}.{python_version.minor}.{python_version.micro}")

        try:
            result = subprocess.run(["node", "--version"], capture_output=True, text=True)
            if result.returncode == 0:
                print(f"[OK] Node.js {result.stdout.strip()}")
            else:
                print("[ERROR] Node.js is not installed")
                return False
        except FileNotFoundError:
            print("[ERROR] Node.js is not installed")
            return False

        npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
        try:
            result = subprocess.run([npm_cmd, "--version"], capture_output=True, text=True)
            if result.returncode == 0:
                print(f"[OK] npm {result.stdout.strip()}")
            else:
                print("[ERROR] npm is not installed")
                return False
        except FileNotFoundError:
            print("[ERROR] npm is not installed")
            return False

        return True

    def install_backend_deps(self):
        print("\n[INFO] Installing backend dependencies...")

        requirements_file = self.backend_dir / "requirements.txt"
        if not requirements_file.exists():
            print("[ERROR] requirements.txt not found in backend directory")
            return False

        try:
            subprocess.run(
                [sys.executable, "-m", "pip", "install", "-r", str(requirements_file)],
                check=True,
                cwd=self.backend_dir,
            )
            print("[OK] Backend dependencies installed")
            return True
        except subprocess.CalledProcessError as exc:
            print(f"[ERROR] Failed to install backend dependencies: {exc}")
            return False

    def install_frontend_deps(self):
        print("\n[INFO] Installing frontend dependencies...")

        package_json = self.frontend_dir / "package.json"
        if not package_json.exists():
            print("[ERROR] package.json not found in frontend directory")
            return False

        node_modules = self.frontend_dir / "node_modules"
        package_lock = self.frontend_dir / "package-lock.json"
        npm_cmd = "npm.cmd" if os.name == "nt" else "npm"

        if not node_modules.exists():
            try:
                subprocess.run([npm_cmd, "install"], check=True, cwd=self.frontend_dir)
                print("[OK] Frontend dependencies installed")
            except subprocess.CalledProcessError as exc:
                print(f"[ERROR] Failed to install frontend dependencies: {exc}")
                return False
        else:
            install_cmd = [npm_cmd, "ci"] if package_lock.exists() else [npm_cmd, "install"]
            try:
                subprocess.run(
                    [npm_cmd, "ls", "--depth=0"],
                    check=True,
                    cwd=self.frontend_dir,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
                print("[OK] Frontend dependencies already installed")
            except subprocess.CalledProcessError:
                subprocess.run(install_cmd, check=True, cwd=self.frontend_dir)
                print("[OK] Frontend dependencies repaired")

        return True

    def install(self):
        print("DevControl Dashboard - Install")
        print("=" * 50)

        if not self.check_dependencies():
            print("\n[ERROR] Please install missing dependencies and try again")
            return False

        if not self.install_backend_deps():
            return False

        if not self.install_frontend_deps():
            return False

        return True

    def start_backend(self):
        print("\n[INFO] Starting backend server...")

        app_file = self.backend_dir / "app.py"
        if not app_file.exists():
            print("[ERROR] app.py not found in backend directory")
            return False

        try:
            backend_env = os.environ.copy()
            self.backend_process = subprocess.Popen(
                [sys.executable, "app.py"],
                cwd=self.backend_dir,
                env=backend_env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            time.sleep(2)
            if self.backend_process.poll() is None:
                register_dashboard_pid("backend", self.backend_process.pid)
                print("[OK] Backend server started on http://127.0.0.1:8000")
                print("[OK] WebSocket terminal server started on ws://127.0.0.1:8003")
                return True

            print(f"[ERROR] Backend failed to start with exit code: {self.backend_process.returncode}")
            return False
        except Exception as exc:
            print(f"[ERROR] Failed to start backend: {exc}")
            return False

    def start_frontend(self):
        print("\n[INFO] Starting frontend server...")

        npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
        try:
            self.frontend_process = subprocess.Popen([npm_cmd, "run", "dev"], cwd=self.frontend_dir)
            time.sleep(3)
            if self.frontend_process.poll() is None:
                register_dashboard_pid("frontend", self.frontend_process.pid)
                print("[OK] Frontend server started on http://localhost:3000")
                return True

            print(f"[ERROR] Frontend failed to start with exit code: {self.frontend_process.returncode}")
            return False
        except Exception as exc:
            print(f"[ERROR] Failed to start frontend: {exc}")
            return False

    def monitor_processes(self):
        print("\nServers are running. Press Ctrl+C to stop all servers.")
        print("Dashboard: http://localhost:3000")
        print("Backend API: http://127.0.0.1:8000")
        print("WebSocket Terminal: ws://127.0.0.1:8003")
        print("\nMonitoring server status...")

        try:
            while True:
                time.sleep(5)

                backend_running = self.backend_process and self.backend_process.poll() is None
                frontend_running = self.frontend_process and self.frontend_process.poll() is None

                if not backend_running:
                    print("[ERROR] Backend server stopped unexpectedly")
                    self.stop_all()
                    break

                if not frontend_running:
                    print("[ERROR] Frontend server stopped unexpectedly")
                    self.stop_all()
                    break

                if int(time.time()) % 30 == 0:
                    print("[OK] All systems operational")

        except KeyboardInterrupt:
            print("\nStopping dashboard...")
            self.kill_dashboard_processes()
            print("Dashboard stopped.")
            sys.exit(0)
        except Exception as exc:
            print(f"\n[ERROR] Monitor error: {exc}")
            self.stop_all()

    def stop_all(self):
        print("[STOP] Stopping all servers...")

        if self.backend_process:
            try:
                self.backend_process.terminate()
                self.backend_process.wait(timeout=2)
                print("[OK] Backend server stopped")
            except Exception:
                try:
                    self.backend_process.kill()
                    print("[OK] Backend server killed")
                except Exception:
                    print("[WARN] Could not stop backend server")

        if self.frontend_process:
            try:
                self.frontend_process.terminate()
                self.frontend_process.wait(timeout=2)
                print("[OK] Frontend server stopped")
            except Exception:
                try:
                    self.frontend_process.kill()
                    print("[OK] Frontend server killed")
                except Exception:
                    print("[WARN] Could not stop frontend server")

        print("[OK] All servers stopped")
        self.cleanup_ports()

    def _terminate_pid(self, pid: int, group_name: str | None = None):
        label = f"{pid} ({group_name})" if group_name else str(pid)

        if os.name == "nt":
            result = subprocess.run(
                ["taskkill", "/T", "/F", "/PID", str(pid)],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                print(f"Terminated PID {label}")
            else:
                print(f"PID {label} was not terminated cleanly: {result.stderr.strip() or result.stdout.strip()}")
            return

        os.kill(pid, signal.SIGTERM)
        start_time = time.time()
        while time.time() - start_time < 5:
            try:
                os.kill(pid, 0)
                time.sleep(0.1)
            except ProcessLookupError:
                print(f"PID {label} terminated successfully")
                return
        os.kill(pid, signal.SIGKILL)
        print(f"Force killed PID {label} with SIGKILL")

    def kill_dashboard_processes(self):
        dashboard_pids = load_dashboard_pids()
        if not dashboard_pids:
            print("No PID file found - no registered processes to kill")
            return

        print("Terminating registered dashboard processes...")

        for group_name, pid_list in dashboard_pids.items():
            for pid_str in pid_list:
                try:
                    pid = int(pid_str)
                    if not is_dashboard_pid(pid):
                        print(f"Skipping unregistered PID {pid}")
                        continue
                    self._terminate_pid(pid, group_name)
                except ProcessLookupError:
                    print(f"PID {pid_str} already terminated")
                except Exception as exc:
                    print(f"Error killing PID {pid_str}: {exc}")

        try:
            if PID_FILE.exists():
                PID_FILE.unlink()
                print("PID file cleaned up")
        except Exception as exc:
            print(f"Error during shutdown: {exc}")

    def cleanup_ports(self):
        print("[CLEAN] Cleaning up ports and processes...")

        matching_pids = set()
        for connection in psutil.net_connections():
            if connection.status not in {"LISTEN", "ESTABLISHED"}:
                continue
            if not connection.laddr or connection.laddr.port not in PORTS_TO_CLEAN:
                continue
            if not connection.pid:
                continue
            if is_dashboard_pid(connection.pid):
                matching_pids.add(connection.pid)
            else:
                print(f"[WARN] Skipping non-dashboard PID {connection.pid} on port {connection.laddr.port}")

        for pid in sorted(matching_pids):
            try:
                self._terminate_pid(pid)
            except Exception as exc:
                print(f"[WARN] Could not stop dashboard PID {pid}: {exc}")

        print("[OK] Port cleanup completed")

    def run(self):
        print("DevControl Dashboard - Run")
        print("=" * 50)

        if not self.install():
            return False

        print("[CLEAN] Cleaning up ports before starting...")
        self.cleanup_ports()

        if not self.start_backend():
            return False

        time.sleep(2)

        if not self.start_frontend():
            self.stop_all()
            return False

        self.monitor_processes()
        return True


def signal_handler(signum, frame):
    print("\n[INFO] Received interrupt signal, shutting down...")
    if starter:
        starter.kill_dashboard_processes()
    print("Dashboard stopped.")
    sys.exit(0)


def prompt_for_password():
    existing_password = os.environ.get("DEVCONTROL_PASSWORD", "").strip()
    if existing_password:
        print("[OK] Using DEVCONTROL_PASSWORD from environment")
        return

    print("[SECURITY] Password protection for terminal and protected actions is optional.")
    while True:
        use_password = input("Use control password? (y/n): ").strip().lower()
        if use_password in ("y", "yes"):
            while True:
                password = input("Enter control password (min. 8 chars): ").strip()
                if len(password) < 8:
                    print("[ERROR] Password must be at least 8 characters long")
                    continue

                confirm_password = input("Confirm control password: ").strip()
                if password != confirm_password:
                    print("[ERROR] Passwords do not match")
                    continue

                os.environ["DEVCONTROL_PASSWORD"] = password
                print("[OK] Control password configured")
                return

        if use_password in ("n", "no"):
            os.environ.pop("DEVCONTROL_PASSWORD", None)
            print("[WARN] Password protection disabled")
            return

        print("[ERROR] Please answer with y or n")


def main():
    global starter
    signal.signal(signal.SIGINT, signal_handler)

    command = sys.argv[1].lower() if len(sys.argv) > 1 else "run"
    starter = DevControlStarter()

    if command == "install":
        success = starter.install()
    elif command == "run":
        prompt_for_password()
        success = starter.run()
    elif command == "stop":
        starter.kill_dashboard_processes()
        success = True
    else:
        print("Usage: python start.py [install|run|stop]")
        sys.exit(1)

    if success:
        print("\n[OK] Command completed successfully")
    else:
        print("\n[ERROR] Command failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
