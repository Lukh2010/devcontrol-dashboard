import React, { useState, useEffect } from 'react';
import { Network } from 'lucide-react';

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
  button: {
    backgroundColor: '#ff5f57',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer'
  }
};

const PortControl = () => {
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPorts();
    const interval = setInterval(fetchPorts, 12000); // Refresh every 12 seconds (less frequent)
    return () => clearInterval(interval);
  }, []);

  const fetchPorts = async () => {
    try {
      const response = await fetch('/api/ports');
      const data = await response.json();
      setPorts(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch ports:', error);
      setLoading(false);
    }
  };

  const killProcess = async (port) => {
    try {
      const response = await fetch(`/api/port/${port}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        const result = await response.json();
        setMessage(`✓ ${result.message}`);
        fetchPorts(); // Refresh the list
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

  const getPortStatus = (port) => {
    const commonPorts = {
      20: 'FTP Data', 21: 'FTP Control', 22: 'SSH', 23: 'Telnet',
      25: 'SMTP', 53: 'DNS', 80: 'HTTP', 110: 'POP3',
      143: 'IMAP', 443: 'HTTPS', 993: 'IMAPS', 995: 'POP3S',
      3000: 'Dev Server', 8000: 'Dev Server', 8080: 'HTTP Alt',
      5432: 'PostgreSQL', 3306: 'MySQL', 6379: 'Redis'
    };
    return commonPorts[port] || 'Custom';
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
                      onClick={() => killProcess(portInfo.port)}
                      style={styles.button}
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

export default PortControl;
