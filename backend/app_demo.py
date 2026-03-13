from flask import Flask, jsonify, request
from flask_cors import CORS
import psutil
import platform
import subprocess
import socket
import time

app = Flask(__name__)

# CORS für Demo-Modus - alle Origins erlauben
CORS(app, origins=["*"])

# Demo-Daten (keine persönlichen Informationen!)
DEMO_DATA = {
    "system_info": {
        "hostname": "Demo-PC",
        "platform": "Windows",
        "platform_release": "10",
        "platform_version": "10.0.19045",
        "architecture": "x64",
        "processor": "Intel Core i7-9700K",
        "cpu_count": 8,
        "memory_total": 16777216000,
        "memory_available": 8388608000
    },
    "performance": {
        "cpu_percent": 25.5,
        "memory": {
            "total": 16777216000,
            "available": 8388608000,
            "percent": 50.0,
            "used": 8388608000
        },
        "disk": {
            "total": 500000000000,
            "used": 250000000000,
            "free": 250000000000,
            "percent": 50.0
        }
    },
    "processes": [
        {"pid": 1234, "name": "chrome.exe", "cpu_percent": 15.2, "memory_mb": 512},
        {"pid": 5678, "name": "firefox.exe", "cpu_percent": 12.8, "memory_mb": 384},
        {"pid": 9012, "name": "code.exe", "cpu_percent": 8.5, "memory_mb": 256},
        {"pid": 3456, "name": "node.exe", "cpu_percent": 5.2, "memory_mb": 128},
        {"pid": 7890, "name": "python.exe", "cpu_percent": 3.1, "memory_mb": 64}
    ],
    "ports": [
        {"port": 80, "process_name": "nginx", "pid": 1234},
        {"port": 443, "process_name": "nginx", "pid": 1234},
        {"port": 3000, "process_name": "node", "pid": 5678},
        {"port": 5432, "process_name": "postgres", "pid": 9012},
        {"port": 3306, "process_name": "mysql", "pid": 3456}
    ],
    "network_info": {
        "hostname": "Demo-PC",
        "default_gateway": "192.168.1.1",
        "interfaces": {
            "Ethernet": [
                {"address": "192.168.1.100", "family": "IPv4", "netmask": "255.255.255.0"},
                {"address": "fe80::1", "family": "IPv6", "netmask": None}
            ],
            "Wi-Fi": [
                {"address": "192.168.1.101", "family": "IPv4", "netmask": "255.255.255.0"}
            ]
        }
    }
}

@app.route("/api/system/info")
def get_system_info():
    """Demo System-Informationen (keine persönlichen Daten!)"""
    return jsonify(DEMO_DATA["system_info"])

@app.route("/api/system/performance")
def get_performance():
    """Demo Performance-Daten"""
    # Simuliere leichte Schwankungen
    import random
    demo_perf = DEMO_DATA["performance"].copy()
    demo_perf["cpu_percent"] = round(random.uniform(20, 30), 1)
    demo_perf["memory"]["percent"] = round(random.uniform(45, 55), 1)
    return jsonify(demo_perf)

@app.route("/api/processes")
def get_processes():
    """Demo Prozess-Liste"""
    import random
    demo_processes = DEMO_DATA["processes"].copy()
    # Simuliere CPU-Schwankungen
    for proc in demo_processes:
        proc["cpu_percent"] = round(random.uniform(proc["cpu_percent"] - 2, proc["cpu_percent"] + 2), 1)
    return jsonify(demo_processes)

@app.route("/api/ports")
def get_ports():
    """Demo Port-Liste"""
    return jsonify(DEMO_DATA["ports"])

@app.route("/port/<int:port>", methods=['DELETE'])
def kill_port(port):
    """Demo Port-Kill (nur Simulation)"""
    if port in [80, 443]:  # Schütze wichtige Ports
        return jsonify({"error": "Cannot kill essential system port"}), 400
    
    return jsonify({
        "message": f"Demo: Process on port {port} would be killed",
        "success": True
    })

@app.route("/api/commands/run", methods=['POST'])
def run_command():
    """Demo Command-Ausführung (sichere Befehle nur!)"""
    data = request.get_json()
    command = data.get('command', '')
    name = data.get('name', '')
    
    # Sicherheits-Filter für Demo-Modus
    dangerous_commands = ['rm -rf', 'format', 'del /f', 'shutdown', 'reboot', 'net user']
    if any(dangerous in command.lower() for dangerous in dangerous_commands):
        return jsonify({"error": "Dangerous command blocked in demo mode"}), 400
    
    # Demo-Antworten für häufige Befehle
    demo_responses = {
        'cls': {'success': True, 'stdout': 'Screen cleared (demo)', 'return_code': 0},
        'dir': {'success': True, 'stdout': ' Volume in drive C has no label.\n Directory of C:\\Demo\n', 'return_code': 0},
        'systeminfo': {'success': True, 'stdout': 'Demo System Information\nOS Name: Microsoft Windows 10 Demo\n', 'return_code': 0},
        'python --version': {'success': True, 'stdout': 'Python 3.9.0 (demo)\n', 'return_code': 0},
        'git status': {'success': True, 'stdout': 'On branch main\nnothing to commit, working tree clean (demo)\n', 'return_code': 0},
        'npm install': {'success': True, 'stdout': 'Demo: npm install completed successfully\n', 'return_code': 0}
    }
    
    if command in demo_responses:
        result = demo_responses[command]
        result['command'] = command
        result['name'] = name
        return jsonify(result)
    
    # Standard-Antwort für unbekannte Befehle
    return jsonify({
        "command": command,
        "name": name,
        "success": True,
        "stdout": f"Demo output for: {command}",
        "return_code": 0
    })

@app.route("/api/network/info")
def get_network_info():
    """Demo Netzwerk-Informationen"""
    return jsonify(DEMO_DATA["network_info"])

@app.route("/api/network/ping", methods=['POST'])
def ping_host():
    """Demo Ping-Funktionalität"""
    data = request.get_json()
    target = data.get('target', '')
    
    # Demo-Ping Ergebnisse
    demo_results = {
        'google.com': {'latency': 15, 'success': True},
        'github.com': {'latency': 25, 'success': True},
        'localhost': {'latency': 1, 'success': True}
    }
    
    result = demo_results.get(target, {'latency': 30, 'success': True})
    result['timestamp'] = time.strftime('%H:%M:%S')
    
    return jsonify(result)

@app.route("/health")
def health_check():
    """Health-Check Endpoint"""
    return jsonify({
        "status": "healthy",
        "mode": "demo",
        "timestamp": time.time()
    })

if __name__ == "__main__":
    print("🚀 DevControl Dashboard - DEMO MODE")
    print("⚠️  This is DEMO mode - no personal data is exposed!")
    print("🔒 Safe for public sharing and testing")
    print("🌐 Access at: http://localhost:8000")
    app.run(host="0.0.0.0", port=8000, debug=True)
