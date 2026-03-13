from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psutil
import socket
import subprocess
import platform
import time

app = FastAPI(title="DevControl Dashboard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "DevControl Dashboard API"}

@app.get("/api/system/info")
async def get_system_info():
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
        return system_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/system/performance")
async def get_system_performance():
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
        return performance_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/processes")
async def get_processes():
    """Get running processes with CPU and memory usage"""
    try:
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info', 'status']):
            try:
                pinfo = proc.info
                memory_mb = pinfo['memory_info'].rss / 1024 / 1024 if pinfo['memory_info'] else 0
                processes.append({
                    "pid": pinfo['pid'],
                    "name": pinfo['name'] or 'Unknown',
                    "cpu_percent": pinfo['cpu_percent'] or 0,
                    "memory_mb": round(memory_mb, 2),
                    "status": pinfo['status']
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        
        # Sort by CPU usage and return top 50
        processes.sort(key=lambda x: x['cpu_percent'], reverse=True)
        return processes[:50]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ports")
async def get_ports():
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
        return connections
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/port/{port}")
async def kill_process_by_port(port: int):
    """Kill process using the specified port"""
    try:
        for conn in psutil.net_connections():
            if conn.status == 'LISTEN' and conn.laddr.port == port:
                try:
                    process = psutil.Process(conn.pid)
                    process.terminate()
                    return {"message": f"Process {process.name()} (PID: {conn.pid}) terminated successfully"}
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    raise HTTPException(status_code=403, detail=f"Cannot terminate process on port {port}")
        
        raise HTTPException(status_code=404, detail=f"No process found using port {port}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/commands/run")
async def run_command(request: dict):
    """Execute a custom command"""
    try:
        command = request.get('command', '')
        name = request.get('name', '')
        
        # Security: Prevent dangerous commands
        dangerous_commands = ['rm -rf', 'format', 'del /f', 'shutdown', 'reboot']
        if any(dangerous in command.lower() for dangerous in dangerous_commands):
            raise HTTPException(status_code=400, detail="Dangerous command detected")
        
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        return {
            "command": command,
            "name": name,
            "return_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "success": result.returncode == 0
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Command execution timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/network/info")
async def get_network_info():
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
        
        return {
            "interfaces": network_info,
            "default_gateway": default_gateway,
            "hostname": socket.gethostname()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/network/ping")
async def ping_host(request: dict):
    """Ping a host to check latency"""
    try:
        host = request.get('host', '')
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
        
        return latency_info
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Ping request timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
