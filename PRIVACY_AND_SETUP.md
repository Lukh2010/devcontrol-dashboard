# 🔒 Datenschutz & Setup Anleitung

## ⚠️ WICHTIGER HINWEIS ZUR DATENSCHUTZ

Dieses Dashboard zeigt **persönliche Systemdaten** an. Bevor Sie es auf anderen Computern verwenden, beachten Sie:

### **🔍 WAS DAS DASHBOARD ANZEIGT:**
- **System-Informationen**: Hostname, CPU, RAM, Festplatten
- **Laufende Prozesse**: Alle aktiven Programme mit PIDs
- **Offene Ports**: Netzwerk-Verbindungen und Dienste
- **Netzwerk-Interfaces**: IP-Adressen und MAC-Adressen
- **Ausgeführte Befehle**: Komplette Kommando-Historie

### **🚨 DATENSCHUTZ-RISIKEN:**
- **Persönliche Daten**: Username, Computername
- **Netzwerk-Informationen**: IP-Adressen, offene Ports
- **Software-Nutzung**: Welche Programme laufen
- **System-Konfiguration**: Hardware-Details

---

## 🛡️ DATEN ENTFERNEN (VOR TEILEN)

### **1. System-Informationen bereinigen:**
```bash
# In backend/app.py folgende Zeilen anpassen:
@app.route("/api/system/info")
def get_system_info():
    return jsonify({
        "hostname": "DESKTOP-EXAMPLE",  # ⚠️ ÄNDERN!
        "platform": "Windows",
        "cpu_count": 8,  # ⚠️ Beispielwert
        "memory_total": 16777216000,  # ⚠️ Beispielwert
        # ... weitere Werte anpassen
    })
```

### **2. Prozess-Daten anonymisieren:**
```bash
# Prozessnamen filtern oder anonymisieren
def sanitize_process_name(name):
    # Entfernt persönliche Informationen aus Prozessnamen
    sensitive_names = ["lukas", "user", "personal"]
    for sensitive in sensitive_names:
        name = name.replace(sensitive, "user")
    return name
```

### **3. Netzwerk-Daten bereinigen:**
```bash
# IP-Adressen und Hostnames anonymisieren
def sanitize_network_data(data):
    # Ersetzt echte IPs durch Beispiel-IPs
    data["hostname"] = "example-pc"
    # Weitere Anpassungen...
    return data
```

---

## 🌐 CROSS-PLATFORM KOMPATIBILITÄT

### **Windows (Bereits optimiert):**
```bash
# Commands funktionieren auf Windows:
cls, dir, systeminfo, netstat, tasklist
```

### **macOS:**
```bash
# In CommandRunner_Apple.jsx anpassen:
{ name: 'Clear Terminal', command: 'clear' },
{ name: 'List Files', command: 'ls -la' },
{ name: 'Disk Usage', command: 'df -h' },
{ name: 'System Info', command: 'uname -a' },
```

### **Linux:**
```bash
# Ähnlich wie macOS, aber mit Linux-spezifischen Befehlen
{ name: 'Process List', command: 'ps aux' },
{ name: 'System Info', command: 'lscpu' },
```

---

## 🔧 SETUP FÜR ANDERE PC'S

### **1. System-Voraussetzungen prüfen:**
- **Betriebssystem**: Windows 10/11, macOS, Linux
- **Python**: 3.8+ installiert
- **Node.js**: 16+ installiert
- **Ports**: 8000 (Backend), 3001 (Frontend) frei

### **2. Installation:**
```bash
# Repository klonen
git clone https://github.com/Lukh2010/devcontrol-dashboard.git
cd devcontrol-dashboard

# Backend installieren
cd backend
pip install -r requirements.txt

# Frontend installieren
cd ../frontend
npm install

# Starten
# Terminal 1: Backend
cd backend && python app.py

# Terminal 2: Frontend  
cd frontend && npm run dev
```

### **3. Konfiguration anpassen:**
```bash
# Port-Nummern bei Bedarf ändern
# backend/app.py: app.run(port=8000)
# frontend/vite.config.js: server.port = 3001
```

---

## 🚨 SICHERHEITSEMPFEHLUNGEN

### **Backend-Sicherheit:**
```python
# In app.py Sicherheits-Filter verbessern:
DANGEROUS_COMMANDS = [
    'rm -rf', 'format', 'del /f', 'shutdown', 'reboot',
    'net user', 'whoami', 'ipconfig /all',  # ⚠️ Persönliche Daten
    'getmac', 'systeminfo',  # ⚠️ System-Details
]
```

### **Frontend-Sicherheit:**
```javascript
// LocalStorage für sensible Daten verwenden
const SETTINGS_KEY = 'dashboard_settings';
// Keine persönlichen Daten im localStorage speichern
```

---

## 📱 MOBILE GERÄTE

### **Einschränkungen:**
- **Kein Backend-Zugriff** auf mobilen Geräten
- **Nur Demo-Daten** möglich
- **Touch-Optimierung** erforderlich

### **Lösung:**
```javascript
// Mobile Erkennung und Demo-Modus
if (window.innerWidth < 768) {
    // Demo-Daten statt echter API-Aufrufe
    useDemoData = true;
}
```

---

## 🔒 EMPFEHLUNG FÜR ÖFFENTLICHE NUTZUNG

### **1. Demo-Modus implementieren:**
```javascript
// In App_final_fixed.jsx
const [demoMode, setDemoMode] = useState(false);

// Demo-Daten bereitstellen
const demoData = {
    system: { hostname: "Demo-PC", cpu_count: 8 },
    processes: [{ name: "chrome.exe", cpu: 15.2 }],
    ports: [{ port: 80, process: "nginx" }]
};
```

### **2. Lokale Nutzung bevorzugen:**
```bash
# Nur im eigenen Netzwerk verwenden
# Keine öffentliche Freigabe des Backends
```

### **3. Datenschutzerklärung hinzufügen:**
```html
<!-- Im Frontend -->
<div class="privacy-notice">
  <p>⚠️ Dieses Dashboard zeigt lokale Systemdaten an. 
     Nicht in öffentlichen Netzwerken verwenden!</p>
</div>
```

---

## 🎯 FAZIT

### **Für persönliche Nutzung:**
- ✅ Sicher im eigenen Netzwerk
- ✅ Alle Features verfügbar
- ✅ Echtzeit-Daten

### **Für öffentliche Nutzung:**
- ⚠️ Demo-Modus implementieren
- ⚠️ Persönliche Daten entfernen
- ⚠️ Datenschutzerklärung hinzufügen

### **Empfehlung:**
1. **Privates Repository** für persönliche Nutzung
2. **Fork mit Demo-Modus** für öffentliche Nutzung
3. **Docker-Container** für sichere Bereitstellung

---

**🔒 Schützen Sie Ihre Daten und die anderer Nutzer!**
