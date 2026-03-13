import React, { useState, useEffect } from 'react';
import { Cpu } from 'lucide-react';

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
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#ffffff'
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
  processName: {
    fontWeight: '600',
    color: '#1d1d1f'
  },
  highCpu: {
    color: '#dc3545',
    fontWeight: '700'
  },
  memoryText: {
    color: '#6c757d'
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
  statusRunning: {
    backgroundColor: '#d4edda',
    color: '#155724'
  },
  loadingText: {
    textAlign: 'center',
    padding: '40px 0',
    color: '#6c757d'
  }
};

const ProcessMonitor = () => {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProcesses = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/processes');
        const data = await response.json();
        
        // Remove duplicates and sort by CPU usage
        const uniqueProcesses = data.filter((process, index, self) => 
          index === self.findIndex((p) => p.pid === process.pid)
        );
        
        const sortedProcesses = uniqueProcesses.sort((a, b) => b.cpu_percent - a.cpu_percent);
        setProcesses(sortedProcesses);
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

  const formatMemory = (memoryMb) => {
    if (memoryMb >= 1024) {
      return `${(memoryMb / 1024).toFixed(1)}GB`;
    }
    return `${memoryMb.toFixed(0)}MB`;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            <Cpu style={{width: '20px', height: '20px'}} />
            Process Monitor
          </h2>
        </div>
        <div style={styles.loadingText}>
          Loading process data...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          <Cpu style={{width: '20px', height: '20px'}} />
          Process Monitor
        </h2>
      </div>
      
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
          {processes.slice(0, 20).map((process, index) => (
            <tr key={process.pid}>
              <td style={styles.tableCell}>
                <span style={styles.processName}>{process.name}</span>
              </td>
              <td style={styles.tableCell}>
                <span style={{...styles.highCpu, ...(process.cpu_percent > 50 ? {} : {})}}>
                  {process.cpu_percent.toFixed(1)}%
                </span>
              </td>
              <td style={styles.tableCell}>
                <span style={styles.memoryText}>{formatMemory(process.memory_mb)}</span>
              </td>
              <td style={styles.tableCell}>
                <span style={{...styles.statusBadge, ...styles.statusRunning}}>
                  {process.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProcessMonitor;
