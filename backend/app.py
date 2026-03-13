from flask import Flask, jsonify, request
from flask_cors import CORS
import psutil
import socket
import subprocess
import platform
import time

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"])

@app.route("/")
def root():
    return jsonify({"message": "DevControl Dashboard API"})

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
        # Get CPU count once for proper calculation
        cpu_count = psutil.cpu_count()
        processes = []
        
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info', 'status']):
            try:
                pinfo = proc.info
                # Get CPU percentage per process (already normalized by psutil)
                cpu_percent = pinfo['cpu_percent'] or 0
                memory_mb = pinfo['memory_info'].rss / 1024 / 1024 if pinfo['memory_info'] else 0
                
                # Skip System Idle Process and processes with 0 CPU
                if pinfo['name'] and pinfo['name'] != 'System Idle Process' and cpu_percent > 0:
                    processes.append({
                        "pid": pinfo['pid'],
                        "name": pinfo['name'] or 'Unknown',
                        "cpu_percent": round(cpu_percent, 2),
                        "memory_mb": round(memory_mb, 2),
                        "status": pinfo['status']
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        
        # Sort by CPU usage and return top 20
        processes.sort(key=lambda x: x['cpu_percent'], reverse=True)
        return jsonify(processes[:20])
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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
