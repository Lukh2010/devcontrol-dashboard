#!/usr/bin/env python3
"""
DevControl Dashboard - Simple Startup Script
Starts both backend and frontend servers for development
"""

import os
import sys
import subprocess
import time
import signal
import platform
from pathlib import Path

class DevControlStarter:
    def __init__(self):
        self.backend_process = None
        self.frontend_process = None
        self.project_root = Path(__file__).parent
        self.backend_dir = self.project_root / "backend"
        self.frontend_dir = self.project_root / "frontend"
        
    def check_dependencies(self):
        """Check if required dependencies are available"""
        print("[INFO] Checking dependencies...")
        
        # Check Python
        python_version = sys.version_info
        if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 10):
            print("[ERROR] Python 3.10+ is required")
            return False
        print(f"[OK] Python {python_version.major}.{python_version.minor}.{python_version.micro}")
        
        # Check Node.js
        try:
            result = subprocess.run(['node', '--version'], capture_output=True, text=True)
            if result.returncode == 0:
                print(f"[OK] Node.js {result.stdout.strip()}")
            else:
                print("[ERROR] Node.js is not installed")
                return False
        except FileNotFoundError:
            print("[ERROR] Node.js is not installed")
            return False
        
        # Check npm
        npm_cmd = 'npm.cmd' if platform.system() == 'Windows' else 'npm'
        try:
            result = subprocess.run([npm_cmd, '--version'], capture_output=True, text=True)
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
        """Install backend Python dependencies"""
        print("\n[INFO] Installing backend dependencies...")
        
        requirements_file = self.backend_dir / "requirements.txt"
        if not requirements_file.exists():
            print("[ERROR] requirements.txt not found in backend directory")
            return False
        
        try:
            subprocess.run([
                sys.executable, '-m', 'pip', 'install', 
                'flask', 'flask-cors', 'psutil', 'python-multipart'
            ], check=True, cwd=self.backend_dir)
            print("[OK] Backend dependencies installed")
            return True
        except subprocess.CalledProcessError as e:
            print(f"[ERROR] Failed to install backend dependencies: {e}")
            return False
    
    def install_frontend_deps(self):
        """Install frontend Node.js dependencies"""
        print("\n[INFO] Installing frontend dependencies...")
        
        package_json = self.frontend_dir / "package.json"
        if not package_json.exists():
            print("[ERROR] package.json not found in frontend directory")
            return False
        
        node_modules = self.frontend_dir / "node_modules"
        npm_cmd = 'npm.cmd' if platform.system() == 'Windows' else 'npm'
        if not node_modules.exists():
            try:
                subprocess.run([npm_cmd, 'install'], check=True, cwd=self.frontend_dir)
                print("[OK] Frontend dependencies installed")
            except subprocess.CalledProcessError as e:
                print(f"[ERROR] Failed to install frontend dependencies: {e}")
                return False
        else:
            print("[OK] Frontend dependencies already installed")
        
        return True
    
    def start_backend(self):
        """Start the Flask backend server"""
        print("\n[INFO] Starting backend server...")
        
        app_file = self.backend_dir / "app.py"
        if not app_file.exists():
            print("[ERROR] app.py not found in backend directory")
            return False
        
        try:
            self.backend_process = subprocess.Popen(
                [sys.executable, '-m', 'flask', 'run', '--host=0.0.0.0', '--port=8000', '--no-debug'],
                cwd='backend',
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            time.sleep(2)
            if self.backend_process.poll() is None:
                print("[OK] Backend server started on http://localhost:8000")
                print("[OK] WebSocket terminal server started on ws://localhost:8003")
                return True
            else:
                print(f"[ERROR] Backend failed to start with exit code: {self.backend_process.returncode}")
                return False
        except Exception as e:
            print(f"[ERROR] Failed to start backend: {e}")
            return False
    
    def start_frontend(self):
        """Start the React frontend development server"""
        print("\n[INFO] Starting frontend server...")
        
        npm_cmd = 'npm.cmd' if platform.system() == 'Windows' else 'npm'
        try:
            # Start frontend - DON'T capture output to avoid blocking
            self.frontend_process = subprocess.Popen([
                npm_cmd, 'run', 'dev'
            ], cwd=self.frontend_dir)
            
            # Wait a moment and check if it started successfully
            time.sleep(3)
            if self.frontend_process.poll() is None:
                print("[OK] Frontend server started on http://localhost:3000")
                return True
            else:
                print(f"[ERROR] Frontend failed to start with exit code: {self.frontend_process.returncode}")
                return False
        except Exception as e:
            print(f"[ERROR] Failed to start frontend: {e}")
            return False
    
    def monitor_processes(self):
        """Monitor running processes and handle shutdown"""
        print("\nServers are running. Press Ctrl+C to stop all servers.")
        print("Dashboard: http://localhost:3000")
        print("Backend API: http://localhost:8000")
        print("WebSocket Terminal: ws://localhost:8002")
        print("\nReal Terminal ready! Navigate to TERMINAL tab in dashboard.")
        print("\nMonitoring server status...")
        
        try:
            while True:
                time.sleep(5)  # Check every 5 seconds instead of 2
                
                # Simple process check - no output reading to avoid blocking
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
                    
                # Print minimal status every 30 seconds
                if int(time.time()) % 30 == 0:
                    print(f"[OK] All systems operational")
                    
        except KeyboardInterrupt:
            print("\nStopping dashboard...")
            self.kill_dashboard_processes()
            print("Dashboard stopped.")
            import sys
            sys.exit(0)
        except Exception as e:
            print(f"\n[ERROR] Monitor error: {e}")
            self.stop_all()
    
    def stop_all(self):
        """Stop all running processes and clean up ports"""
        print("[STOP] Stopping all servers...")
        
        if self.backend_process:
            try:
                self.backend_process.terminate()
                self.backend_process.wait(timeout=2)
                print("[OK] Backend server stopped")
            except:
                try:
                    self.backend_process.kill()
                    print("[OK] Backend server killed")
                except:
                    print("[WARN] Could not stop backend server")
        
        if self.frontend_process:
            try:
                self.frontend_process.terminate()
                self.frontend_process.wait(timeout=2)
                print("[OK] Frontend server stopped")
            except:
                try:
                    self.frontend_process.kill()
                    print("[OK] Frontend server killed")
                except:
                    print("[WARN] Could not stop frontend server")
        
        print("[OK] All servers stopped")
        # Clean up ports and processes
        self.cleanup_ports()
    
    def kill_dashboard_processes(self):
        """Kill all registered dashboard processes from PID file"""
        import json
        import os
        import signal
        import time
        from pathlib import Path
        
        pid_file = Path.home() / '.devcontrol_pids.json'
        
        if not pid_file.exists():
            print("No PID file found - no registered processes to kill")
            return
        
        try:
            with open(pid_file, 'r') as f:
                pids = json.load(f)
            
            print("Terminating registered dashboard processes...")
            
            for group_name, pid_list in pids.items():
                for pid_str in pid_list:
                    try:
                        pid = int(pid_str)
                        
                        # Try SIGTERM first
                        os.kill(pid, signal.SIGTERM)
                        print(f"Sent SIGTERM to PID {pid} ({group_name})")
                        
                        # Wait up to 5 seconds
                        start_time = time.time()
                        while time.time() - start_time < 5:
                            try:
                                # Check if process still exists
                                os.kill(pid, 0)
                                time.sleep(0.1)
                            except ProcessLookupError:
                                print(f"PID {pid} terminated successfully")
                                break
                        else:
                            # Force kill if still running
                            os.kill(pid, signal.SIGKILL)
                            print(f"Force killed PID {pid} with SIGKILL")
                            
                    except ProcessLookupError:
                        print(f"PID {pid} already terminated")
                    except Exception as e:
                        print(f"Error killing PID {pid}: {e}")
            
            # Remove PID file
            pid_file.unlink()
            print("PID file cleaned up")
            
        except Exception as e:
            print(f"Error during shutdown: {e}")
    
    def cleanup_ports(self):
        """Clean up ports and kill remaining processes"""
        import subprocess
        import platform
        
        print("[CLEAN] Cleaning up ports and processes...")
        
        if platform.system() == 'Windows':
            # Windows cleanup
            ports_to_clean = [3000, 8000, 8003]
            for port in ports_to_clean:
                try:
                    # Find processes using the port
                    result = subprocess.run(
                        f'netstat -ano | findstr :{port}',
                        shell=True,
                        capture_output=True,
                        text=True,
                        timeout=10
                    )
                    
                    if result.stdout.strip():
                        lines = result.stdout.strip().split('\n')
                        for line in lines:
                            if f':{port}' in line and 'LISTENING' in line:
                                parts = line.split()
                                if len(parts) >= 5:
                                    pid = parts[-1]
                                    try:
                                        subprocess.run(f'taskkill /F /PID {pid}', shell=True, capture_output=True)
                                        print(f"[OK] Killed process {pid} on port {port}")
                                    except:
                                        print(f"[WARN] Could not kill process {pid} on port {port}")
                except Exception as e:
                    print(f"[WARN] Error cleaning port {port}: {e}")
        
        else:
            # Unix-like systems cleanup
            ports_to_clean = [3000, 8000, 8003]
            for port in ports_to_clean:
                try:
                    # Find and kill processes using the port
                    result = subprocess.run(
                        f'lsof -ti:{port}',
                        shell=True,
                        capture_output=True,
                        text=True,
                        timeout=10
                    )
                    
                    if result.stdout.strip():
                        pids = result.stdout.strip().split('\n')
                        for pid in pids:
                            try:
                                subprocess.run(f'kill -9 {pid}', shell=True, capture_output=True)
                                print(f"✅ Killed process {pid} on port {port}")
                            except:
                                print(f"[WARN] Could not kill process {pid} on port {port}")
                except Exception as e:
                    print(f"[WARN] Error cleaning port {port}: {e}")
        
        print("[OK] Port cleanup completed")
    
    def run(self):
        """Main execution method"""
        print("DevControl Dashboard - Simple Starter")
        print("=" * 50)
        
        # Check dependencies
        if not self.check_dependencies():
            print("\n[ERROR] Please install missing dependencies and try again")
            return False
        
        # Install dependencies
        if not self.install_backend_deps():
            return False
        
        if not self.install_frontend_deps():
            return False
        
        # Clean up ports before starting
        print("[CLEAN] Cleaning up ports before starting...")
        self.cleanup_ports()
        
        # Start servers
        if not self.start_backend():
            return False
        
        # Give backend time to start
        time.sleep(2)
        
        if not self.start_frontend():
            self.stop_all()
            return False
        
        # Monitor processes
        self.monitor_processes()
        
        return True

def signal_handler(signum, frame):
    """Handle Ctrl+C gracefully"""
    print("\n[INFO] Received interrupt signal, shutting down...")
    starter.kill_dashboard_processes()
    print("Dashboard stopped.")
    sys.exit(0)

def main():
    """Main entry point"""
    # Set up signal handler
    signal.signal(signal.SIGINT, signal_handler)
    
    # Create and run starter
    starter = DevControlStarter()
    success = starter.run()
    
    if success:
        print("\n[OK] DevControl Dashboard stopped successfully")
    else:
        print("\n[ERROR] Failed to start DevControl Dashboard")
        sys.exit(1)

if __name__ == "__main__":
    main()
