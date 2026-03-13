#!/usr/bin/env python3
"""
DevControl Dashboard Startup Script
Starts both backend and frontend servers simultaneously
"""

import subprocess
import sys
import os
import time
import signal
import platform
from pathlib import Path

class DevControlLauncher:
    def __init__(self):
        self.processes = []
        self.project_root = Path(__file__).parent
        
    def check_python(self):
        """Check if Python is available"""
        try:
            result = subprocess.run([sys.executable, '--version'], 
                                  capture_output=True, text=True)
            print(f"✓ Python: {result.stdout.strip()}")
            return True
        except:
            print("✗ Python not found")
            return False
    
    def check_node(self):
        """Check if Node.js is available"""
        try:
            result = subprocess.run(['node', '--version'], 
                                  capture_output=True, text=True)
            print(f"✓ Node.js: {result.stdout.strip()}")
            return True
        except:
            print("✗ Node.js not found")
            return False
    
    def check_npm(self):
        """Check if npm is available"""
        try:
            result = subprocess.run(['npm', '--version'], 
                                  capture_output=True, text=True)
            print(f"✓ npm: {result.stdout.strip()}")
            return True
        except:
            print("✗ npm not found")
            return False
    
    def start_backend(self):
        """Start the FastAPI backend server"""
        print("🚀 Starting FastAPI backend...")
        
        backend_dir = self.project_root / 'backend'
        
        # Check if requirements are installed
        requirements_file = backend_dir / 'requirements.txt'
        if requirements_file.exists():
            print("📦 Installing backend dependencies...")
            install_result = subprocess.run([
                sys.executable, '-m', 'pip', 'install', '-r', str(requirements_file)
            ], cwd=backend_dir, capture_output=True, text=True)
            
            if install_result.returncode != 0:
                print(f"⚠️ Backend dependency installation warning: {install_result.stderr}")
        
        # Start the backend server
        backend_process = subprocess.Popen([
            sys.executable, 'app.py'
        ], cwd=backend_dir, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        
        self.processes.append(('backend', backend_process))
        print("✓ Backend server started on http://localhost:8000")
        
        return backend_process
    
    def start_frontend(self):
        """Start the React frontend development server"""
        print("🚀 Starting React frontend...")
        
        frontend_dir = self.project_root / 'frontend'
        
        # Check if node_modules exists
        node_modules = frontend_dir / 'node_modules'
        if not node_modules.exists():
            print("📦 Installing frontend dependencies...")
            install_result = subprocess.run(['npm', 'install'], 
                                          cwd=frontend_dir, 
                                          capture_output=True, text=True)
            
            if install_result.returncode != 0:
                print(f"⚠️ Frontend dependency installation warning: {install_result.stderr}")
        
        # Start the frontend server
        frontend_process = subprocess.Popen(['npm', 'run', 'dev'], 
                                          cwd=frontend_dir, 
                                          stdout=subprocess.PIPE, 
                                          stderr=subprocess.STDOUT, text=True)
        
        self.processes.append(('frontend', frontend_process))
        print("✓ Frontend server started on http://localhost:3000")
        
        return frontend_process
    
    def monitor_processes(self):
        """Monitor the running processes and handle output"""
        print("\n📊 DevControl Dashboard is running!")
        print("🌐 Frontend: http://localhost:3000")
        print("🔧 Backend API: http://localhost:8000")
        print("📚 API Docs: http://localhost:8000/docs")
        print("\nPress Ctrl+C to stop all servers\n")
        
        try:
            while True:
                time.sleep(1)
                
                # Check if any process has died
                for name, process in self.processes:
                    if process.poll() is not None:
                        print(f"⚠️ {name.title()} server has stopped")
                        return False
                        
        except KeyboardInterrupt:
            print("\n🛑 Shutting down servers...")
            self.stop_all()
            return True
    
    def stop_all(self):
        """Stop all running processes"""
        for name, process in self.processes:
            try:
                if platform.system() == 'Windows':
                    process.terminate()
                else:
                    process.terminate()
                process.wait(timeout=5)
                print(f"✓ {name.title()} server stopped")
            except subprocess.TimeoutExpired:
                if platform.system() == 'Windows':
                    process.kill()
                else:
                    process.kill()
                print(f"✗ {name.title()} server forcefully killed")
            except:
                print(f"⚠️ Error stopping {name} server")
    
    def run(self):
        """Main execution method"""
        print("🎮 DevControl Dashboard Launcher")
        print("=" * 40)
        
        # Check dependencies
        print("🔍 Checking dependencies...")
        checks = [
            self.check_python(),
            self.check_node(),
            self.check_npm()
        ]
        
        if not all(checks):
            print("\n❌ Missing required dependencies!")
            print("Please install Python 3.7+ and Node.js 16+")
            return False
        
        print("\n✅ All dependencies found!")
        
        try:
            # Start servers
            self.start_backend()
            time.sleep(2)  # Give backend time to start
            self.start_frontend()
            
            # Monitor and handle shutdown
            return self.monitor_processes()
            
        except Exception as e:
            print(f"❌ Error starting servers: {e}")
            self.stop_all()
            return False

def signal_handler(signum, frame):
    """Handle Ctrl+C gracefully"""
    print("\n🛑 Received interrupt signal")
    launcher.stop_all()
    sys.exit(0)

if __name__ == "__main__":
    launcher = DevControlLauncher()
    
    # Set up signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    if platform.system() != 'Windows':
        signal.signal(signal.SIGTERM, signal_handler)
    
    success = launcher.run()
    
    if success:
        print("🎯 DevControl Dashboard stopped successfully")
    else:
        print("❌ DevControl Dashboard encountered errors")
        sys.exit(1)
