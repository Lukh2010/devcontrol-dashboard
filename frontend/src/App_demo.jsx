import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Network, Terminal, Wifi, Shield } from 'lucide-react';
import CommandRunner from './components/CommandRunner_Apple.jsx';
import NetworkHub from './components/NetworkHub_Apple.jsx';
import ProcessMonitor from './components/ProcessMonitor_Apple.jsx';

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    color: '#1d1d1f',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '20px'
  },
  demoBanner: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  demoIcon: {
    color: '#856404',
    flexShrink: 0
  },
  demoText: {
    color: '#856404',
    fontSize: '14px',
    lineHeight: '1.4'
  },
  demoTitle: {
    fontWeight: '600',
    marginBottom: '4px'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    marginBottom: '20px'
  },
  cardHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1d1d1f',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  cardContent: {
    padding: '20px'
  },
  grid: {
    display: 'grid',
    gap: '20px'
  },
  grid2: { gridTemplateColumns: 'repeat(2, 1fr)' },
  grid3: { gridTemplateColumns: 'repeat(3, 1fr)' },
  grid4: { gridTemplateColumns: 'repeat(4, 1fr)' },
  metricCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center',
    border: '1px solid rgba(0, 0, 0, 0.1)'
  },
  metricValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: '4px'
  },
  metricLabel: {
    fontSize: '12px',
    color: '#6c757d',
    fontWeight: '500'
  },
  button: {
    backgroundColor: '#007aff',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease'
  },
  buttonSecondary: {
    backgroundColor: '#f1f3f4',
    color: '#1d1d1f',
    border: '1px solid rgba(0, 0, 0, 0.1)'
  },
  navButton: {
    backgroundColor: 'transparent',
    color: '#6c757d',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  navButtonActive: {
    backgroundColor: '#007aff',
    color: '#ffffff'
  },
  progressBar: {
    width: '100%',
    height: '4px',
    backgroundColor: '#e9ecef',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007aff',
    transition: 'width 0.3s ease'
  }
};

// Demo-Daten (keine persönlichen Informationen!)
const DEMO_DATA = {
  system: {
    hostname: "Demo-PC",
    platform: "Windows",
    cpu_count: 8,
    memory_total: 16,
    architecture: "x64"
  },
  performance: {
    cpu_percent: 25.5,
    memory: { percent: 50.0 },
    disk: { percent: 50.0 }
  },
  processes: [
    { pid: 1234, name: "chrome.exe", cpu_percent: 15.2, memory_mb: 512, status: "running" },
    { pid: 5678, name: "firefox.exe", cpu_percent: 12.8, memory_mb: 384, status: "running" },
    { pid: 9012, name: "code.exe", cpu_percent: 8.5, memory_mb: 256, status: "running" },
    { pid: 3456, name: "node.exe", cpu_percent: 5.2, memory_mb: 128, status: "running" },
    { pid: 7890, name: "python.exe", cpu_percent: 3.1, memory_mb: 64, status: "running" }
  ],
  ports: [
    { port: 80, process_name: "nginx", pid: 1234 },
    { port: 443, process_name: "nginx", pid: 1234 },
    { port: 3000, process_name: "node", pid: 5678 },
    { port: 5432, process_name: "postgres", pid: 9012 },
    { port: 3306, process_name: "mysql", pid: 3456 }
  ],
  network: {
    hostname: "Demo-PC",
    default_gateway: "192.168.1.1",
    interfaces: {
      "Ethernet": [
        { address: "192.168.1.100", family: "IPv4" },
        { address: "fe80::1", family: "IPv6" }
      ],
      "Wi-Fi": [
        { address: "192.168.1.101", family: "IPv4" }
      ]
    }
  }
};

// System Monitor Component (Demo)
const SystemMonitor = () => {
  const [performanceData, setPerformanceData] = useState(DEMO_DATA.performance);

  useEffect(() => {
    const interval = setInterval(() => {
      // Simuliere leichte Schwankungen
      setPerformanceData(prev => ({
        ...prev,
        cpu_percent: Math.round(Math.random() * 10 + 20),
        memory: { ...prev.memory, percent: Math.round(Math.random() * 10 + 45) }
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>
          <Activity style={{width: '20px', height: '20px'}} />
          System Performance
        </h2>
      </div>
      <div style={styles.cardContent}>
        <div style={styles.grid3}>
          <div style={styles.metricCard}>
            <div style={styles.metricValue}>{performanceData.cpu_percent.toFixed(1)}%</div>
            <div style={styles.metricLabel}>CPU Usage</div>
            <div style={styles.progressBar}>
              <div style={{...styles.progressFill, width: `${performanceData.cpu_percent}%`}}></div>
            </div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricValue}>{performanceData.memory.percent.toFixed(1)}%</div>
            <div style={styles.metricLabel}>Memory Usage</div>
            <div style={styles.progressBar}>
              <div style={{...styles.progressFill, width: `${performanceData.memory.percent}%`}}></div>
            </div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricValue}>{performanceData.disk.percent.toFixed(1)}%</div>
            <div style={styles.metricLabel}>Disk Usage</div>
            <div style={styles.progressBar}>
              <div style={{...styles.progressFill, width: `${performanceData.disk.percent}%`}}></div>
            </div>
          </div>
        </div>
        
        <div style={styles.grid2}>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>CPU Cores</div>
            <div style={styles.metricValue}>{DEMO_DATA.system.cpu_count}</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Total Memory</div>
            <div style={styles.metricValue}>{DEMO_DATA.system.memory_total}GB</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Port Control Component (Demo)
const PortControl = () => {
  const [ports, setPorts] = useState(DEMO_DATA.ports);

  const killProcess = async (port) => {
    if (port === 80 || port === 443) {
      alert('Cannot kill essential system port in demo mode');
      return;
    }
    
    alert(`Demo: Process on port ${port} would be killed`);
    setPorts(prev => prev.filter(p => p.port !== port));
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>
          <Network style={{width: '20px', height: '20px'}} />
          Port Control
        </h2>
      </div>
      <div style={styles.cardContent}>
        <table style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{backgroundColor: '#f8f9fa', borderBottom: '1px solid rgba(0, 0, 0, 0.1)'}}>
              <th style={{padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid rgba(0, 0, 0, 0.05)', fontSize: '13px'}}>Port</th>
              <th style={{padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid rgba(0, 0, 0, 0.05)', fontSize: '13px'}}>Process</th>
              <th style={{padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid rgba(0, 0, 0, 0.05)', fontSize: '13px'}}>PID</th>
              <th style={{padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid rgba(0, 0, 0, 0.05)', fontSize: '13px'}}>Action</th>
            </tr>
          </thead>
          <tbody>
            {ports.map((portInfo, index) => (
              <tr key={index}>
                <td style={{padding: '12px 16px', borderBottom: '1px solid rgba(0, 0, 0, 0.05)', fontSize: '13px'}}>
                  <strong>{portInfo.port}</strong>
                </td>
                <td style={{padding: '12px 16px', borderBottom: '1px solid rgba(0, 0, 0, 0.05)', fontSize: '13px'}}>{portInfo.process_name}</td>
                <td style={{padding: '12px 16px', borderBottom: '1px solid rgba(0, 0, 0, 0.05)', fontSize: '13px'}}>{portInfo.pid}</td>
                <td style={{padding: '12px 16px', borderBottom: '1px solid rgba(0, 0, 0, 0.05)', fontSize: '13px'}}>
                  <button
                    onClick={() => killProcess(portInfo.port)}
                    style={{...styles.button, backgroundColor: '#ff3b30', padding: '6px 12px', fontSize: '12px'}}
                  >
                    Kill
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activePanel, setActivePanel] = useState('overview');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    });
  };

  return (
    <div style={styles.container}>
      {/* Demo Banner */}
      <div style={styles.demoBanner}>
        <Shield style={styles.demoIcon} />
        <div style={styles.demoText}>
          <div style={styles.demoTitle}>🔒 DEMO MODE - SAFE FOR PUBLIC SHARING</div>
          <div>This dashboard shows sample data only. No personal information is exposed. Safe for testing and demonstration purposes.</div>
        </div>
      </div>

      {/* Header */}
      <div style={{...styles.card, marginBottom: '24px'}}>
        <div style={styles.cardHeader}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <h1 style={{fontSize: '24px', fontWeight: '700', color: '#1d1d1f', margin: 0}}>
              DevControl Dashboard (Demo)
            </h1>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span style={{
              backgroundColor: '#d4edda',
              color: '#155724',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '500'
            }}>
              Demo Mode
            </span>
            <span style={{fontSize: '14px', color: '#6c757d'}}>
              {formatTime(currentTime)}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{...styles.card, marginBottom: '24px'}}>
        <div style={styles.cardContent}>
          <div style={{display: 'flex', gap: '4px', flexWrap: 'wrap'}}>
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'ports', label: 'Port Control', icon: Network },
              { id: 'processes', label: 'Processes', icon: Cpu },
              { id: 'commands', label: 'Commands', icon: Terminal },
              { id: 'network', label: 'Network', icon: Wifi },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActivePanel(id)}
                style={{
                  ...styles.navButton,
                  ...(activePanel === id ? styles.navButtonActive : {})
                }}
              >
                <Icon style={{width: '16px', height: '16px'}} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* System Info Bar */}
      <div style={{...styles.card, marginBottom: '24px'}}>
        <div style={styles.cardContent}>
          <div style={styles.grid4}>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Platform</div>
              <div style={{...styles.metricValue, fontSize: '20px'}}>{DEMO_DATA.system.platform}</div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>CPU Cores</div>
              <div style={{...styles.metricValue, fontSize: '20px'}}>{DEMO_DATA.system.cpu_count}</div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Total RAM</div>
              <div style={{...styles.metricValue, fontSize: '20px'}}>{DEMO_DATA.system.memory_total}GB</div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Hostname</div>
              <div style={{...styles.metricValue, fontSize: '20px'}}>{DEMO_DATA.system.hostname}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.grid2}>
        {activePanel === 'overview' && <SystemMonitor />}
        {activePanel === 'ports' && <PortControl />}
        {activePanel === 'processes' && <ProcessMonitor />}
        {activePanel === 'commands' && <CommandRunner />}
        {activePanel === 'network' && <NetworkHub />}
      </div>
    </div>
  );
}

export default App;
