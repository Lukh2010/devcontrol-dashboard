#!/usr/bin/env python3
"""
Port Cleanup Script for DevControl Dashboard
Kills all processes using ports 3000, 8000, and 8003
"""

import subprocess
import platform
import sys

def cleanup_ports():
    """Clean up ports and kill remaining processes"""
    
    print("🧹 DevControl Dashboard - Port Cleanup")
    print("=" * 50)
    
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
                                try:
                                    subprocess.run(f'taskkill /F /PID {pid}', shell=True, capture_output=True)
                                    print(f"✅ Killed process {pid} on port {port}")
                                    killed_any = True
                                except:
                                    print(f"⚠️ Could not kill process {pid} on port {port}")
                    
                    if not killed_any:
                        print(f"✅ No processes found on port {port}")
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
                        try:
                            subprocess.run(f'kill -9 {pid}', shell=True, capture_output=True)
                            print(f"✅ Killed process {pid} on port {port}")
                            killed_any = True
                        except:
                            print(f"⚠️ Could not kill process {pid} on port {port}")
                    
                    if not killed_any:
                        print(f"✅ No processes found on port {port}")
                else:
                    print(f"✅ Port {port} is free")
                    
            except Exception as e:
                print(f"⚠️ Error checking port {port}: {e}")
    
    print("\n✅ Port cleanup completed!")
    print("🚀 You can now restart the dashboard with: python start.py")

if __name__ == "__main__":
    try:
        cleanup_ports()
    except KeyboardInterrupt:
        print("\n⚠️ Cleanup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Cleanup failed: {e}")
        sys.exit(1)
