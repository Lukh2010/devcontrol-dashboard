import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Network, Terminal, Zap, AlertTriangle, Server, Wifi, Command, Kill } from 'lucide-react';
import { SystemMonitor, PortControl, ProcessMonitor, CommandRunner, NetworkHub } from './components/AllComponents_working.jsx';

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0a0e13',
    color: '#f0f4f8',
    padding: '16px',
    fontFamily: "'Courier New', monospace"
  },
  panel: {
    backgroundColor: '#171923',
    border: '1px solid #4a5568',
    borderRadius: '4px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
    marginBottom: '16px'
  },
  panelHeader: {
    backgroundColor: '#2d3748',
    padding: '12px 16px',
    borderBottom: '1px solid #4a5568',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  panelTitle: {
    color: '#00ff41',
    fontWeight: 'bold',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    display: 'flex',
    alignItems: 'center'
  },
  grid: {
    display: 'grid',
    gap: '16px'
  },
  gridCols1: { gridTemplateColumns: 'repeat(1, 1fr)' },
  gridCols2: { gridTemplateColumns: 'repeat(2, 1fr)' },
  gridCols6: { gridTemplateColumns: 'repeat(6, 1fr)' },
  flex: { display: 'flex' },
  itemsCenter: { alignItems: 'center' },
  justifyBetween: { justifyContent: 'space-between' },
  spaceX2: { marginLeft: '8px' },
  spaceX4: { marginLeft: '16px' },
  textXs: { fontSize: '12px' },
  textSm: { fontSize: '14px' },
  textXl: { fontSize: '20px' },
  text2xl: { fontSize: '24px' },
  fontBold: { fontWeight: 'bold' },
  uppercase: { textTransform: 'uppercase' },
  textMilitary100: { color: '#f0f4f8' },
  textMilitary300: { color: '#9fb3c8' },
  textMilitary400: { color: '#748894' },
  textTacticalGreen: { color: '#00ff41' },
  textTacticalOrange: { color: '#ff6b35' },
  bgMilitary800: { backgroundColor: '#2d3748' },
  bgMilitary900: { backgroundColor: '#1a202c' },
  bgTacticalGreen: { backgroundColor: '#00ff41' },
  border: { border: '1px solid #4a5568' },
  p2: { padding: '8px' },
  p3: { padding: '12px' },
  p4: { padding: '16px' },
  mb2: { marginBottom: '8px' },
  mb4: { marginBottom: '16px' },
  mt4: { marginTop: '16px' },
  w2: { width: '8px' },
  h2: { height: '8px' },
  roundedFull: { borderRadius: '50%' },
  animatePulse: {
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
  },
  navButton: {
    backgroundColor: '#2d3748',
    color: '#9fb3c8',
    border: '1px solid #4a5568',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    cursor: 'pointer',
    borderRadius: '2px',
    display: 'flex',
    alignItems: 'center',
    marginRight: '4px'
  },
  navButtonActive: {
    backgroundColor: '#00ff41',
    color: '#0a0e13',
    borderColor: '#00ff41'
  },
  metricCard: {
    backgroundColor: '#2d3748',
    border: '1px solid #4a5568',
    padding: '12px'
  },
  metricValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#00ff41'
  },
  metricLabel: {
    fontSize: '12px',
    color: '#9ca3af',
    textTransform: 'uppercase',
    marginTop: '4px'
  }
};

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
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <div style={{...styles.flex, ...styles.itemsCenter, ...styles.spaceX4}}>
            <Server style={{...styles.textTacticalGreen, marginRight: '8px'}} />
            <h1 style={{...styles.textXl, ...styles.fontBold, ...styles.textTacticalGreen}}>
              DEVCONTROL DASHBOARD
            </h1>
            <div style={{...styles.flex, ...styles.itemsCenter, ...styles.spaceX2, ...styles.textXs, ...styles.textMilitary400}}>
              <Activity style={{...styles.w2, ...styles.h2, marginRight: '4px'}} />
              <span>SYSTEM ONLINE</span>
            </div>
          </div>
          <div style={styles.textXs}>
            {formatTime(currentTime)}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={styles.panel}>
        <div style={{...styles.flex, ...styles.p2}}>
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
              style={{
                ...styles.navButton,
                ...(activePanel === id ? styles.navButtonActive : {})
              }}
            >
              <Icon style={{width: '16px', height: '16px', marginRight: '8px'}} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* System Info Bar */}
      {systemInfo && (
        <div style={{...styles.grid, ...styles.gridCols6}}>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Platform</div>
            <div style={{...styles.textXs, ...styles.fontBold, ...styles.textMilitary100}}>
              {systemInfo.platform}
            </div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>CPU Cores</div>
            <div style={{...styles.textXs, ...styles.fontBold, ...styles.textMilitary100}}>
              {systemInfo.cpu_count}
            </div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Total RAM</div>
            <div style={{...styles.textXs, ...styles.fontBold, ...styles.textMilitary100}}>
              {Math.round(systemInfo.memory_total / 1024 / 1024 / 1024)}GB
            </div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Hostname</div>
            <div style={{...styles.textXs, ...styles.fontBold, ...styles.textMilitary100}}>
              {systemInfo.hostname}
            </div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Architecture</div>
            <div style={{...styles.textXs, ...styles.fontBold, ...styles.textMilitary100}}>
              {systemInfo.architecture}
            </div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Status</div>
            <div style={{...styles.textXs, ...styles.fontBold, color: '#00ff41'}}>
              OPERATIONAL
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{...styles.grid, ...styles.gridCols2}}>
        {activePanel === 'overview' && (
          <>
            <SystemMonitor />
            <PortControl />
          </>
        )}
        {activePanel === 'ports' && <PortControl />}
        {activePanel === 'processes' && <ProcessMonitor />}
        {activePanel === 'commands' && <CommandRunner />}
        {activePanel === 'network' && <NetworkHub />}
      </div>

      {/* Footer */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <div style={styles.textXs}>
            DevControl Dashboard v1.0.0 | Military-Grade System Monitoring
          </div>
          <div style={{...styles.flex, ...styles.itemsCenter, ...styles.spaceX2}}>
            <div style={{
              ...styles.w2, ...styles.h2, ...styles.roundedFull, ...styles.bgTacticalGreen, ...styles.animatePulse
            }}></div>
            <span style={{...styles.textXs, ...styles.textTacticalGreen}}>ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
