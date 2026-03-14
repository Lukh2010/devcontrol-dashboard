import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Network, Terminal, Wifi } from 'lucide-react';
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
    gap: '6px'
  },
  navButton: {
    backgroundColor: 'transparent',
    color: '#6c757d',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  navButtonActive: {
    backgroundColor: '#007aff',
    color: '#ffffff'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableCell: {
    padding: '12px 16px',
    textAlign: 'left',
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
    fontSize: '13px'
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

const SystemMonitor = () => {
  const [performanceData, setPerformanceData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/system/performance');
        const data = await response.json();
        setPerformanceData(data);
      } catch (error) {
        console.error('Failed to fetch performance data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!performanceData) {
    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>
            <Activity style={{width: '20px', height: '20px'}} />
            System Performance
          </h2>
        </div>
        <div style={styles.cardContent}>
          Loading system data...
        </div>
      </div>
    );
  }

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
      </div>
    </div>
  );
};

const PortControl = () => {
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPorts = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/ports');
        const data = await response.json();
        setPorts(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch ports:', error);
        setLoading(false);
      }
    };

    fetchPorts();
    const interval = setInterval(fetchPorts, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>
            <Network style={{width: '20px', height: '20px'}} />
            Port Control
          </h2>
        </div>
        <div style={styles.cardContent}>
          Scanning ports...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>
          <Network style={{width: '20px', height: '20px'}} />
          Port Control
        </h2>
      </div>
      <div style={styles.cardContent}>
        {ports.length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px 0', color: '#6c757d'}}>
            No active listening ports found
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableCell}>Port</th>
                <th style={styles.tableCell}>Process</th>
                <th style={styles.tableCell}>PID</th>
                <th style={styles.tableCell}>Action</th>
              </tr>
            </thead>
            <tbody>
              {ports.slice(0, 10).map((portInfo, index) => (
                <tr key={index}>
                  <td style={styles.tableCell}>
                    <strong>{portInfo.port}</strong>
                  </td>
                  <td style={styles.tableCell}>{portInfo.process_name}</td>
                  <td style={styles.tableCell}>{portInfo.pid}</td>
                  <td style={styles.tableCell}>
                    <button
                      onClick={() => alert(`Kill process on port ${portInfo.port}`)}
                      style={{...styles.button, backgroundColor: '#ff3b30', padding: '6px 12px', fontSize: '12px'}}
                    >
                      Kill
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

function App() {
  const [systemInfo, setSystemInfo] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activePanel, setActivePanel] = useState('overview');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const fetchSystemInfo = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/system/info');
        const data = await response.json();
        setSystemInfo(data);
      } catch (error) {
        console.error('Failed to fetch system info:', error);
      }
    };

    fetchSystemInfo();

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
      <div style={{...styles.card, marginBottom: '24px'}}>
        <div style={styles.cardHeader}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <h1 style={{fontSize: '24px', fontWeight: '700', color: '#1d1d1f', margin: 0}}>
              DevControl Dashboard
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
              System Online
            </span>
            <span style={{fontSize: '14px', color: '#6c757d'}}>
              {formatTime(currentTime)}
            </span>
          </div>
        </div>
      </div>

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

      {systemInfo && (
        <div style={{...styles.card, marginBottom: '24px'}}>
          <div style={styles.cardContent}>
            <div style={styles.grid4}>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Platform</div>
                <div style={{...styles.metricValue, fontSize: '20px'}}>{systemInfo.platform}</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>CPU Cores</div>
                <div style={{...styles.metricValue, fontSize: '20px'}}>{systemInfo.cpu_count}</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Total RAM</div>
                <div style={{...styles.metricValue, fontSize: '20px'}}>
                  {Math.round(systemInfo.memory_total / 1024 / 1024 / 1024)}GB
                </div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Hostname</div>
                <div style={{...styles.metricValue, fontSize: '20px'}}>{systemInfo.hostname}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={styles.grid2}>
        {activePanel === 'overview' && (
          <SystemMonitor />
        )}
        {activePanel === 'ports' && <PortControl />}
        {activePanel === 'processes' && <ProcessMonitor />}
        {activePanel === 'commands' && <CommandRunner />}
        {activePanel === 'network' && <NetworkHub />}
      </div>
    </div>
  );
}

export default App;
