import React, { useState, useEffect } from 'react';
import { Wifi, Activity } from 'lucide-react';

const styles = {
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
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
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
    alignItems: 'flex-end',
    marginBottom: '16px'
  },
  input: {
    backgroundColor: '#ffffff',
    border: '1px solid rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    flex: '1',
    outline: 'none',
    boxSizing: 'border-box'
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
  quickTargets: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '12px'
  },
  quickTargetButton: {
    backgroundColor: '#f8f9fa',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    color: '#6c757d',
    cursor: 'pointer',
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
    border: '1px solid rgba(0, 0, 0, 0.1)',
    marginTop: '8px'
  },
  statusIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '6px'
  },
  statusOnline: {
    backgroundColor: '#28ca42'
  },
  statusOffline: {
    backgroundColor: '#ff5f57'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px'
  },
  metricCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    textAlign: 'center'
  },
  metricValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: '4px'
  },
  metricLabel: {
    fontSize: '12px',
    color: '#6c757d',
    fontWeight: '500'
  }
};

const NetworkHub = () => {
  const [networkInfo, setNetworkInfo] = useState(null);
  const [pingTarget, setPingTarget] = useState('google.com');
  const [pingResults, setPingResults] = useState([]);
  const [pinging, setPinging] = useState(false);

  useEffect(() => {
    fetchNetworkInfo();
    const interval = setInterval(fetchNetworkInfo, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchNetworkInfo = async () => {
    try {
      const response = await fetch('/api/network/info');
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
      const response = await fetch('/api/network/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ host: pingTarget }),
      });
      
      const result = await response.json();
      
      setPingResults(prev => [{
        id: Date.now(),
        host: pingTarget,
        latency_ms: result.latency_ms,
        success: result.success,
        error: result.error,
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

  const formatTimestamp = (date) => {
    return date.toLocaleTimeString();
  };

  const getConnectionStatus = () => {
    if (!networkInfo) return { status: 'unknown', text: 'Checking...' };
    
    const hasInterfaces = Object.keys(networkInfo.interfaces || {}).length > 0;
    const hasIPv4 = Object.values(networkInfo.interfaces || {}).some(addrs => 
      addrs.some(addr => addr.family === 'IPv4')
    );
    
    if (hasInterfaces && hasIPv4) {
      return { status: 'connected', text: 'Connected' };
    } else {
      return { status: 'disconnected', text: 'Disconnected' };
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
          <div style={{textAlign: 'center', padding: '40px 0', color: '#6c757d'}}>
            Loading network information...
          </div>
        </div>
      </div>
    );
  }

  const connectionStatus = getConnectionStatus();

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>
          <Wifi style={{width: '20px', height: '20px'}} />
          Network Hub
        </h2>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <div style={{
            ...styles.statusIndicator,
            ...(connectionStatus.status === 'connected' ? styles.statusOnline : styles.statusOffline)
          }} />
          <span style={{
            fontSize: '12px',
            fontWeight: '600',
            color: connectionStatus.status === 'connected' ? '#28ca42' : '#ff5f57'
          }}>
            {connectionStatus.text}
          </span>
        </div>
      </div>
      <div style={styles.cardContent}>
        {/* Network Interfaces */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Network Interfaces</h3>
          <div style={styles.interfaceGrid}>
            {Object.entries(networkInfo.interfaces || {}).map(([interfaceName, addresses]) => (
              <div key={interfaceName} style={styles.interfaceCard}>
                <div style={styles.interfaceName}>
                  {interfaceName}
                  <Activity style={{width: '12px', height: '12px', color: '#28ca42'}} />
                </div>
                <div style={styles.addressList}>
                  {addresses.map((addr, index) => (
                    <div key={index} style={styles.addressItem}>
                      {addr.family}: {addr.address}
                      {addr.netmask && ` /${addr.netmask}`}
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

          {/* Quick Targets */}
          <div style={styles.quickTargets}>
            {['google.com', '8.8.8.8', 'github.com', 'localhost'].map((target) => (
              <button
                key={target}
                onClick={() => {
                  setPingTarget(target);
                  setTimeout(() => performPing(), 100);
                }}
                style={styles.quickTargetButton}
              >
                {target}
              </button>
            ))}
          </div>

          {/* Ping Results */}
          {pingResults.length > 0 && (
            <div style={styles.resultsList}>
              {pingResults.map((result) => (
                <div key={result.id} style={styles.resultItem}>
                  <div style={styles.resultHeader}>
                    <div style={styles.resultHost}>{result.host}</div>
                    <div style={styles.resultTime}>{formatTimestamp(result.timestamp)}</div>
                  </div>
                  <div style={{
                    ...styles.resultStatus,
                    ...(result.success ? styles.success : styles.error)
                  }}>
                    {result.success ? 'Connected' : 'Failed'}
                  </div>
                  {result.success && result.latency_ms && (
                    <div style={styles.latency}>
                      Latency: {result.latency_ms}ms
                    </div>
                  )}
                  {result.error && (
                    <div style={styles.latency}>
                      Error: {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Network Status */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Network Status</h3>
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <div style={styles.metricValue}>{networkInfo.hostname || 'Unknown'}</div>
              <div style={styles.metricLabel}>Hostname</div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricValue}>{Object.keys(networkInfo.interfaces || {}).length}</div>
              <div style={styles.metricLabel}>Interfaces</div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricValue}>{networkInfo.default_gateway || 'Unknown'}</div>
              <div style={styles.metricLabel}>Gateway</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkHub;
