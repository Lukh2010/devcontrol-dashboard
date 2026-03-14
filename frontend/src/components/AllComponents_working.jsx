import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Network, Terminal, Zap, AlertTriangle, Server, Wifi, Command, Kill, CheckCircle, XCircle, Plus, Trash2, Play } from 'lucide-react';

const styles = {
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
  p4: { padding: '16px' },
  grid2: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(2, 1fr)', 
    gap: '12px' 
  },
  grid3: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(3, 1fr)', 
    gap: '12px' 
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
  },
  flex: { display: 'flex' },
  itemsCenter: { alignItems: 'center' },
  justifyBetween: { justifyContent: 'space-between' },
  mb2: { marginBottom: '8px' },
  textXs: { fontSize: '12px' },
  textSm: { fontSize: '14px' },
  fontBold: { fontWeight: 'bold' },
  textMilitary100: { color: '#f0f4f8' },
  textMilitary300: { color: '#9fb3c8' },
  textMilitary400: { color: '#748894' },
  textTacticalGreen: { color: '#00ff41' },
  textTacticalOrange: { color: '#ff6b35' },
  textTacticalRed: { color: '#dc2626' },
  bgMilitary800: { backgroundColor: '#2d3748' },
  bgMilitary900: { backgroundColor: '#1a202c' },
  border: { border: '1px solid #4a5568' },
  p3: { padding: '12px' },
  spaceY2: { marginTop: '8px' },
  dataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderBottom: '1px solid #4a5568',
    fontSize: '12px'
  },
  button: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    cursor: 'pointer',
    borderRadius: '2px',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  btnPrimary: {
    backgroundColor: '#00ff41',
    color: '#0a0e13',
    borderColor: '#00ff41'
  },
  btnDanger: {
    backgroundColor: '#dc2626',
    color: 'white',
    borderColor: '#dc2626'
  },
  btnSecondary: {
    backgroundColor: '#4a5568',
    color: '#f0f4f8',
    borderColor: '#4a5568'
  },
  input: {
    backgroundColor: '#1a202c',
    border: '1px solid #4a5568',
    color: '#f0f4f8',
    padding: '8px 12px',
    fontSize: '12px',
    borderRadius: '2px',
    width: '100%'
  },
  textCenter: { textAlign: 'center' }
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
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 style={styles.panelTitle}>
            <Activity style={{width: '16px', height: '16px', marginRight: '8px'}} />
            SYSTEM MONITOR
          </h2>
        </div>
        <div style={{...styles.p4, ...styles.textCenter, ...styles.textMilitary400}}>
          Loading system data...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <h2 style={styles.panelTitle}>
          <Activity style={{width: '16px', height: '16px', marginRight: '8px'}} />
          SYSTEM MONITOR
        </h2>
        <div style={{...styles.flex, ...styles.itemsCenter, gap: '8px'}}>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#00ff41',
            borderRadius: '50%',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}></div>
          <span style={{...styles.textXs, ...styles.textTacticalGreen}}>LIVE</span>
        </div>
      </div>
      
      <div style={styles.p4}>
        <div style={styles.grid3}>
          <div style={styles.metricCard}>
            <div style={styles.metricValue}>{performanceData.cpu_percent.toFixed(1)}%</div>
            <div style={styles.metricLabel}>CPU Usage</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricValue}>{performanceData.memory.percent.toFixed(1)}%</div>
            <div style={styles.metricLabel}>Memory Usage</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricValue}>{performanceData.disk.percent.toFixed(1)}%</div>
            <div style={styles.metricLabel}>Disk Usage</div>
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
  const [message, setMessage] = useState('');

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
        setMessage(`✓ ${result.message}`);
        fetchPorts();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(`✗ Error: ${error.detail}`);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage(`✗ Network error: ${error.message}`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (loading) {
    return (
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 style={styles.panelTitle}>
            <Network style={{width: '16px', height: '16px', marginRight: '8px'}} />
            PORT CONTROL
          </h2>
        </div>
        <div style={{...styles.p4, ...styles.textCenter, ...styles.textMilitary400}}>
          Scanning ports...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <h2 style={styles.panelTitle}>
          <Network style={{width: '16px', height: '16px', marginRight: '8px'}} />
          PORT CONTROL
        </h2>
        <div style={{...styles.flex, ...styles.itemsCenter, gap: '8px'}}>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#00ff41',
            borderRadius: '50%',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}></div>
          <span style={{...styles.textXs, ...styles.textTacticalGreen}}>{ports.length} ACTIVE</span>
        </div>
      </div>

      {message && (
        <div style={{
          margin: '16px',
          padding: '8px',
          border: '1px solid',
          fontSize: '12px',
          fontWeight: 'bold',
          backgroundColor: message.includes('✓') ? '#065f46' : '#7f1d1d',
          borderColor: message.includes('✓') ? '#065f46' : '#7f1d1d',
          color: message.includes('✓') ? '#6ee7b7' : '#fca5a5'
        }}>
          {message}
        </div>
      )}

      <div style={styles.p4}>
        {ports.length === 0 ? (
          <div style={{...styles.textCenter, padding: '32px 0'}}>
            <div style={{...styles.textMilitary400, ...styles.textSm}}>
              No active listening ports found
            </div>
          </div>
        ) : (
          <div>
            {ports.slice(0, 10).map((portInfo, index) => (
              <div key={index} style={styles.dataRow}>
                <div style={{...styles.flex, ...styles.itemsCenter, gap: '8px'}}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#00ff41',
                    borderRadius: '50%'
                  }}></div>
                  <span style={{...styles.fontBold, ...styles.textTacticalGreen}}>
                    {portInfo.port}
                  </span>
                </div>
                <div style={{...styles.textMilitary100, fontFamily: 'monospace'}}>
                  {portInfo.process_name}
                </div>
                <div style={styles.textMilitary400}>
                  PID: {portInfo.pid}
                </div>
                <div>
                  <button
                    onClick={() => killProcess(portInfo.port)}
                    style={{...styles.button, ...styles.btnDanger}}
                  >
                    <Kill style={{width: '12px', height: '12px'}} />
                    KILL
                  </button>
                </div>
              </div>
            ))}
          </div>
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
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 style={styles.panelTitle}>
            <Cpu style={{width: '16px', height: '16px', marginRight: '8px'}} />
            PROCESS MONITOR
          </h2>
        </div>
        <div style={{...styles.p4, ...styles.textCenter, ...styles.textMilitary400}}>
          Loading process data...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <h2 style={styles.panelTitle}>
          <Cpu style={{width: '16px', height: '16px', marginRight: '8px'}} />
          PROCESS MONITOR
        </h2>
        <div style={{...styles.flex, ...styles.itemsCenter, gap: '8px'}}>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#00ff41',
            borderRadius: '50%',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}></div>
          <span style={{...styles.textXs, ...styles.textTacticalGreen}}>{processes.length} PROCESSES</span>
        </div>
      </div>

      <div style={styles.p4}>
        <div style={styles.grid3}>
          <div style={styles.metricCard}>
            <div style={styles.metricValue}>
              {processes.filter(p => p.cpu_percent > 50).length}
            </div>
            <div style={styles.metricLabel}>CPU Heavy</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricValue}>
              {processes.filter(p => p.memory_mb > 1000).length}
            </div>
            <div style={styles.metricLabel}>Memory Heavy</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricValue}>
              {processes.length}
            </div>
            <div style={styles.metricLabel}>Total Processes</div>
          </div>
        </div>

        <div style={{marginTop: '16px'}}>
          {processes.slice(0, 15).map((process, index) => (
            <div key={index} style={styles.dataRow}>
              <div style={{...styles.textMilitary100, fontFamily: 'monospace'}}>
                {process.name}
              </div>
              <div style={{...styles.fontBold, color: process.cpu_percent > 50 ? '#ff6b35' : '#00ff41'}}>
                {process.cpu_percent.toFixed(1)}% CPU
              </div>
              <div style={{...styles.fontBold, color: process.memory_mb > 1000 ? '#ff6b35' : '#00ff41'}}>
                {process.memory_mb > 1024 ? `${(process.memory_mb / 1024).toFixed(1)}GB` : `${process.memory_mb.toFixed(0)}MB`}
              </div>
            </div>
          ))}
        </div>
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
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <h2 style={styles.panelTitle}>
          <Terminal style={{width: '16px', height: '16px', marginRight: '8px'}} />
          COMMAND RUNNER
        </h2>
      </div>

      <div style={styles.p4}>
        <div style={styles.grid2}>
          <div>
            <h3 style={{...styles.textXs, ...styles.fontBold, ...styles.textTacticalGreen, marginBottom: '12px'}}>
              SAVED COMMANDS
            </h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              {customCommands.map((cmd) => (
                <div key={cmd.id} style={{...styles.bgMilitary800, ...styles.border, ...styles.p3}}>
                  <div style={{...styles.justifyBetween, ...styles.mb2}}>
                    <div style={{...styles.fontBold, ...styles.textMilitary100, ...styles.textSm}}>
                      {cmd.name}
                    </div>
                    <button
                      onClick={() => executeCommand(cmd.command, cmd.name)}
                      disabled={executingCommand === cmd.name}
                      style={{
                        ...styles.button, ...styles.btnPrimary,
                        opacity: executingCommand === cmd.name ? 0.5 : 1,
                        cursor: executingCommand === cmd.name ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Play style={{width: '12px', height: '12px'}} />
                      {executingCommand === cmd.name ? 'RUNNING...' : 'RUN'}
                    </button>
                  </div>
                  <div style={{
                    ...styles.textXs,
                    ...styles.textMilitary400,
                    fontFamily: 'monospace',
                    backgroundColor: '#1a202c',
                    padding: '8px',
                    border: '1px solid #4a5568'
                  }}>
                    {cmd.command}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{...styles.textXs, ...styles.fontBold, ...styles.textTacticalGreen, marginBottom: '12px'}}>
              EXECUTION HISTORY
            </h3>
            <div style={{maxHeight: '384px', overflowY: 'auto'}}>
              {commandResults.length === 0 ? (
                <div style={{...styles.textCenter, padding: '32px 0', ...styles.textMilitary400, ...styles.textSm}}>
                  No commands executed yet
                </div>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  {commandResults.map((result) => (
                    <div key={result.id} style={{
                      border: '1px solid',
                      padding: '12px',
                      backgroundColor: result.success ? '#065f46' : '#7f1d1d',
                      borderColor: result.success ? '#065f46' : '#7f1d1d'
                    }}>
                      <div style={{...styles.justifyBetween, ...styles.mb2}}>
                        <div style={{...styles.flex, ...styles.itemsCenter, gap: '8px'}}>
                          {result.success ? (
                            <CheckCircle style={{width: '16px', height: '16px', color: '#6ee7b7'}} />
                          ) : (
                            <XCircle style={{width: '16px', height: '16px', color: '#fca5a5'}} />
                          )}
                          <span style={{...styles.fontBold, ...styles.textSm}}>
                            {result.name}
                          </span>
                        </div>
                        <span style={styles.textXs}>
                          {result.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div style={{...styles.textXs, fontFamily: 'monospace', marginBottom: '8px', color: '#d1fae5'}}>
                        {result.command}
                      </div>
                      {result.stdout && (
                        <div style={{
                          ...styles.textXs,
                          fontFamily: 'monospace',
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          padding: '8px',
                          marginBottom: '4px',
                          color: '#6ee7b7'
                        }}>
                          {result.stdout}
                        </div>
                      )}
                      {(result.stderr || result.error) && (
                        <div style={{
                          ...styles.textXs,
                          fontFamily: 'monospace',
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          padding: '8px',
                          color: '#fca5a5'
                        }}>
                          {result.stderr || result.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
  const [pingning, setPinging] = useState(false);

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
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 style={styles.panelTitle}>
            <Wifi style={{width: '16px', height: '16px', marginRight: '8px'}} />
            NETWORK HUB
          </h2>
        </div>
        <div style={{...styles.p4, ...styles.textCenter, ...styles.textMilitary400}}>
          Loading network information...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <h2 style={styles.panelTitle}>
          <Wifi style={{width: '16px', height: '16px', marginRight: '8px'}} />
          NETWORK HUB
        </h2>
        <div style={{...styles.flex, ...styles.itemsCenter, gap: '8px'}}>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#00ff41',
            borderRadius: '50%',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}></div>
          <span style={{...styles.textXs, ...styles.textTacticalGreen}}>CONNECTED</span>
        </div>
      </div>

      <div style={styles.p4}>
        <div style={styles.grid2}>
          <div>
            <h3 style={{...styles.textXs, ...styles.fontBold, ...styles.textTacticalGreen, marginBottom: '12px'}}>
              NETWORK INTERFACES
            </h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              {Object.entries(networkInfo.interfaces).map(([interfaceName, addresses]) => (
                <div key={interfaceName} style={{...styles.bgMilitary800, ...styles.border, ...styles.p3}}>
                  <div style={{...styles.justifyBetween, ...styles.mb2}}>
                    <div style={{...styles.fontBold, ...styles.textMilitary100, ...styles.textSm}}>
                      {interfaceName}
                    </div>
                    <div style={{...styles.flex, ...styles.itemsCenter, gap: '4px'}}>
                      <Activity style={{width: '12px', height: '12px', color: '#00ff41'}} />
                      <span style={{...styles.textXs, ...styles.textTacticalGreen}}>ACTIVE</span>
                    </div>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                    {addresses.map((addr, index) => (
                      <div key={index} style={styles.textXs}>
                        <span style={styles.textMilitary400}>{addr.family}:</span>
                        <span style={{...styles.textMilitary100, marginLeft: '8px', fontFamily: 'monospace'}}>
                          {addr.address}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{...styles.textXs, ...styles.fontBold, ...styles.textTacticalGreen, marginBottom: '12px'}}>
              LATENCY CHECKER
            </h3>
            <div style={{...styles.bgMilitary800, ...styles.border, ...styles.p3}}>
              <div style={{...styles.flex, gap: '8px', marginBottom: '12px'}}>
                <input
                  type="text"
                  placeholder="Enter host or IP..."
                  value={pingTarget}
                  onChange={(e) => setPingTarget(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && performPing()}
                  style={styles.input}
                />
                <button
                  onClick={performPing}
                  disabled={pingning}
                  style={{...styles.button, ...styles.btnPrimary}}
                >
                  <Zap style={{width: '12px', height: '12px'}} />
                  {pingning ? 'PINGING...' : 'PING'}
                </button>
              </div>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {pingResults.length === 0 ? (
                  <div style={{...styles.textCenter, padding: '16px 0', ...styles.textMilitary400, ...styles.textSm}}>
                    No ping tests performed yet
                  </div>
                ) : (
                  pingResults.map((result) => (
                    <div key={result.id} style={{
                      border: '1px solid',
                      padding: '8px',
                      backgroundColor: result.success ? '#065f46' : '#7f1d1d',
                      borderColor: result.success ? '#065f46' : '#7f1d1d'
                    }}>
                      <div style={{...styles.justifyBetween, ...styles.mb1}}>
                        <div style={{...styles.flex, ...styles.itemsCenter, gap: '8px'}}>
                          {result.success ? (
                            <CheckCircle style={{width: '12px', height: '12px', color: '#6ee7b7'}} />
                          ) : (
                            <XCircle style={{width: '12px', height: '12px', color: '#fca5a5'}} />
                          )}
                          <span style={{...styles.fontBold, ...styles.textXs}}>
                            {result.host}
                          </span>
                        </div>
                        <span style={styles.textXs}>
                          {result.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      {result.success && result.latency_ms && (
                        <div style={{...styles.textXs, ...styles.fontBold, color: '#6ee7b7'}}>
                          Latency: {result.latency_ms}ms
                        </div>
                      )}
                      {(result.error || !result.success) && (
                        <div style={{...styles.textXs, color: '#fca5a5'}}>
                          {result.error || 'Connection failed'}
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
    </div>
  );
};

export { SystemMonitor, PortControl, ProcessMonitor, CommandRunner, NetworkHub };
