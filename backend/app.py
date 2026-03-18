from flask import Flask, jsonify, request
from flask_cors import CORS
import psutil
import socket
import subprocess
import platform
import time
import asyncio
import websockets
import json
import threading
import os
from terminal_session import TerminalSessionManager

app = Flask(__name__)
CORS(app, origins="*")

# Terminal session manager
terminal_manager = TerminalSessionManager()

# Global CPU measurement cache
cpu_cache = {}
last_cpu_update = 0

def update_cpu_cache():
    """Update global CPU measurement cache"""
    global cpu_cache, last_cpu_update
    import time
    
    current_time = time.time()
    if current_time - last_cpu_update < 1.0:  # Update every 1 second
        return
    
    try:
        # Initialize CPU measurement
        psutil.cpu_percent(interval=0.1)
        
        # Get CPU for all processes
        new_cache = {}
        for proc in psutil.process_iter(['pid']):
            try:
                cpu_percent = proc.cpu_percent()
                new_cache[proc.pid] = cpu_percent
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                new_cache[proc.pid] = 0
        
        cpu_cache = new_cache
        last_cpu_update = current_time
    except Exception as e:
        print(f"Error updating CPU cache: {e}")

# WebSocket server
async def handle_websocket(websocket, path):
    """Handle WebSocket connections for terminal sessions"""
    try:
        session_id = await terminal_manager.create_session(websocket)
        
        async for message in websocket:
            try:
                data = json.loads(message)
                await terminal_manager.handle_message(session_id, data)
            except json.JSONDecodeError:
                await websocket.send(json.dumps({
                    'type': 'error',
                    'message': 'Invalid JSON message'
                }))
            except Exception as e:
                await websocket.send(json.dumps({
                    'type': 'error',
                    'message': f'Error handling message: {str(e)}'
                }))
                
    except websockets.exceptions.ConnectionClosed:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        if 'session_id' in locals():
            await terminal_manager.close_session(session_id)

def start_websocket_server():
    """Start WebSocket server in a separate thread"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        start_server = websockets.serve(handle_websocket, "0.0.0.0", 8003)
        loop.run_until_complete(start_server)
        print("WebSocket terminal server started on ws://localhost:8003")
        loop.run_forever()
    except OSError as e:
        if "address already in use" in str(e).lower() or "10048" in str(e):
            print("WebSocket port 8003 already in use, continuing without WebSocket terminal...")
        else:
            raise e

# Start WebSocket server in background thread only if not already running
import threading
import time

def start_websocket_if_not_running():
    """Start WebSocket server only if not already running"""
    # Check if port 8003 is already in use by our own process
    try:
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('localhost', 8003))
        sock.close()
        
        if result == 0:
            # Port is already in use, don't start another WebSocket server
            print("WebSocket server already running, skipping...")
            return
        
        # Port is free, start WebSocket server
        websocket_thread = threading.Thread(target=start_websocket_server, daemon=True)
        websocket_thread.start()
        print("WebSocket server thread started")
        
    except Exception as e:
        print(f"Error checking WebSocket port: {e}")
        # Try to start anyway
        websocket_thread = threading.Thread(target=start_websocket_server, daemon=True)
        websocket_thread.start()

# Start WebSocket server with delay to avoid conflicts
timer = threading.Timer(2.0, start_websocket_if_not_running)
timer.start()

@app.route("/")
def root():
    return jsonify({"message": "DevControl Dashboard API"})

@app.route("/docs")
def api_docs():
    """API Documentation endpoint"""
    docs = {
        "title": "DevControl Dashboard API",
        "version": "1.0.0",
        "description": "REST API for DevControl Dashboard",
        "endpoints": {
            "/": "API Root - Returns API information",
            "/docs": "This API documentation",
            "/api/system/info": "Get system information (CPU, memory, platform)",
            "/api/system/performance": "Get real-time performance metrics",
            "/api/processes": "Get running processes with CPU and memory usage",
            "/api/ports": "Get active network ports and listening services",
            "/api/network/info": "Get network interface information",
            "/api/network/ping": "Ping a host (POST with hostname)",
            "/api/commands/run": "Execute system command (POST with command)"
        },
        "methods": {
            "GET": "Retrieve data",
            "POST": "Submit data/execute commands"
        },
        "examples": {
            "ping_command": {
                "url": "/api/network/ping",
                "method": "POST",
                "body": {"hostname": "google.com"}
            },
            "run_command": {
                "url": "/api/commands/run", 
                "method": "POST",
                "body": {"command": "dir", "name": "List Directory"}
            }
        }
    }
    return jsonify(docs)

@app.route("/api/system/info")
def get_system_info():
    """Get basic system information"""
    try:
        system_info = {
            "platform": platform.system(),
            "platform_release": platform.release(),
            "platform_version": platform.version(),
            "architecture": platform.machine(),
            "hostname": socket.gethostname(),
            "processor": platform.processor(),
            "cpu_count": psutil.cpu_count(),
            "memory_total": psutil.virtual_memory().total,
            "memory_available": psutil.virtual_memory().available
        }
        return jsonify(system_info)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/system/performance")
def get_system_performance():
    """Get real-time system performance data"""
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        performance_data = {
            "cpu_percent": cpu_percent,
            "cpu_count": psutil.cpu_count(),
            "memory": {
                "total": memory.total,
                "available": memory.available,
                "percent": memory.percent,
                "used": memory.used,
                "free": memory.free
            },
            "disk": {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": (disk.used / disk.total) * 100
            },
            "timestamp": time.time()
        }
        return jsonify(performance_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/processes")
def get_processes():
    """Get running processes with CPU and memory usage"""
    try:
        # Update CPU cache if needed
        update_cpu_cache()
        
        processes = []
        
        # Get all processes with their info
        for proc in psutil.process_iter(['pid', 'name', 'memory_info', 'status']):
            try:
                pinfo = proc.info
                
                # Get CPU from cache
                cpu_percent = cpu_cache.get(proc.pid, 0)
                memory_mb = pinfo['memory_info'].rss / 1024 / 1024 if pinfo['memory_info'] else 0
                
                # Skip System Idle Process
                if pinfo['name'] and pinfo['name'] != 'System Idle Process':
                    processes.append({
                        "pid": pinfo['pid'],
                        "name": pinfo['name'] or 'Unknown',
                        "cpu_percent": round(cpu_percent, 2),
                        "memory_mb": round(memory_mb, 2),
                        "status": pinfo['status']
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        
        # Sort by CPU usage and return top 15
        processes.sort(key=lambda x: x['cpu_percent'], reverse=True)
        return jsonify(processes[:15])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/ports")
def get_ports():
    """Get all active network connections and their associated processes"""
    try:
        connections = []
        for conn in psutil.net_connections():
            if conn.status == 'LISTEN':
                try:
                    process = psutil.Process(conn.pid) if conn.pid else None
                    if process:
                        connections.append({
                            "port": conn.laddr.port,
                            "process_name": process.name(),
                            "pid": conn.pid,
                            "status": conn.status
                        })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        
        # Sort by port number
        connections.sort(key=lambda x: x['port'])
        return jsonify(connections)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/port/<int:port>", methods=['DELETE'])
def kill_process_by_port(port):
    """Kill process using the specified port"""
    try:
        for conn in psutil.net_connections():
            if conn.status == 'LISTEN' and conn.laddr.port == port:
                try:
                    process = psutil.Process(conn.pid)
                    process.terminate()
                    return jsonify({"message": f"Process {process.name()} (PID: {conn.pid}) terminated successfully"})
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    return jsonify({"error": f"Cannot terminate process on port {port}"}), 403
        
        return jsonify({"error": f"No process found using port {port}"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/commands/run", methods=['POST'])
def run_command():
    """Execute a custom command"""
    try:
        data = request.get_json()
        command = data.get('command', '')
        name = data.get('name', '')
        
        # Security: Prevent dangerous commands
        dangerous_commands = ['rm -rf', 'format', 'del /f', 'shutdown', 'reboot']
        if any(dangerous in command.lower() for dangerous in dangerous_commands):
            return jsonify({"error": "Dangerous command detected"}), 400
        
        import shlex
        
        # Execute command safely
        if platform.system() == 'Windows':
            # On Windows, use shell=True for built-in commands but validate input
            if any(cmd in command.lower() for cmd in ['del', 'rmdir', 'format', 'shutdown']):
                return jsonify({"error": "Dangerous command blocked for security"}), 403
            
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )
        else:
            # On Unix-like systems, avoid shell=True
            try:
                args = shlex.split(command)
                result = subprocess.run(
                    args,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
            except ValueError:
                # Fallback for complex commands
                result = subprocess.run(
                    command,
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
        
        return jsonify({
            "command": command,
            "name": name,
            "return_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "success": result.returncode == 0
        })
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Command execution timed out"}), 408
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/network/info")
def get_network_info():
    """Get network interface information"""
    try:
        network_info = {}
        for interface, addrs in psutil.net_if_addrs().items():
            network_info[interface] = []
            for addr in addrs:
                if addr.family == socket.AF_INET:
                    network_info[interface].append({
                        "family": "IPv4",
                        "address": addr.address,
                        "netmask": addr.netmask,
                        "broadcast": addr.broadcast
                    })
                elif addr.family == socket.AF_INET6:
                    network_info[interface].append({
                        "family": "IPv6",
                        "address": addr.address,
                        "netmask": addr.netmask
                    })
        
        # Get default gateway
        default_gateway = "Unknown"
        
        # Try to get default gateway on Windows
        if platform.system() == "Windows":
            try:
                result = subprocess.run("ipconfig", capture_output=True, text=True)
                lines = result.stdout.split('\n')
                for line in lines:
                    if "Default Gateway" in line:
                        gateway = line.split(":")[-1].strip()
                        if gateway:
                            default_gateway = gateway
                            break
            except:
                pass
        
        return jsonify({
            "interfaces": network_info,
            "default_gateway": default_gateway,
            "hostname": socket.gethostname()
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/network/ping", methods=['POST'])
def ping_host():
    """Ping a host to check latency"""
    try:
        data = request.get_json()
        host = data.get('host', '')
        param = '-n' if platform.system().lower() == 'windows' else '-c'
        command = ['ping', param, '4', host]
        
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            # Parse ping results
            output_lines = result.stdout.split('\n')
            latency_info = {}
            
            for line in output_lines:
                if "time=" in line.lower() or "zeit=" in line.lower():
                    # Extract latency from ping output
                    if "time=" in line:
                        time_part = line.split("time=")[1].split()[0]
                    else:  # German Windows
                        time_part = line.split("Zeit=")[1].split()[0]
                    
                    try:
                        latency_ms = float(time_part.replace("ms", ""))
                        latency_info = {
                            "host": host,
                            "success": True,
                            "latency_ms": latency_ms,
                            "output": result.stdout
                        }
                        break
                    except:
                        continue
            
            if not latency_info:
                latency_info = {
                    "host": host,
                    "success": True,
                    "output": result.stdout
                }
        else:
            latency_info = {
                "host": host,
                "success": False,
                "error": result.stderr,
                "output": result.stdout
            }
        
        return jsonify(latency_info)
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Ping request timed out"}), 408
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/processes/<int:pid>/kill", methods=["POST"])
def kill_process(pid):
    """Kill a specific process (admin only)"""
    try:
        # Check admin privileges on Windows
        if platform.system() == 'Windows':
            try:
                import ctypes
                is_admin = ctypes.windll.shell32.IsUserAnAdmin() != 0
                if not is_admin:
                    return jsonify({
                        "error": "Administrator privileges required",
                        "message": "Please run the dashboard as Administrator"
                    }), 403
            except:
                return jsonify({
                    "error": "Could not verify admin privileges",
                    "message": "Please run the dashboard as Administrator"
                }), 403
        
        # Get process info before killing
        try:
            process = psutil.Process(pid)
            process_name = process.name()
        except psutil.NoSuchProcess:
            return jsonify({"error": f"Process {pid} not found"}), 404
        
        # Load dashboard PIDs to check if this is a dashboard process
        from pathlib import Path
        import json
        
        pid_file = Path.home() / '.devcontrol_pids.json'
        dashboard_pids = {}
        
        if pid_file.exists():
            try:
                with open(pid_file, 'r') as f:
                    dashboard_pids = json.load(f)
            except:
                pass
        
        # Check if this PID belongs to dashboard
        is_dashboard_process = (
            str(pid) in dashboard_pids.get('backend', []) or
            str(pid) in dashboard_pids.get('frontend', []) or
            str(pid) in dashboard_pids.get('websocket', [])
        )
        
        # Allow killing dashboard processes or admin can kill any process
        if not is_dashboard_process and platform.system() != 'Windows':
            return jsonify({
                "error": "Can only kill dashboard processes",
                "message": f"Process {pid} ({process_name}) is not a dashboard process"
            }), 403
        
        # Kill the process
        process.terminate()
        
        # Wait a bit and force kill if still running
        try:
            process.wait(timeout=3)
        except psutil.TimeoutExpired:
            process.kill()
        
        return jsonify({
            "success": True,
            "message": f"Process {pid} ({process_name}) killed successfully",
            "pid": pid,
            "name": process_name
        })
        
    except psutil.NoSuchProcess:
        return jsonify({"error": f"Process {pid} not found"}), 404
    except psutil.AccessDenied:
        return jsonify({"error": f"Access denied to process {pid}"}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/system/is-admin")
def is_admin():
    """Check if current user has administrator privileges"""
    try:
        if platform.system() == 'Windows':
            try:
                import ctypes
                is_admin = ctypes.windll.shell32.IsUserAnAdmin() != 0
                return jsonify({
                    "is_admin": is_admin,
                    "platform": platform.system()
                })
            except Exception as e:
                return jsonify({
                    "is_admin": False,
                    "platform": platform.system(),
                    "error": str(e)
                })
        else:
            # Unix-like systems - check if running as root
            return jsonify({
                "is_admin": os.geteuid() == 0 if hasattr(os, 'geteuid') else False,
                "platform": platform.system()
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=False)
