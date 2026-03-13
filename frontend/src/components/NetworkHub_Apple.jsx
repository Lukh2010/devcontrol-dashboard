import React, { useState, useEffect } from 'react';
import { Wifi, Activity, Globe, AlertTriangle } from 'lucide-react';

const styles = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    padding: '20px'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px'
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1d1d1f',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  section: {
    marginBottom: '24px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: '12px'
  },
  interfaceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '12px'
  },
  interfaceCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid rgba(0, 0, 0, 0.1)'
  },
  interfaceName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: '8px'
  },
  addressList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  addressItem: {
    fontSize: '12px',
    color: '#6c757d',
    fontFamily: 'monospace',
    backgroundColor: '#ffffff',
    padding: '6px 8px',
    borderRadius: '4px',
    border: '1px solid rgba(0, 0, 0, 0.1)'
  },
  pingSection: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-end'
  },
  input: {
    backgroundColor: '#ffffff',
    border: '1px solid rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    flex: '1',
    outline: 'none'
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
  resultsList: {
    maxHeight: '300px',
    overflowY: 'auto',
    marginTop: '16px'
  },
  resultItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '8px',
    border: '1px solid rgba(0, 0, 0, 0.1)'
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  resultHost: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1d1d1f'
  },
  resultTime: {
    fontSize: '12px',
    color: '#6c757d'
  },
  resultStatus: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '500'
  },
  success: {
    backgroundColor: '#d4edda',
    color: '#155724'
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24'
  },
  latency: {
    fontSize: '13px',
    color: '#1d1d1f',
    fontFamily: 'monospace',
    backgroundColor: '#ffffff',
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid rgba(0, 0, 0, 0.1)'
  }
};

const NetworkHub = () => {
  const [networkInfo, setNetworkInfo] = useState(null);
  const [pingTarget, setPingTarget] = useState('google.com');
  const [pingResults, setPingResults] = useState([]);
  const [pinging, setPinging] = useState(false);

  useEffect(() => {
    fetchNetworkInfo();
    const interval = setInterval(fetchNetworkInfo, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchNetworkInfo = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/network/info');
      const data = await response.json();
      setNetworkInfo(data);
    } catch (error) {
      console.error('Failed to fetch network info:', error);
    }
  };

  const performPing = async () => {
    if (!pingTarget.trim()) return;
    
    setPinging(true);
    try {
      const response = await fetch('http://localhost:8000/api/network/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ target: pingTarget }),
      });
      
      const result = await response.json();
      
      setPingResults(prev => [{
        id: Date.now(),
        host: pingTarget,
        latency: result.latency,
        success: result.success,
        timestamp: new Date().toLocaleTimeString()
      }, ...prev].slice(-5)); // Keep last 5 results
    } catch (error) {
      setPingResults(prev => [{
        id: Date.now(),
        host: pingTarget,
        latency: 'Error',
        success: false,
        timestamp: new Date().toLocaleTimeString()
      }, ...prev].slice(-5));
    } finally {
      setPinging(false);
    }
  };

  if (!networkInfo) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            <Wifi style={{width: '20px', height: '20px'}} />
            Network Hub
          </h2>
        </div>
        <div style={{textAlign: 'center', padding: '40px 0', color: '#6c757d'}}>
          Loading network information...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          <Wifi style={{width: '20px', height: '20px'}} />
          Network Hub
        </h2>
      </div>

      {/* Network Interfaces */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Network Interfaces</h3>
        <div style={styles.interfaceGrid}>
          {Object.entries(networkInfo.interfaces || {}).map(([interfaceName, addresses]) => (
            <div key={interfaceName} style={styles.interfaceCard}>
              <div style={styles.interfaceName}>{interfaceName}</div>
              <div style={styles.addressList}>
                {addresses.map((addr, index) => (
                  <div key={index} style={styles.addressItem}>
                    {addr.family === 'IPv4' ? 'IPv4' : 'IPv6'}: {addr.address}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ping Tool */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Network Ping</h3>
        <div style={styles.pingSection}>
          <input
            type="text"
            placeholder="Enter hostname or IP address"
            value={pingTarget}
            onChange={(e) => setPingTarget(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && performPing()}
            style={styles.input}
          />
          <button
            onClick={performPing}
            disabled={pinging}
            style={styles.button}
          >
            <Activity style={{width: '16px', height: '16px'}} />
            {pinging ? 'Pinging...' : 'Ping'}
          </button>
        </div>

        {/* Ping Results */}
        {pingResults.length > 0 && (
          <div style={styles.resultsList}>
            {pingResults.map((result) => (
              <div key={result.id} style={styles.resultItem}>
                <div style={styles.resultHeader}>
                  <div style={styles.resultHost}>{result.host}</div>
                  <div style={styles.resultTime}>{result.timestamp}</div>
                </div>
                <div style={{...styles.resultStatus, ...(result.success ? styles.success : styles.error)}}>
                  {result.success ? 'Connected' : 'Failed'}
                </div>
                <div style={styles.latency}>
                  {result.success ? `${result.latency}ms` : result.latency}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Network Status */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Network Status</h3>
        <div style={styles.interfaceCard}>
          <div style={styles.interfaceName}>Default Gateway</div>
          <div style={styles.addressList}>
            <div style={styles.addressItem}>{networkInfo.default_gateway}</div>
          </div>
        </div>
        <div style={styles.interfaceCard}>
          <div style={styles.interfaceName}>Hostname</div>
          <div style={styles.addressList}>
            <div style={styles.addressItem}>{networkInfo.hostname}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkHub;
