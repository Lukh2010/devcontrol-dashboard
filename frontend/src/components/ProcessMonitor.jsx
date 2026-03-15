import React, { useState, useEffect } from 'react';
import { Cpu } from 'lucide-react';

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
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  button: {
    backgroundColor: '#007aff',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    color: '#6c757d',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  buttonActive: {
    backgroundColor: '#007aff',
    color: '#ffffff'
  }
};

const ProcessMonitor = () => {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('cpu');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchProcesses();
    const interval = setInterval(fetchProcesses, 8000); // Refresh every 8 seconds (less frequent)
    return () => clearInterval(interval);
  }, []);

  const fetchProcesses = async () => {
    try {
      const response = await fetch('/api/processes');
      const data = await response.json();
      setProcesses(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch processes:', error);
      setLoading(false);
    }
  };

  const getProcessStatus = (status) => {
    const statusMap = {
      'running': { color: 'status-online', icon: '●' },
      'sleeping': { color: 'status-warning', icon: '○' },
      'stopped': { color: 'status-offline', icon: '■' },
      'zombie': { color: 'status-offline', icon: '⚠' }
    };
    return statusMap[status.toLowerCase()] || { color: 'status-warning', icon: '?' };
  };

  const formatMemory = (mb) => {
    if (mb < 1024) return `${mb.toFixed(1)}MB`;
    return `${(mb / 1024).toFixed(1)}GB`;
  };

  const sortedAndFilteredProcesses = processes
    .filter(p => p.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'cpu') return b.cpu_percent - a.cpu_percent;
      if (sortBy === 'memory') return b.memory_mb - a.memory_mb;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>
            <Cpu style={{width: '20px', height: '20px'}} />
            Processes
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
          Processes
        </h2>
      </div>
      <div style={styles.cardContent}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.tableCell}>PID</th>
              <th style={styles.tableCell}>Name</th>
              <th style={styles.tableCell}>CPU %</th>
              <th style={styles.tableCell}>Memory</th>
              <th style={styles.tableCell}>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredProcesses.slice(0, 15).map((process, index) => (
              <tr key={index}>
                <td style={styles.tableCell}>{process.pid}</td>
                <td style={styles.tableCell}>{process.name}</td>
                <td style={styles.tableCell}>
                  <strong style={{color: process.cpu_percent > 50 ? '#ff5f57' : '#28ca42'}}>
                    {process.cpu_percent.toFixed(1)}%
                  </strong>
                </td>
                <td style={styles.tableCell}>{formatMemory(process.memory_mb)}</td>
                <td style={styles.tableCell}>
                  <span style={{
                    backgroundColor: process.status === 'running' ? '#d4edda' : '#fff3cd',
                    color: process.status === 'running' ? '#155724' : '#856404',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '500'
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

export default ProcessMonitor;
