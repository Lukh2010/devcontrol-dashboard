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
- 🌐 Open your dashboard at `http://localhost:5173`
- 📊 Monitor server status with graceful shutdown

### Manual Setup (Advanced)
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
- 🌐 **Dashboard**: `http://localhost:5173` (Vite Development Server)
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

### Process Monitor
- **Live process tracking** with CPU/Memory usage
- **Sorting and filtering** capabilities
- **Resource-intensive process alerts**
- **Process status indicators**

### Command Runner
- **Custom command library** management
- **Safe command execution** with security filters
- **Command history** with results
- **Real-time output display**

### Window Terminal
- **Interactive terminal** with real-time WebSocket communication
- **Window-style interface** with macOS-inspired design
- **Command history** with arrow key navigation
- **Copy/Clear/Stop** functionality
- **Sudo protection** for dangerous commands
- **Auto-scroll** and colored output
- **Full-width terminal** experience in browser
- **WebSocket connection** on port 8002 with auto-reconnect

### Network Hub
- Network interface monitoring with detailed IP information
- Advanced latency testing with ping functionality
- Quick target buttons for fast testing
- Gateway detection and hostname display
- Connection status indicators with live updates

## Design System

### Apple-Inspired UI
- Clean, minimal interface with Apple-style aesthetics
- Consistent color palette (#007aff blue, #28ca42 green, #ff5f57 red)
- Modern typography with -apple-system font stack
- Smooth animations and hover effects
- Card-based layout with subtle shadows and borders

### Component Architecture
```
frontend/src/components/
├── SystemMonitor.jsx    # Performance metrics with progress bars
├── PortControl.jsx       # Port management with clean tables
├── ProcessMonitor.jsx    # Process tracking with status indicators
├── WindowTerminal.jsx    # Window-style terminal with WebSocket
└── NetworkHub.jsx        # Network analysis with ping tools
```

## Architecture

### Backend (Python Flask)
```
backend/
├── app.py                    # Flask application with WebSocket server
├── requirements.txt           # Python dependencies
├── terminal_session.py       # Terminal session management
└── WebSocket server on port 8002
```

### Frontend (React + Vite)
```
frontend/
├── src/
│   ├── components/            # React components with inline styles
│   │   ├── SystemMonitor.jsx
│   │   ├── PortControl.jsx
│   │   ├── ProcessMonitor.jsx
│   │   ├── WindowTerminal.jsx
│   │   └── NetworkHub.jsx
│   ├── App.jsx               # Main application with Apple-style design
│   └── index.css             # Modern CSS styling
├── package.json              # Node.js dependencies
└── Vite development server
```

## API Endpoints

### System Information
- GET /api/system/info - Basic system details
- GET /api/system/performance - Real-time performance data
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

### WebSocket Terminal
- `ws://localhost:8003` - Real-time terminal communication
- **Auto-reconnect** functionality on connection loss
- **Session management** with unique session IDs
- **Command filtering** for security protection

## Security Features

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
- **Color scheme**: Modify component inline styles in `frontend/src/components/`
- **Component layout**: Edit `frontend/src/App.jsx`
- **API endpoints**: Update `backend/app.py`
- **Security rules**: Modify command filters in backend
- **Apple-style theme**: Adjust colors and spacing in component styles

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
- **Terminal WebSocket**: Real-time bidirectional communication

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
# Kill processes on ports 5173, 8000, and 8003
# Use the dashboard's Port Control feature
# Or manually:
netstat -ano | findstr :5173
netstat -ano | findstr :8000
netstat -ano | findstr :8003
```

**Terminal WebSocket disconnected**
```bash
# Check if WebSocket server is running on port 8003
netstat -ano | findstr :8003

# If too many connections are stuck, kill old processes
taskkill /F /PID <old_process_id>
taskkill /F /PID <websocket_process_id>

# Then restart backend
python start.py

# Terminal should auto-reconnect with enhanced debugging
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

## 🍎 Mission Complete

Your Apple-Style DevControl Dashboard is now ready for deployment! 

**Access Points:**
- 🌐 **Dashboard**: `http://localhost:3000`
- 🔧 **Backend API**: `http://localhost:8000`
- 📚 **API Documentation**: `http://localhost:8000/docs`
- 💻 **WebSocket Terminal**: `ws://localhost:8003`

**Next Steps:**
1. Launch with `python start.py` (recommended)
2. Or start servers manually as shown above
3. Explore all dashboard features including the Window Terminal
4. Experience the modern Apple-style interface
5. Monitor your development environment like a pro!

**Key Features:**
- ✅ **Apple-inspired design** with clean, modern interface
- ✅ **Real-time WebSocket terminal** with direct command execution
- ✅ **Advanced network monitoring** with ping tools
- ✅ **Comprehensive system monitoring** with optimized performance
- ✅ **Process monitoring** with accurate CPU percentages
- ✅ **Secure command execution** with sudo protection
- ✅ **Terminal WebSocket** on port 8003 with enhanced debugging and auto-reconnect
- ✅ **Optimized refresh rates** for better performance

**Performance Optimizations:**
- ⚡ **System Monitor**: 4-second refresh intervals
- ⚡ **Process Monitor**: 8-second refresh with fast CPU values
- ⚡ **Port Control**: 12-second refresh intervals
- ⚡ **Network Hub**: 20-second refresh intervals
- ⚡ **Fast CPU measurement** without delays
- ⚡ **Optimized API calls** for better performance

*Built with precision for developers who demand control and style.* 🍎⚡
