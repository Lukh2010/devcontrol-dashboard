import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Network, Terminal, Zap, AlertTriangle, Server, Wifi, Command, Kill, CheckCircle, XCircle, Plus, Trash2, Play } from 'lucide-react';

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    color: '#1d1d1f',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '20px',
    fontSize: '14px'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    marginBottom: '20px',
    overflow: 'hidden'
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
  buttonDanger: {
    backgroundColor: '#ff3b30',
    color: '#ffffff'
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
  input: {
    backgroundColor: '#ffffff',
    border: '1px solid rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  },
  inputFocus: {
    borderColor: '#007aff'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
  },
  tableCell: {
    padding: '12px 16px',
    textAlign: 'left',
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
    fontSize: '13px'
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '500'
  },
  statusOnline: {
    backgroundColor: '#d4edda',
    color: '#155724'
  },
  statusOffline: {
    backgroundColor: '#f8d7da',
    color: '#721c24'
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

// System Monitor Component
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
        
        <div style={{...styles.grid2, marginTop: '20px'}}>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>CPU Cores</div>
            <div style={styles.metricValue}>{performanceData.cpu_count}</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Total Memory</div>
            <div style={styles.metricValue}>
              {Math.round(performanceData.memory.total / 1024 / 1024 / 1024)}GB
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Port Control Component
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

  const killProcess = async (port) => {
    try {
      const response = await fetch(`http://localhost:8000/api/port/${port}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Success: ${result.message}`);
        fetchPorts();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (error) {
      alert(`Network error: ${error.message}`);
    }
  };

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
              <tr style={styles.tableHeader}>
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
                      onClick={() => killProcess(portInfo.port)}
                      style={{...styles.button, ...styles.buttonDanger, padding: '6px 12px', fontSize: '12px'}}
                    >
                      <Kill style={{width: '14px', height: '14px'}} />
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

// Process Monitor Component
const ProcessMonitor = () => {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProcesses = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/processes');
        const data = await response.json();
        setProcesses(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch processes:', error);
        setLoading(false);
      }
    };

    fetchProcesses();
    const interval = setInterval(fetchProcesses, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>
            <Cpu style={{width: '20px', height: '20px'}} />
            Process Monitor
          </h2>
        </div>
        <div style={styles.cardContent}>
          Loading process data...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>
          <Cpu style={{width: '20px', height: '20px'}} />
          Process Monitor
        </h2>
      </div>
      <div style={styles.cardContent}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.tableCell}>Process Name</th>
              <th style={styles.tableCell}>CPU %</th>
              <th style={styles.tableCell}>Memory</th>
              <th style={styles.tableCell}>Status</th>
            </tr>
          </thead>
          <tbody>
            {processes.slice(0, 15).map((process, index) => (
              <tr key={index}>
                <td style={styles.tableCell}>
                  <strong>{process.name}</strong>
                </td>
                <td style={styles.tableCell}>
                  <span style={{
                    color: process.cpu_percent > 50 ? '#ff3b30' : '#1d1d1f',
                    fontWeight: '600'
                  }}>
                    {process.cpu_percent.toFixed(1)}%
                  </span>
                </td>
                <td style={styles.tableCell}>
                  {process.memory_mb > 1024 
                    ? `${(process.memory_mb / 1024).toFixed(1)}GB`
                    : `${process.memory_mb.toFixed(0)}MB`
                  }
                </td>
                <td style={styles.tableCell}>
                  <span style={{
                    ...styles.statusBadge,
                    ...(process.status === 'running' ? styles.statusOnline : styles.statusOffline)
                  }}>
                    {process.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Command Runner Component
const CommandRunner = () => {
  const [customCommands] = useState([
    { id: 1, name: 'List Files', command: 'ls -la' },
    { id: 2, name: 'Git Status', command: 'git status' },
    { id: 3, name: 'NPM Install', command: 'npm install' },
    { id: 4, name: 'Python Version', command: 'python --version' },
  ]);
  const [executingCommand, setExecutingCommand] = useState(null);
  const [commandResults, setCommandResults] = useState([]);

  const executeCommand = async (command, name) => {
    setExecutingCommand(name);
    
    try {
      const response = await fetch('http://localhost:8000/api/commands/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, name }),
      });
      
      const result = await response.json();
      
      setCommandResults(prev => [{
        id: Date.now(),
        name,
        command,
        ...result,
        timestamp: new Date()
      }, ...prev].slice(0, 5));
      
    } catch (error) {
      setCommandResults(prev => [{
        id: Date.now(),
        name,
        command,
        success: false,
        error: error.message,
        timestamp: new Date()
      }, ...prev].slice(0, 5));
    } finally {
      setExecutingCommand(null);
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>
          <Terminal style={{width: '20px', height: '20px'}} />
          Command Runner
        </h2>
      </div>
      <div style={styles.cardContent}>
        <div style={styles.grid2}>
          <div>
            <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1d1d1f'}}>
              Saved Commands
            </h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              {customCommands.map((cmd) => (
                <div key={cmd.id} style={{
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  padding: '12px',
                  border: '1px solid rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                    <div style={{fontWeight: '500', color: '#1d1d1f'}}>{cmd.name}</div>
                    <button
                      onClick={() => executeCommand(cmd.command, cmd.name)}
                      disabled={executingCommand === cmd.name}
                      style={{
                        ...styles.button,
                        opacity: executingCommand === cmd.name ? 0.6 : 1,
                        cursor: executingCommand === cmd.name ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Play style={{width: '14px', height: '14px'}} />
                      {executingCommand === cmd.name ? 'Running...' : 'Run'}
                    </button>
                  </div>
                  <div style={{
                    backgroundColor: '#1d1d1f',
                    color: '#f8f9fa',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'Monaco, Consolas, monospace'
                  }}>
                    {cmd.command}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1d1d1f'}}>
              Execution History
            </h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              {commandResults.length === 0 ? (
                <div style={{textAlign: 'center', padding: '20px 0', color: '#6c757d'}}>
                  No commands executed yet
                </div>
              ) : (
                commandResults.map((result) => (
                  <div key={result.id} style={{
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    padding: '12px',
                    border: '1px solid rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                        {result.success ? (
                          <CheckCircle style={{width: '16px', height: '16px', color: '#34c759'}} />
                        ) : (
                          <XCircle style={{width: '16px', height: '16px', color: '#ff3b30'}} />
                        )}
                        <span style={{fontWeight: '500', color: '#1d1d1f'}}>{result.name}</span>
                      </div>
                      <span style={{fontSize: '12px', color: '#6c757d'}}>
                        {result.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{
                      backgroundColor: '#1d1d1f',
                      color: '#f8f9fa',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontFamily: 'Monaco, Consolas, monospace',
                      marginBottom: '4px'
                    }}>
                      {result.command}
                    </div>
                    {result.stdout && (
                      <div style={{
                        backgroundColor: '#d4edda',
                        color: '#155724',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontFamily: 'Monaco, Consolas, monospace'
                      }}>
                        {result.stdout}
                      </div>
                    )}
                    {(result.stderr || result.error) && (
                      <div style={{
                        backgroundColor: '#f8d7da',
                        color: '#721c24',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontFamily: 'Monaco, Consolas, monospace'
                      }}>
                        {result.stderr || result.error}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Network Hub Component
const NetworkHub = () => {
  const [networkInfo, setNetworkInfo] = useState(null);
  const [pingTarget, setPingTarget] = useState('google.com');
  const [pingResults, setPingResults] = useState([]);
  const [pinging, setPinging] = useState(false);

  useEffect(() => {
    const fetchNetworkInfo = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/network/info');
        const data = await response.json();
        setNetworkInfo(data);
      } catch (error) {
        console.error('Failed to fetch network info:', error);
      }
    };

    fetchNetworkInfo();
    const interval = setInterval(fetchNetworkInfo, 10000);
    return () => clearInterval(interval);
  }, []);

  const performPing = async () => {
    if (!pingTarget.trim()) return;
    
    setPinging(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/network/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: pingTarget }),
      });
      
      const result = await response.json();
      
      setPingResults(prev => [{
        id: Date.now(),
        host: pingTarget,
        ...result,
        timestamp: new Date()
      }, ...prev].slice(0, 5));
      
    } catch (error) {
      setPingResults(prev => [{
        id: Date.now(),
        host: pingTarget,
        success: false,
        error: error.message,
        timestamp: new Date()
      }, ...prev].slice(0, 5));
    } finally {
      setPinging(false);
    }
  };

  if (!networkInfo) {
    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>
            <Wifi style={{width: '20px', height: '20px'}} />
            Network Hub
          </h2>
        </div>
        <div style={styles.cardContent}>
          Loading network information...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>
          <Wifi style={{width: '20px', height: '20px'}} />
          Network Hub
        </h2>
      </div>
      <div style={styles.cardContent}>
        <div style={styles.grid2}>
          <div>
            <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1d1d1f'}}>
              Network Interfaces
            </h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              {Object.entries(networkInfo.interfaces).map(([interfaceName, addresses]) => (
                <div key={interfaceName} style={{
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  padding: '12px',
                  border: '1px solid rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                    <div style={{fontWeight: '500', color: '#1d1d1f'}}>{interfaceName}</div>
                    <span style={{
                      ...styles.statusBadge,
                      ...styles.statusOnline
                    }}>
                      Active
                    </span>
                  </div>
                  {addresses.map((addr, index) => (
                    <div key={index} style={{fontSize: '13px', color: '#6c757d'}}>
                      <strong>{addr.family}:</strong> {addr.address}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1d1d1f'}}>
              Latency Checker
            </h3>
            <div style={{backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '12px', border: '1px solid rgba(0, 0, 0, 0.1)'}}>
              <div style={{display: 'flex', gap: '8px', marginBottom: '12px'}}>
                <input
                  type="text"
                  placeholder="Enter host or IP..."
                  value={pingTarget}
                  onChange={(e) => setPingTarget(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && performPing()}
                  style={{...styles.input, ...styles.inputFocus}}
                />
                <button
                  onClick={performPing}
                  disabled={pinging}
                  style={{
                    ...styles.button,
                    opacity: pinging ? 0.6 : 1,
                    cursor: pinging ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Zap style={{width: '14px', height: '14px'}} />
                  {pinging ? 'Pinging...' : 'Ping'}
                </button>
              </div>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {pingResults.length === 0 ? (
                  <div style={{textAlign: 'center', padding: '20px 0', color: '#6c757d'}}>
                    No ping tests performed yet
                  </div>
                ) : (
                  pingResults.map((result) => (
                    <div key={result.id} style={{
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      padding: '12px',
                      border: '1px solid rgba(0, 0, 0, 0.1)'
                    }}>
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                          {result.success ? (
                            <CheckCircle style={{width: '16px', height: '16px', color: '#34c759'}} />
                          ) : (
                            <XCircle style={{width: '16px', height: '16px', color: '#ff3b30'}} />
                          )}
                          <span style={{fontWeight: '500', color: '#1d1d1f'}}>{result.host}</span>
                        </div>
                        <span style={{fontSize: '12px', color: '#6c757d'}}>
                          {result.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      {result.success && result.latency_ms && (
                        <div style={{fontSize: '14px', color: '#34c759', fontWeight: '500'}}>
                          Latency: {result.latency_ms}ms
                        </div>
                      )}
                      {(result.error || !result.success) && (
                        <div style={{fontSize: '14px', color: '#ff3b30', fontWeight: '500'}}>
                          {result.error || 'Connection failed'}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
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
      {/* Header */}
      <div style={{...styles.card, marginBottom: '24px'}}>
        <div style={styles.cardHeader}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <Server style={{width: '24px', height: '24px', color: '#007aff'}} />
            <h1 style={{fontSize: '24px', fontWeight: '700', color: '#1d1d1f', margin: 0}}>
              DevControl Dashboard
            </h1>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span style={{
              ...styles.statusBadge,
              ...styles.statusOnline
            }}>
              System Online
            </span>
            <span style={{fontSize: '14px', color: '#6c757d'}}>{formatTime(currentTime)}</span>
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
      {systemInfo && (
        <div style={{...styles.card, marginBottom: '24px'}}>
          <div style={styles.cardContent}>
            <div style={styles.grid4}>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Platform</div>
                <div style={styles.metricValue} style={{fontSize: '20px'}}>{systemInfo.platform}</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>CPU Cores</div>
                <div style={styles.metricValue} style={{fontSize: '20px'}}>{systemInfo.cpu_count}</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Total RAM</div>
                <div style={styles.metricValue} style={{fontSize: '20px'}}>
                  {Math.round(systemInfo.memory_total / 1024 / 1024 / 1024)}GB
                </div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Hostname</div>
                <div style={styles.metricValue} style={{fontSize: '20px'}}>{systemInfo.hostname}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={styles.grid2}>
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
    </div>
  );
}

export default App;
