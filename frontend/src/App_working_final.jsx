import React, { useState, useEffect } from 'react';

const styles = {
  container: {
    backgroundColor: '#0a0e13',
    color: '#00ff41',
    minHeight: '100vh',
    padding: '20px',
    fontFamily: 'Courier New, monospace'
  },
  header: {
    backgroundColor: '#171923',
    border: '1px solid #4a5568',
    padding: '15px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    color: '#00ff41',
    fontSize: '20px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '2px'
  },
  panel: {
    backgroundColor: '#1a202c',
    border: '1px solid #4a5568',
    borderRadius: '4px',
    padding: '20px',
    marginBottom: '20px'
  },
  button: {
    backgroundColor: '#00ff41',
    color: '#0a0e13',
    border: '1px solid #00ff41',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    cursor: 'pointer',
    marginRight: '10px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
  },
  metricCard: {
    backgroundColor: '#2d3748',
    padding: '15px',
    border: '1px solid #4a5568'
  },
  metricValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ff6b35'
  },
  metricLabel: {
    fontSize: '12px',
    color: '#9ca3af',
    textTransform: 'uppercase',
    marginTop: '5px'
  }
};

function App() {
  const [systemInfo, setSystemInfo] = useState(null);
  const [processes, setProcesses] = useState([]);
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [systemRes, processesRes, portsRes] = await Promise.all([
        fetch('http://localhost:8000/api/system/info'),
        fetch('http://localhost:8000/api/processes'),
        fetch('http://localhost:8000/api/ports')
      ]);

      const [systemData, processesData, portsData] = await Promise.all([
        systemRes.json(),
        processesRes.json(),
        portsRes.json()
      ]);

      setSystemInfo(systemData);
      setProcesses(processesData.slice(0, 10));
      setPorts(portsData.slice(0, 10));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>DEVCONTROL DASHBOARD</div>
          <div>Loading...</div>
        </div>
        <div style={styles.panel}>
          <p>Initializing system monitoring...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>🎮 DEVCONTROL DASHBOARD</div>
        <div>{new Date().toLocaleString()}</div>
      </div>

      <div style={styles.panel}>
        <h2 style={{ color: '#00ff41', marginBottom: '15px' }}>SYSTEM OVERVIEW</h2>
        <div style={styles.grid}>
          <div style={styles.metricCard}>
            <div style={styles.metricValue}>{systemInfo?.hostname || 'Unknown'}</div>
            <div style={styles.metricLabel}>Hostname</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricValue}>{systemInfo?.cpu_count || 0}</div>
            <div style={styles.metricLabel}>CPU Cores</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricValue}>
              {Math.round((systemInfo?.memory_total || 0) / 1024 / 1024 / 1024)}GB
            </div>
            <div style={styles.metricLabel}>Total RAM</div>
          </div>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.panel}>
          <h3 style={{ color: '#00ff41', marginBottom: '15px' }}>TOP PROCESSES</h3>
          <div style={{ fontSize: '12px' }}>
            {processes.map((process, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '5px 0', 
                borderBottom: '1px solid #4a5568' 
              }}>
                <span>{process.name}</span>
                <span style={{ color: '#ff6b35' }}>{process.cpu_percent.toFixed(1)}% CPU</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.panel}>
          <h3 style={{ color: '#00ff41', marginBottom: '15px' }}>ACTIVE PORTS</h3>
          <div style={{ fontSize: '12px' }}>
            {ports.map((port, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '5px 0', 
                borderBottom: '1px solid #4a5568' 
              }}>
                <span>Port {port.port}</span>
                <span>{port.process_name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.panel}>
        <h3 style={{ color: '#00ff41', marginBottom: '15px' }}>SYSTEM STATUS</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button style={styles.button} onClick={() => window.location.reload()}>
            🔄 REFRESH
          </button>
          <button style={styles.button} onClick={() => fetchData()}>
            📊 UPDATE DATA
          </button>
        </div>
        <div style={{ marginTop: '15px', fontSize: '12px', color: '#9ca3af' }}>
          Backend: http://localhost:8000 | Frontend: http://localhost:3001
        </div>
      </div>
    </div>
  );
}

export default App;
