# 🎮 DevControl Dashboard

**Modern Apple-Style System Monitoring & Control Center**

A sleek, modern dashboard that provides essential control over your development environment with Apple-inspired design, real-time system monitoring, port management, process control, and network analysis.

## 🚀 Quick Start

### Prerequisites
- **Python 3.10+** - Backend runtime
- **Node.js 16+** - Frontend development server
- **npm** - Package manager

### Quick Start

Choose your platform-specific script below for the best experience:

#### Windows
```bash
# Run as Administrator for full functionality
tools/start_windows.bat
```

#### Linux
```bash
# Full-featured start script with PID management
./tools/start_linux.sh
```

### Admin Commands (Windows)
For system administrator commands like `net sess`, run with elevated privileges:

**Method 1: Batch File (Easiest)**
1. **Right-click `tools/start_windows.bat`** → "Run as administrator"
2. **Dashboard starts automatically** with admin rights

### Linux Start
For Linux systems, use the dedicated start script:

**Method 1: Start Script (Recommended)**
```bash
chmod +x tools/start_linux.sh
./tools/start_linux.sh
```

This script will:
- ✅ Start backend and frontend in background
- ✅ Save PIDs for clean shutdown
- ✅ Show local network IP for mobile access
- ✅ Open browser automatically

## 📁 Project Structure

```
devcontrol-dashboard/
├── 📄 README.md                 # Main documentation
├── 📁 backend/                 # Flask API server
│   ├── 📄 app.py               # Main Flask application
│   └── 📄 terminal_session.py  # WebSocket terminal handler
├── 📁 frontend/                # React frontend
│   ├── 📁 src/                 # React components
│   ├── 📄 package.json         # Node.js dependencies
│   └── 📄 vite.config.js       # Vite configuration
├── 📁 tools/                   # Utility scripts
│   ├── 🧹 cleanup_ports.bat    # Windows port cleanup
│   ├── 🧹 cleanup_ports.py     # Python port cleanup
│   ├── 🧹 cleanup_ports.sh     # Unix port cleanup
│   ├── 🔧 start_windows.bat     # Windows launcher
│   └── 🔧 start_linux.sh       # Linux launcher
```

## 🌐 Features

### Core Monitoring
- **System Monitor** - CPU, memory, disk usage in real-time
- **Process Monitor** - View and manage running processes
- **Port Control** - Monitor and manage network ports
- **Network Hub** - Network interface information and tools

### Advanced Features
- **Terminal Sessions** - WebSocket-based terminal access
- **Admin Commands** - System administrator commands (Windows)
- **Real-time Updates** - Auto-refreshing data
- **Apple-Style UI** - Modern, clean interface

## 🛠️ Troubleshooting

### Common Issues

**"Port already in use"**
- Run `tools/cleanup_ports.bat` (Windows) or `tools/cleanup_ports.sh` (Unix)
- This will clean up ports 3000, 8000, and 8003

**"Administrator privileges required"**
- Run `tools/start_windows.bat` as administrator
- Right-click → "Run as administrator"

**"Dependencies not found"**
- Install dependencies manually:
  ```bash
  cd backend && pip install -r requirements.txt
  cd frontend && npm install
  ```
- Make sure Python and Node.js are in your PATH

**"Dashboard won't start"**
- Check if ports 3000, 8000, or 8003 are occupied
- Run the cleanup script and try again
- If issues persist, try restarting your system

### Port Cleanup

**Windows:**
```bash
# Double-click or run:
tools\cleanup_ports.bat
```

**Linux:**
```bash
# Make executable and run:
chmod +x tools/cleanup_ports.sh
./tools/cleanup_ports.sh
```

**Python Script (All Platforms):**
```bash
python tools/cleanup_ports.py
```

## 🔒 Security

This dashboard includes comprehensive security measures:
- **Command validation** - Blocks dangerous system commands
- **Input sanitization** - Prevents shell injection attacks
- **Admin privilege checks** - Verifies administrator rights
- **Home network access** - Accessible on LAN, not exposed to internet
- **No data persistence** - No data is stored or transmitted


## 📊 Performance

The dashboard is optimized for performance:
- **Fast CPU measurement** - Global cache updated every second
- **Optimized refresh intervals** - Reduced API call frequency
- **Efficient data processing** - Minimal system impact
- **Lightweight frontend** - Fast loading and responsive UI

## 🎯 Platform Support

### Windows
- ✅ Full support with admin commands
- ✅ Batch file launchers
- ✅ PowerShell compatibility
- ✅ Process management

### Linux
- ✅ Full support with sudo commands
- ✅ Shell script launchers (start_linux.sh)
- ✅ Terminal compatibility
- ✅ Unix process management
- ✅ Mobile access with local IP detection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Flask** - Backend API framework
- **React** - Frontend framework
- **Vite** - Build tool and development server
- **psutil** - System monitoring library
- **Tailwind CSS** - Utility-first CSS framework

## ⚠️ Sicherheit & Datenschutz (Privatnutzung)

Dieses Dashboard ist ausschließlich für den Einsatz im privaten Heimnetz konzipiert. Folgende Sicherheitsaspekte sind bewusst vereinfacht:

### Bekannte offene Punkte
| Risiko | Auswirkung | Empfehlung |
|--------|-----------|------------|
| Keine Authentifizierung | Jeder im Heimnetz kann das Dashboard nutzen | Nur im eigenen WLAN betreiben |
| API bindet auf 0.0.0.0 | Erreichbar von allen Netzwerkgeräten | Kein Port-Forwarding einrichten |
| shell=True für Windows-Befehle | Bei manipuliertem Input möglich Command Injection | Nur vertrauenswürdige Personen ins Netz lassen |
| Keine Rate Limits | Theoretisch DoS aus dem Heimnetz möglich | Irrelevant bei privatem Heimnetz |
| Terminal hat Admin-Rechte | Befehle laufen mit vollen Systemrechten | Dashboard nicht im Büro oder öffentlichem WLAN starten |
| Ping erlaubt private IPs | Netzwerk-Scan im Heimnetz möglich | Gewollt — für Router/NAS-Zugriff |
| Process Kill UI | Prozesse können über UI gekillt werden | Nur mit Admin-Rechten nutzen |

### Was NICHT passieren kann
- ✅ Kein Internetzugriff auf das Dashboard (kein Port-Forwarding)
- ✅ Keine Datenspeicherung oder -übertragung nach außen
- ✅ Keine wirklich destruktiven Befehle (rm -rf /, format) werden ohne Bestätigung ausgeführt
- ✅ Keine system-weiten Prozess-Kills (nur eigene Dashboard-Prozesse)

### Empfohlene Nutzung
- Im privaten Heimnetz mit WPA2/WPA3 WLAN
- Nicht in öffentlichen Netzwerken starten
- Nicht dauerhaft als Dienst/Autostart laufen lassen
- Process Manager nur als Admin verwenden

---

*Built with precision for developers who demand control and style.* 🍎⚡
