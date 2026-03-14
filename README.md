# 🎮 DevControl Dashboard

**Stable System Monitoring & Control Center**

A reliable dashboard that provides essential control over your development environment with system monitoring, port management, process control, and network analysis.

## 🚀 Quick Start

### Prerequisites
- **Python 3.7+** - Backend runtime
- **Node.js 16+** - Frontend development server
- **npm** - Package manager

### Manual Setup (Recommended)
```bash
# Backend Setup
cd backend
pip install flask flask-cors psutil python-multipart
python app.py

# Frontend Setup (in separate terminal)
cd frontend
npm install
npm run dev
```

### Access Points
- 🌐 **Dashboard**: `http://localhost:3000`
- 🔧 **Backend API**: `http://localhost:8000`
- 📚 **API Documentation**: `http://localhost:8000/docs`

## 🎯 Features

### 🔧 **System Monitor**
- **Real-time CPU & RAM monitoring** with live updates
- **Disk usage tracking** and alerts
- **Performance history** visualization
- **Resource threshold warnings**

### 🌐 **Port Control**
- **Active port scanning** with process identification
- **One-click process termination** (Kill functionality)
- **Service recognition** for common ports
- **Security warnings** for system-critical ports

### ⚡ **Process Monitor**
- **Live process tracking** with CPU/Memory usage
- **Sorting and filtering** capabilities
- **Resource-intensive process alerts**
- **Process status indicators**

### 🖥️ **Command Runner**
- **Custom command library** management
- **Safe command execution** with security filters
- **Command history** with results
- **Real-time output display**

### � **Network Hub**
- **Network interface monitoring**
- **Latency testing** with ping functionality
- **Gateway detection**
- **Connection status indicators**

## 🏗️ Architecture

### Backend (Python Flask)
```
backend/
├── app.py              # Flask application entry point
├── requirements.txt     # Python dependencies
└── api/
    ├── system.py        # System monitoring endpoints
    ├── ports.py         # Port control endpoints
    ├── processes.py     # Process monitoring
    ├── commands.py      # Command execution
    └── network.py       # Network analysis
```

### Frontend (React + Vite)
```
frontend/
├── src/
│   ├── components/      # React components
│   │   ├── SystemMonitor.jsx
│   │   ├── PortControl.jsx
│   │   ├── ProcessMonitor.jsx
│   │   ├── CommandRunner.jsx
│   │   └── NetworkHub.jsx
│   ├── App.jsx         # Main application
│   └── index.css       # Styling
├── package.json        # Node.js dependencies
└── tailwind.config.js  # TailwindCSS configuration
```

## 📡 API Endpoints

### System Information
- `GET /api/system/info` - Basic system details
- `GET /api/system/performance` - Real-time performance data

### Port Management
- `GET /api/ports` - List active ports and processes
- `DELETE /api/port/{port}` - Kill process on specific port

### Process Monitoring
- `GET /api/processes` - List running processes with resource usage

### Command Execution
- `POST /api/commands/run` - Execute custom commands safely

### Network Analysis
- `GET /api/network/info` - Network interface information
- `POST /api/network/ping` - Test host latency

## 🔒 Security Features

### Command Execution Safety
- **Dangerous command detection** and blocking
- **Input sanitization** for all user inputs
- **Timeout protection** for long-running commands
- **Process isolation** for command execution

### Port Control Safety
- **Warning system** for critical system ports
- **Process verification** before termination
- **Logging** of all port control actions

## 🛠️ Configuration

### Environment Variables
```bash
# Backend (optional)
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# Frontend (optional)
VITE_API_URL=http://localhost:8000
```

### Customization
- **Color scheme**: Modify `frontend/src/index.css`
- **Component layout**: Edit `frontend/src/App.jsx`
- **API endpoints**: Update `backend/app.py`
- **Security rules**: Modify command filters in backend

## 📊 Performance Metrics

### System Requirements
- **RAM**: Minimum 512MB free
- **CPU**: Low impact monitoring
- **Disk**: <100MB total storage
- **Network**: Local connections only

### Monitoring Frequency
- **System performance**: Every 2 seconds
- **Port scanning**: Every 5 seconds
- **Process list**: Every 3 seconds
- **Network info**: Every 10 seconds

## 🔧 Troubleshooting

### Common Issues

**Backend won't start**
```bash
# Check Python version
python --version

# Install dependencies manually
cd backend
pip install flask flask-cors psutil python-multipart
```

**Frontend won't start**
```bash
# Check Node.js version
node --version

# Clear npm cache
npm cache clean --force
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Port conflicts**
```bash
# Kill processes on ports 3000 and 8000
# Use the dashboard's Port Control feature
# Or manually:
netstat -ano | findstr :3000
netstat -ano | findstr :8000
```

**Permission errors**
- **Windows**: Run as Administrator
- **Linux/macOS**: Use `sudo` if needed for system commands

## 🚀 Development

### Adding New Features
1. **Backend**: Add new endpoints in `backend/app.py`
2. **Frontend**: Create components in `frontend/src/components/`
3. **Styling**: Use TailwindCSS classes in components
4. **API**: Update API documentation in backend

### Code Style
- **Python**: Follow PEP 8 guidelines
- **JavaScript**: Use ES6+ features
- **CSS**: TailwindCSS utility-first approach
- **Components**: Functional React with hooks

## 🔒 Security Features

### Command Execution Safety
- **Dangerous command detection** and blocking
- **Input sanitization** for all user inputs
- **Timeout protection** for long-running commands
- **Process isolation** for command execution

### Port Control Safety
- **Warning system** for critical system ports
- **Process verification** before termination
- **Logging** of all port control actions

## 🛠️ Configuration

### Environment Variables
```bash
# Backend (optional)
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# Frontend (optional)
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

### Customization
- **Color scheme**: Modify `frontend/src/index.css`
- **Component layout**: Edit `frontend/src/App.jsx`
- **API endpoints**: Update `backend/main.py`
- **Security rules**: Modify command filters in backend

## 📊 Performance Metrics

### System Requirements
- **RAM**: Minimum 512MB free
- **CPU**: Low impact monitoring
- **Disk**: <100MB total storage
- **Network**: Local connections only

### Monitoring Frequency
- **System performance**: Every 2 seconds (WebSocket)
- **Port scanning**: Every 5 seconds
- **Process list**: Every 3 seconds
- **Network info**: Every 10 seconds

## 🔧 Troubleshooting

### Common Issues

**Backend won't start**
```bash
# Check Python version
python --version

# Install dependencies manually
cd backend
pip install -r requirements.txt
```

**Frontend won't start**
```bash
# Check Node.js version
node --version

# Clear npm cache
npm cache clean --force
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Port conflicts**
```bash
# Kill processes on ports 3000 and 8000
# Use the dashboard's Port Control feature
# Or manually:
netstat -ano | findstr :3000
netstat -ano | findstr :8000
```

**Permission errors**
- **Windows**: Run as Administrator
- **Linux/macOS**: Use `sudo` if needed for system commands
- **Docker**: Ensure proper volume mounting

### Debug Mode
```bash
# Backend with debug logging
cd backend
uvicorn main:app --reload --log-level debug

# Frontend with verbose output
cd frontend
npm run dev -- --verbose
```

## 🚀 Development

### Adding New Features
1. **Backend**: Add new endpoints in `backend/main.py`
2. **Frontend**: Create components in `frontend/src/components/`
3. **Styling**: Use TailwindCSS classes in components
4. **API**: Update API documentation in backend

### Code Style
- **Python**: Follow PEP 8 guidelines
- **JavaScript**: Use ES6+ features
- **CSS**: TailwindCSS utility-first approach
- **Components**: Functional React with hooks

### Testing
```bash
# Backend tests (if implemented)
cd backend
python -m pytest

# Frontend tests (if implemented)
cd frontend
npm test
```

## 📝 License

MIT License - Feel free to use, modify, and distribute.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
- **Check the troubleshooting section** above
- **Review API documentation** at `http://localhost:8000/docs`
- **Examine browser console** for frontend errors
- **Check backend logs** for API issues

---

## 🎮 Mission Complete

Your DevControl Dashboard is now ready for deployment! 

**Access Points:**
- 🌐 **Dashboard**: `http://localhost:3000`
- 🔧 **API**: `http://localhost:8000`
- 📚 **Documentation**: `http://localhost:8000/docs`

**Next Steps:**
1. Start backend with `cd backend && python app.py`
2. Start frontend with `cd frontend && npm run dev`
3. Explore all dashboard features
4. Monitor your development environment like a pro!

*Built with precision for developers who demand control.* ⚡
