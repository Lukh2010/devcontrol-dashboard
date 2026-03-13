#!/bin/bash

# DevControl Dashboard - Automated Setup Script
# Supports: Windows (WSL), macOS, Linux

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect operating system
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Install Python dependencies
install_python_deps() {
    print_status "Installing Python dependencies..."
    
    if command_exists pip3; then
        pip3 install -r backend/requirements.txt
    elif command_exists pip; then
        pip install -r backend/requirements.txt
    else
        print_error "pip not found. Please install Python first."
        exit 1
    fi
}

# Install Node.js dependencies
install_node_deps() {
    print_status "Installing Node.js dependencies..."
    
    if command_exists npm; then
        cd frontend
        npm install
        cd ..
    else
        print_error "npm not found. Please install Node.js first."
        exit 1
    fi
}

# Setup for Linux
setup_linux() {
    print_header "Setting up DevControl Dashboard for Linux"
    
    # Check dependencies
    if ! command_exists python3; then
        print_warning "Python 3 not found. Installing..."
        sudo apt-get update
        sudo apt-get install -y python3 python3-pip
    fi
    
    if ! command_exists node; then
        print_warning "Node.js not found. Installing..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    if ! command_exists npm; then
        print_warning "npm not found. Installing..."
        sudo apt-get install -y npm
    fi
    
    install_python_deps
    install_node_deps
    
    # Create desktop shortcut
    print_status "Creating desktop shortcut..."
    cat > ~/Desktop/DevControl.desktop << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=DevControl Dashboard
Comment=Apple-style system monitoring dashboard
Exec=gnome-terminal -- bash -c "cd $(pwd) && ./scripts/start.sh"
Icon=$(pwd)/assets/icon.png
Terminal=true
Categories=System;
EOF
    
    print_status "Desktop shortcut created!"
}

# Setup for macOS
setup_macos() {
    print_header "Setting up DevControl Dashboard for macOS"
    
    # Check dependencies
    if ! command_exists python3; then
        print_warning "Python 3 not found. Installing with Homebrew..."
        if command_exists brew; then
            brew install python3
        else
            print_error "Homebrew not found. Please install Homebrew first."
            echo "Visit: https://brew.sh/"
            exit 1
        fi
    fi
    
    if ! command_exists node; then
        print_warning "Node.js not found. Installing with Homebrew..."
        brew install node
    fi
    
    install_python_deps
    install_node_deps
    
    # Create macOS app
    print_status "Creating macOS app..."
    mkdir -p ~/Applications/DevControl.app/Contents/MacOS
    cat > ~/Applications/DevControl.app/Contents/Info.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>start.sh</string>
    <key>CFBundleIdentifier</key>
    <string>com.devcontrol.dashboard</string>
    <key>CFBundleName</key>
    <string>DevControl Dashboard</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
</dict>
</plist>
EOF
    
    cp scripts/start.sh ~/Applications/DevControl.app/Contents/MacOS/
    chmod +x ~/Applications/DevControl.app/Contents/MacOS/start.sh
    
    print_status "macOS app created in ~/Applications/"
}

# Setup for Windows
setup_windows() {
    print_header "Setting up DevControl Dashboard for Windows"
    
    # Check if running in WSL
    if grep -q Microsoft /proc/version; then
        print_status "Detected WSL environment"
        
        # Check Python
        if ! command_exists python3; then
            print_warning "Python 3 not found in WSL. Installing..."
            sudo apt-get update
            sudo apt-get install -y python3 python3-pip
        fi
        
        # Check Node.js
        if ! command_exists node; then
            print_warning "Node.js not found in WSL. Installing..."
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        fi
    else
        print_status "Detected Windows environment"
        
        # Check if Python is installed
        if ! command_exists python; then
            print_error "Python not found. Please install Python from https://python.org"
            print_status "Recommended: Install Python 3.9 or higher"
        fi
        
        # Check if Node.js is installed
        if ! command_exists node; then
            print_error "Node.js not found. Please install Node.js from https://nodejs.org"
            print_status "Recommended: Install Node.js 18 LTS or higher"
        fi
    fi
    
    install_python_deps
    install_node_deps
    
    # Create Windows batch file
    print_status "Creating Windows startup script..."
    cat > start_devcontrol.bat << EOF
@echo off
title DevControl Dashboard
echo Starting DevControl Dashboard...
echo.
echo Opening browser at http://localhost:3001
echo.
echo Press Ctrl+C to stop the dashboard
echo.

REM Start backend
start "Backend" cmd /k "cd /d \"%~dp0backend\" && python app.py"

REM Wait a moment for backend to start
timeout /t 3 /nobreak

REM Start frontend
start "Frontend" cmd /k "cd /d \"%~dp0frontend\" && npm run dev"

REM Open browser
start http://localhost:3001

pause
EOF
    
    print_status "Windows startup script created: start_devcontrol.bat"
}

# Create start script
create_start_script() {
    print_status "Creating universal start script..."
    cat > scripts/start.sh << 'EOF'
#!/bin/bash

# DevControl Dashboard - Universal Start Script

echo "🚀 Starting DevControl Dashboard..."
echo "📊 Backend will start on http://localhost:8000"
echo "🌐 Frontend will start on http://localhost:3001"
echo ""

# Kill any existing processes
pkill -f "python app.py" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true

# Start backend
echo "🔧 Starting backend..."
cd backend
python app.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Open browser
echo "🌐 Opening browser..."
if command_exists xdg-open; then
    xdg-open http://localhost:3001
elif command_exists open; then
    open http://localhost:3001
elif command_exists start; then
    start http://localhost:3001
fi

echo ""
echo "✅ Dashboard started successfully!"
echo "📊 Backend: http://localhost:8000"
echo "🌐 Frontend: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "echo '🛑 Stopping dashboard...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
EOF
    
    chmod +x scripts/start.sh
}

# Create update script
create_update_script() {
    print_status "Creating update script..."
    cat > scripts/update.sh << 'EOF'
#!/bin/bash

echo "🔄 Updating DevControl Dashboard..."

# Update git repository
git pull origin main

# Update Python dependencies
echo "📦 Updating Python dependencies..."
cd backend
pip install -r requirements.txt

# Update Node.js dependencies
echo "📦 Updating Node.js dependencies..."
cd ../frontend
npm install

echo "✅ Update completed!"
echo "🚀 Run './scripts/start.sh' to start the dashboard"
EOF
    
    chmod +x scripts/update.sh
}

# Main setup function
main() {
    print_header "DevControl Dashboard - Automated Setup"
    
    OS=$(detect_os)
    print_status "Detected OS: $OS"
    
    # Create scripts directory
    mkdir -p scripts
    
    # Create essential scripts
    create_start_script
    create_update_script
    
    # OS-specific setup
    case $OS in
        "linux")
            setup_linux
            ;;
        "macos")
            setup_macos
            ;;
        "windows")
            setup_windows
            ;;
        *)
            print_error "Unsupported operating system: $OS"
            exit 1
            ;;
    esac
    
    print_header "Setup Complete!"
    print_status "📁 Installation directory: $(pwd)"
    print_status "🚀 Start command: ./scripts/start.sh"
    print_status "🔄 Update command: ./scripts/update.sh"
    print_status "🌐 Dashboard URL: http://localhost:3001"
    print_status "📊 Backend API: http://localhost:8000"
    
    print_warning "⚠️  Important Security Notes:"
    print_warning "• Only use this dashboard in trusted networks"
    print_warning "• The dashboard shows your real system data"
    print_warning "• Do not expose the backend to the internet"
    print_warning "• Review the privacy documentation in PRIVACY_AND_SETUP.md"
}

# Run main function
main "$@"
