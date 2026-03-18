# 🎮 DevControl Dashboard

**Modern Apple-Style System Monitoring & Control Center**

A sleek, modern dashboard that provides essential control over your development environment with Apple-inspired design, real-time system monitoring, port management, process control, and network analysis.

## 🚀 Quick Start

### Prerequisites
- **Python 3.7+** - Backend runtime
- **Node.js 16+** - Frontend development server
- **npm** - Package manager

### One-Command Launch (Recommended)
```bash
python start.py
```

This script will:
- ✅ Check all dependencies (Python, Node.js, npm)
- 📦 Install required packages automatically
- 🚀 Start both backend and frontend servers
- 🌐 Open your dashboard at `http://localhost:3000`

### Admin Commands (Windows)
For system administrator commands like `net sess`, run with elevated privileges:

**Method 1: Batch File (Easiest)**
1. **Right-click `start_admin.bat`** → "Run as administrator"
2. **Dashboard starts automatically** with admin rights

**Method 2: PowerShell (Admin)**
1. **Right-click Start Menu** → "Windows PowerShell (Admin)"
2. **Navigate to project**: `cd path/to/your/devcontrol-dashboard`
3. **Run dashboard**: `python start.py`

### Linux Start
For Linux systems, use the dedicated start script:

**Method 1: Start Script (Recommended)**
```bash
chmod +x scripts/start_linux.sh
./scripts/start_linux.sh
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
├── 🚀 start.py                 # Main launcher script
├── 🔧 start_admin.bat          # Windows admin launcher
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
│   └── 🔧 start_admin.sh       # Unix admin launcher
├── 📁 docs/                    # Documentation
│   └── 🔒 SECURITY.md          # Security documentation
└── 📁 scripts/                 # Setup scripts
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
- Run `start_admin.bat` as administrator
- Right-click → "Run as administrator"

**"Dependencies not found"**
- The `start.py` script installs dependencies automatically
- Make sure Python and Node.js are in your PATH

**Dashboard won't start**
- Check if ports 3000, 8000, or 8003 are occupied
- Run the cleanup script and try again

### Port Cleanup

**Windows:**
```bash
# Double-click or run:
tools\cleanup_ports.bat
```

**macOS/Linux:**
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
- **Local-only access** - No external network connections
- **No data persistence** - No data is stored or transmitted

For detailed security information, see [docs/SECURITY.md](docs/SECURITY.md).

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

### macOS
- ✅ Full support with sudo commands
- ✅ Shell script launchers
- ✅ Terminal compatibility
- ✅ Unix process management

### Linux
- ✅ Full support with sudo commands
- ✅ Shell script launchers
- ✅ Terminal compatibility
- ✅ Unix process management

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
