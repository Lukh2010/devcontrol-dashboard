# 🎯 DevControl Dashboard - Apple Style System Monitor

Ein modernes, Apple-inspiriertes System-Monitoring-Dashboard mit sauberen Weiß-Design, abgerundeten Ecken und voll funktionalen Features.

## 🌟 Hauptfunktionen

### **System Performance**
- Echtzeit-CPU-, Speicher- und Festplattennutzung
- Fortschrittsbalken mit smooth Animationen
- Apple-inspirierte Karten mit modernem Typography

### **Port Control**
- Anzeige aller aktiven Listening-Ports
- Process-Informationen und PIDs
- Kill-Funktionalität für Ports

### **Process Monitor**
- Live Prozess-Überwachung mit CPU- und Speicherauslastung
- Dedupizierte Prozessliste
- Sortierung nach CPU-Auslastung
- Farbliche Kennzeichnung hoher Auslastung

### **Command Runner**
- Windows-kompatible Befehle (cls, dir, systeminfo)
- Befehlsausführungsverlauf
- Benutzerdefinierte Befehle hinzufügen/löschen
- Sicherheits-Filter für gefährliche Befehle

### **Network Hub**
- Netzwerk-Interface-Anzeige
- Ping-Funktionalität
- Verbindungsstatus-Indikatoren

## 🎨 Design

- **Farbschema**: Apple Blau (#007aff), sauberes Weiß, moderne Grautöne
- **Typografie**: System Font Stack
- **Layout**: Abgerundete Ecken (12px), subtile Schatten
- **Responsiv**: Funktioniert auf allen Bildschirmgrößen

## 🚀 Installation & Setup

### **🔧 Automatische Installation (Empfohlen)**

#### **Windows:**
```powershell
# PowerShell als Administrator ausführen
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
iwr -useb https://raw.githubusercontent.com/Lukh2010/devcontrol-dashboard/main/scripts/setup.ps1 | iex
```

#### **macOS/Linux:**
```bash
# Terminal öffnen und ausführen
curl -fsSL https://raw.githubusercontent.com/Lukh2010/devcontrol-dashboard/main/scripts/setup.sh | bash
```

### **📦 Manuelle Installation**

#### **1. Repository klonen:**
```bash
git clone https://github.com/Lukh2010/devcontrol-dashboard.git
cd devcontrol-dashboard
```

#### **2. Backend installieren:**
```bash
cd backend
pip install -r requirements.txt
```

#### **3. Frontend installieren:**
```bash
cd frontend
npm install
```

#### **4. Dashboard starten:**
```bash
# Terminal 1: Backend
cd backend && python app.py

# Terminal 2: Frontend  
cd frontend && npm run dev

# Oder automatisiert:
./scripts/start.sh
```

## 🌐 Cross-Platform Support

### **Windows (Voll unterstützt):**
- ✅ Native PowerShell Setup
- ✅ Windows Service Installation
- ✅ Desktop Shortcut
- ✅ Firewall Konfiguration
- ✅ Auto-Start

### **macOS (Voll unterstützt):**
- ✅ Homebrew Integration
- ✅ macOS App Creation
- ✅ Launchpad Integration
- ✅ Auto-Start

### **Linux (Voll unterstützt):**
- ✅ apt/yum/pacman Support
- ✅ Desktop Integration
- ✅ Systemd Service
- ✅ Auto-Start

## 🔒 Datenschutz & Sicherheit

### **⚠️ WICHTIGER HINWEIS:**
Dieses Dashboard zeigt **echte Systemdaten** an:
- Persönliche Informationen (Username, Computername)
- System-Details (Hardware, Software)
- Netzwerk-Informationen (IP-Adressen, Ports)
- Laufende Prozesse (Programme, PIDs)

### **🛡️ SICHERHEITSEMPFEHLUNGEN:**
- **Nur im vertrauenswürdigen Netzwerk verwenden**
- **Backend nicht öffentlich ins Internet expose**
- **Firewall konfigurieren**
- **Regelmäßige Updates durchführen**

### **📋 Demo-Modus (Für öffentliche Nutzung):**
```bash
# Sicherer Demo-Modus ohne persönliche Daten
python backend/app_demo.py
# Frontend auf App_demo.jsx umstellen
```

## 📋 Projektstruktur

```
devcontrol-dashboard/
├── 📁 backend/
│   ├── app.py                 # Flask Backend mit echten System-Daten
│   ├── app_demo.py            # Demo-Backend (keine persönlichen Daten)
│   └── requirements.txt         # Python-Abhängigkeiten
├── 📁 frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CommandRunner_Apple.jsx    # Apple-styled Command Runner
│   │   │   ├── NetworkHub_Apple.jsx        # Apple-styled Network Hub
│   │   │   └── ProcessMonitor_Apple.jsx   # Apple-styled Process Monitor
│   │   ├── App_final_fixed.jsx              # Hauptkomponente mit echten Daten
│   │   ├── App_demo.jsx                   # Demo-Komponente (sicher)
│   │   └── main.jsx                     # Entry Point
│   ├── package.json
│   └── vite.config.js
├── 📁 scripts/
│   ├── setup.sh              # Linux/macOS Setup
│   ├── setup.ps1             # Windows PowerShell Setup
│   ├── start.sh              # Universal Start-Script
│   ├── update.sh             # Update-Script
│   └── service.ps1           # Windows Service
├── 📁 .github/workflows/
│   ├── ci.yml                # CI/CD Pipeline
│   └── release.yml           # Automated Releases
├── 📄 PRIVACY_AND_SETUP.md   # Datenschutz-Dokumentation
├── 📄 LICENSE               # MIT Lizenz
└── 📄 README.md             # Diese Datei
```

## 🔧 Technologien

### **Backend**
- **Flask** - Python Web-Framework
- **psutil** - System-Informationen
- **flask-cors** - CORS-Handling
- **subprocess** - Command-Ausführung
- **Inline Styles** - Keine CSS-Framework dependencies
- **Apple Design System** - Konsistente Styling

## 🌟 Besondere Features

- **🤖 Automatisierte Setup-Scripts** für alle Plattformen
- **⚡ Lightning-fast Installation** - Ein-Klick Setup
- **🔄 Auto-Update** - Automatische Updates
- **🖥️ System Integration** - Desktop Shortcuts, Services
- **🔒 Demo-Modus** - Sicher für öffentliche Nutzung
- **📱 Responsive Design** - Funktioniert auf allen Geräten
- **🛡️ Sicherheits-Features** - Firewall, Zugriffskontrolle
- **🌐 Cross-Platform** - Windows, macOS, Linux

## 📱 Browser-Unterstützung

- **Chrome**, **Firefox**, **Safari**, **Edge** - Alle modernen Browser unterstützt
- **Mobile Responsive** - Touch-optimierte Bedienelemente

## 🔄 Updates & Wartung

### **Automatische Updates:**
```bash
# Update auf neueste Version
./scripts/update.sh
```

### **Manuelle Updates:**
```bash
git pull origin main
./scripts/setup.sh
```

## 🚀 Deployment

### **Lokale Nutzung:**
```bash
./scripts/start.sh
```

### **Docker (Optional):**
```dockerfile
# Dockerfile kann bei Bedarf hinzugefügt werden
FROM node:18-alpine
# ... Konfiguration
```

### **Cloud Deployment:**
- **GitHub Pages** - Für Demo-Modus
- **Vercel/Netlify** - Für Frontend
- **Heroku/Railway** - Für Backend

## 📞 Support

### **🐛 Bug Reports:**
- [GitHub Issues](https://github.com/Lukh2010/devcontrol-dashboard/issues)

### **💬 Diskussionen:**
- [GitHub Discussions](https://github.com/Lukh2010/devcontrol-dashboard/discussions)

### **📖 Dokumentation:**
- [Privacy & Setup](PRIVACY_AND_SETUP.md)
- [Installation Guide](scripts/setup.sh)
- [Security Notes](PRIVACY_AND_SETUP.md#sicherheit)

## 📊 System-Voraussetzungen

### **Minimum:**
- **Python**: 3.8+
- **Node.js**: 16+
- **RAM**: 4GB+
- **Speicher**: 2GB freier Speicher

### **Empfohlen:**
- **Python**: 3.11+
- **Node.js**: 18+ LTS
- **RAM**: 8GB+
- **Speicher**: 5GB+ freier Speicher

## 📈 Performance

- **Backend-Response**: <100ms
- **Frontend-Build**: <30s
- **CPU-Auslastung**: <5% im Idle
- **Memory-Nutzung**: <200MB

## � Lizenz

MIT License - Freie Verwendung für kommerzielle und private Zwecke

---

## � Quick Start (3 Schritte)

### **1️⃣ Klonen & Setup:**
```bash
git clone https://github.com/Lukh2010/devcontrol-dashboard.git
cd devcontrol-dashboard
# Windows: PowerShell als Administrator
# macOS/Linux: Terminal
./scripts/setup.sh  # oder setup.ps1 für Windows
```

### **2️⃣ Dashboard starten:**
```bash
./scripts/start.sh
# Oder Windows: start_devcontrol.bat
```

### **3️⃣ Browser öffnen:**
**http://localhost:3001**

---

**🚀 Bereit für professionellen Einsatz!**

✅ **Production-Ready** mit automatisierten Setups  
✅ **Cross-Platform** für Windows, macOS, Linux  
✅ **Sicher** mit Datenschutz-Hinweisen  
✅ **Automatisiert** mit CI/CD Pipelines  
✅ **Dokumentiert** mit umfassenden Anleitungen  

**🌟 Das perfekte System-Monitoring-Dashboard!**
