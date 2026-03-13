import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Network, Terminal, Zap, AlertTriangle, Server, Wifi, Command, Kill } from 'lucide-react';
import SystemMonitor from './components/SystemMonitor';
import PortControl from './components/PortControl';
import ProcessMonitor from './components/ProcessMonitor';
import CommandRunner from './components/CommandRunner';
import NetworkHub from './components/NetworkHub';

function App() {
  const [systemInfo, setSystemInfo] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activePanel, setActivePanel] = useState('overview');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    fetchSystemInfo();

    return () => clearInterval(timer);
  }, []);

  const fetchSystemInfo = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/system/info');
      const data = await response.json();
      setSystemInfo(data);
    } catch (error) {
      console.error('Failed to fetch system info:', error);
    }
  };

  const formatTime = (date) => {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  };

  return (
    <div className="min-h-screen bg-military-950 text-military-100 p-4">
      {/* Header */}
      <div className="panel mb-4">
        <div className="panel-header">
          <div className="flex items-center space-x-4">
            <Server className="w-5 h-5 text-tactical-green" />
            <h1 className="text-xl font-bold text-tactical-green">DEVCONTROL DASHBOARD</h1>
            <div className="flex items-center space-x-2 text-xs text-military-400">
              <Activity className="w-3 h-3" />
              <span>SYSTEM ONLINE</span>
            </div>
          </div>
          <div className="text-xs text-military-400">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="panel mb-4">
        <div className="flex space-x-1 p-2">
          {[
            { id: 'overview', label: 'OVERVIEW', icon: Activity },
            { id: 'ports', label: 'PORT CONTROL', icon: Network },
            { id: 'processes', label: 'PROCESSES', icon: Cpu },
            { id: 'commands', label: 'COMMANDS', icon: Terminal },
            { id: 'network', label: 'NETWORK', icon: Wifi },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActivePanel(id)}
              className={`nav-button ${activePanel === id ? 'active' : ''}`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* System Info Bar */}
      {systemInfo && (
        <div className="grid grid-cols-6 gap-2 mb-4">
          <div className="metric-card">
            <div className="metric-label">Platform</div>
            <div className="text-xs font-bold text-military-100">{systemInfo.platform}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">CPU Cores</div>
            <div className="text-xs font-bold text-military-100">{systemInfo.cpu_count}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total RAM</div>
            <div className="text-xs font-bold text-military-100">
              {Math.round(systemInfo.memory_total / 1024 / 1024 / 1024)}GB
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Hostname</div>
            <div className="text-xs font-bold text-military-100">{systemInfo.hostname}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Architecture</div>
            <div className="text-xs font-bold text-military-100">{systemInfo.architecture}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Status</div>
            <div className="text-xs font-bold status-online">OPERATIONAL</div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {activePanel === 'overview' && (
          <>
            <SystemMonitor />
            <PortControl />
          </>
        )}
        {activePanel === 'ports' && (
          <div className="lg:grid-cols-2">
            <PortControl />
          </div>
        )}
        {activePanel === 'processes' && (
          <div className="lg:grid-cols-2">
            <ProcessMonitor />
          </div>
        )}
        {activePanel === 'commands' && (
          <div className="lg:grid-cols-2">
            <CommandRunner />
          </div>
        )}
        {activePanel === 'network' && (
          <div className="lg:grid-cols-2">
            <NetworkHub />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="panel mt-4">
        <div className="panel-header">
          <div className="text-xs text-military-400">
            DevControl Dashboard v1.0.0 | Military-Grade System Monitoring
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-tactical-green rounded-full animate-pulse"></div>
            <span className="text-xs text-tactical-green">ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
