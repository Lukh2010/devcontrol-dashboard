#!/usr/bin/env python3
"""
Port Cleanup Script for DevControl Dashboard
Kills only dashboard processes using ports 3000, 8000, and 8003
Uses PID-based approach to avoid system-wide process killing
"""

import subprocess
import platform
import sys
import json
import os
from pathlib import Path

# PID file location
PID_FILE = Path.home() / '.devcontrol_pids.json'

def save_pids(pids):
    """Save dashboard PIDs to file"""
    try:
        with open(PID_FILE, 'w') as f:
            json.dump(pids, f)
    except Exception as e:
        print(f"⚠️ Could not save PIDs: {e}")

def load_pids():
    """Load dashboard PIDs from file"""
    try:
        if PID_FILE.exists():
            with open(PID_FILE, 'r') as f:
                return json.load(f)
    except Exception as e:
        print(f"⚠️ Could not load PIDs: {e}")
    return {}

def cleanup_ports():
    """Clean up ports and kill only dashboard processes"""
    
    print("🧹 DevControl Dashboard - Port Cleanup")
    print("=" * 50)
    
    # Load existing PIDs
    dashboard_pids = load_pids()
    
    if platform.system() == 'Windows':
        # Windows cleanup
        ports_to_clean = [3000, 8000, 8003]
        
        for port in ports_to_clean:
            print(f"\n🔍 Checking port {port}...")
            
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
                    killed_any = False
                    
                    for line in lines:
                        if f':{port}' in line and ('LISTENING' in line or 'ESTABLISHED' in line):
                            parts = line.split()
                            if len(parts) >= 5:
                                pid = parts[-1]
                                
                                # Check if this is a dashboard process
                                is_dashboard = (
                                    str(pid) in dashboard_pids.get('backend', []) or
                                    str(pid) in dashboard_pids.get('frontend', []) or
                                    str(pid) in dashboard_pids.get('websocket', [])
                                )
                                
                                if is_dashboard:
                                    try:
                                        subprocess.run(f'taskkill /F /PID {pid}', shell=True, capture_output=True)
                                        print(f"✅ Killed dashboard process {pid} on port {port}")
                                        killed_any = True
                                    except:
                                        print(f"⚠️ Could not kill dashboard process {pid} on port {port}")
                                else:
                                    print(f"⚠️ Skipping non-dashboard process {pid} on port {port}")
                    
                    if not killed_any:
                        print(f"✅ No dashboard processes found on port {port}")
                else:
                    print(f"✅ Port {port} is free")
                    
            except Exception as e:
                print(f"⚠️ Error checking port {port}: {e}")
    
    else:
        # Unix-like systems cleanup (macOS/Linux)
        ports_to_clean = [3000, 8000, 8003]
        
        for port in ports_to_clean:
            print(f"\n🔍 Checking port {port}...")
            
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
                    killed_any = False
                    
                    for pid in pids:
                        # Check if this is a dashboard process
                        is_dashboard = (
                            pid in dashboard_pids.get('backend', []) or
                            pid in dashboard_pids.get('frontend', []) or
                            pid in dashboard_pids.get('websocket', [])
                        )
                        
                        if is_dashboard:
                            try:
                                subprocess.run(f'kill -9 {pid}', shell=True, capture_output=True)
                                print(f"✅ Killed dashboard process {pid} on port {port}")
                                killed_any = True
                            except:
                                print(f"⚠️ Could not kill dashboard process {pid} on port {port}")
                        else:
                            print(f"⚠️ Skipping non-dashboard process {pid} on port {port}")
                    
                    if not killed_any:
                        print(f"✅ No dashboard processes found on port {port}")
                else:
                    print(f"✅ Port {port} is free")
                    
            except Exception as e:
                print(f"⚠️ Error checking port {port}: {e}")
    
    # Clean up PID file
    try:
        if PID_FILE.exists():
            PID_FILE.unlink()
            print("✅ Cleaned up PID file")
    except:
        pass
    
    print("\n✅ Port cleanup completed!")
    print("🚀 Only dashboard processes were killed")
    print("📝 System processes were preserved")

def register_pid(process_type, pid):
    """Register a dashboard process PID"""
    dashboard_pids = load_pids()
    
    if process_type not in dashboard_pids:
        dashboard_pids[process_type] = []
    
    if str(pid) not in dashboard_pids[process_type]:
        dashboard_pids[process_type].append(str(pid))
        save_pids(dashboard_pids)
        print(f"✅ Registered {process_type} process PID: {pid}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == '--register':
        if len(sys.argv) >= 4:
            process_type = sys.argv[2]
            pid = sys.argv[3]
            register_pid(process_type, pid)
        else:
            print("Usage: python cleanup_ports.py --register <process_type> <pid>")
    else:
        try:
            cleanup_ports()
        except KeyboardInterrupt:
            print("\n⚠️ Cleanup interrupted by user")
            sys.exit(1)
        except Exception as e:
            print(f"\n❌ Cleanup failed: {e}")
            sys.exit(1)
