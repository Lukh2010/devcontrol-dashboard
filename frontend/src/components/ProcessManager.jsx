import React, { useState, useEffect } from 'react';
import { Cpu, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';

const ProcessManager = ({ controlPassword }) => {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [killingPid, setKillingPid] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const styles = {
    card: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      marginBottom: '20px'
    },
    mobileScroll: {
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch'
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
      borderCollapse: 'collapse',
      fontSize: '13px',
      minWidth: '600px'
    },
    tableCell: {
      padding: '12px 16px',
      textAlign: 'left',
      borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
      whiteSpace: 'nowrap'
    },
    tableCellMobile: {
      padding: '8px 12px',
      fontSize: '12px'
    },
    tableHeader: {
      backgroundColor: '#f8f9fa',
      fontWeight: '600',
      color: '#495057'
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
      justifyContent: 'center',
      gap: '6px',
      minWidth: '44px',
      minHeight: '44px',
      touchAction: 'manipulation'
    },
    buttonDanger: {
      backgroundColor: '#dc3545',
      color: '#ffffff'
    },
    buttonDisabled: {
      backgroundColor: '#6c757d',
      cursor: 'not-allowed'
    },
    loading: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      color: '#6c757d'
    },
    error: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    success: {
      backgroundColor: '#d4edda',
      color: '#155724',
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    warning: {
      backgroundColor: '#fff3cd',
      color: '#856404',
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    cpuHigh: {
      color: '#dc3545',
      fontWeight: '600'
    },
    cpuMedium: {
      color: '#ffc107',
      fontWeight: '600'
    },
    cpuLow: {
      color: '#28a745',
      fontWeight: '600'
    },
    memoryHigh: {
      color: '#dc3545',
      fontWeight: '600'
    },
    actionCell: {
      width: '120px',
      textAlign: 'center'
    },
    refreshButton: {
      backgroundColor: 'transparent',
      color: '#6c757d',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      borderRadius: '8px',
      padding: '10px 12px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      minWidth: '44px',
      minHeight: '44px',
      touchAction: 'manipulation'
    },
    refreshButtonHover: {
      backgroundColor: '#f8f9fa'
    }
  };

  // Fetch processes
  const fetchProcesses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/processes');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setProcesses(data);
      
      // Check admin privileges
      try {
        const adminResponse = await fetch('/api/system/is-admin');
        if (adminResponse.ok) {
          const adminData = await adminResponse.json();
          setIsAdmin(adminData.is_admin);
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Kill process
  const killProcess = async (pid) => {
    if (!isAdmin) {
      setError('Administrator privileges required to kill processes');
      return;
    }

    try {
      setKillingPid(pid);
      setError(null);
      
      const response = await fetch(`/api/processes/${pid}/kill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DevControl-Password': controlPassword || ''
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to kill process');
      }
      
      // Show success message
      setError(null);
      
      // Refresh processes after a short delay
      setTimeout(() => {
        fetchProcesses();
      }, 1000);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setKillingPid(null);
    }
  };

  // Get CPU color class
  const getCpuClass = (cpu) => {
    if (cpu > 80) return styles.cpuHigh;
    if (cpu > 50) return styles.cpuMedium;
    return styles.cpuLow;
  };

  // Get memory color class
  const getMemoryClass = (memory) => {
    if (memory > 1000) return styles.memoryHigh; // > 1GB
    return '';
  };

  // Format memory
  const formatMemory = (memoryMb) => {
    if (memoryMb > 1024) {
      return `${(memoryMb / 1024).toFixed(1)}GB`;
    }
    return `${Math.round(memoryMb)}MB`;
  };

  // Initial fetch
  useEffect(() => {
    fetchProcesses();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchProcesses, 5000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>
            <Cpu style={{width: '20px', height: '20px'}} />
            Process Manager
          </h2>
        </div>
        <div style={styles.cardContent}>
          <div style={styles.loading}>
            <RefreshCw style={{width: '20px', height: '20px', marginRight: '8px'}} />
            Loading processes...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>
          <Cpu style={{width: '20px', height: '20px'}} />
          Process Manager
        </h2>
        <button
          style={styles.refreshButton}
          onClick={fetchProcesses}
          disabled={loading}
        >
          <RefreshCw style={{width: '16px', height: '16px'}} />
          Refresh
        </button>
      </div>
      
      <div style={styles.cardContent}>
        {!isAdmin && (
          <div style={styles.warning}>
            <AlertTriangle style={{width: '16px', height: '16px'}} />
            Limited functionality: Run dashboard as Administrator for full process control
          </div>
        )}
        
        {error && (
          <div style={styles.error}>
            <AlertTriangle style={{width: '16px', height: '16px'}} />
            {error}
          </div>
        )}
        
        {processes.length === 0 ? (
          <div style={styles.loading}>
            No processes found
          </div>
        ) : (
          <div style={styles.mobileScroll}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{...styles.tableCell, ...styles.tableHeader}}>PID</th>
                  <th style={{...styles.tableCell, ...styles.tableHeader}}>Name</th>
                  <th style={{...styles.tableCell, ...styles.tableHeader}}>CPU %</th>
                  <th style={{...styles.tableCell, ...styles.tableHeader}}>Memory</th>
                  <th style={{...styles.tableCell, ...styles.tableHeader}}>Status</th>
                  <th style={{...styles.tableCell, ...styles.tableHeader, ...styles.actionCell}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {processes.map((process) => (
                  <tr key={process.pid}>
                    <td style={styles.tableCell}>{process.pid}</td>
                    <td style={styles.tableCell}>{process.name}</td>
                    <td style={{...styles.tableCell, ...getCpuClass(process.cpu_percent)}}>
                      {process.cpu_percent}%
                    </td>
                    <td style={{...styles.tableCell, ...getMemoryClass(process.memory_mb)}}>
                      {formatMemory(process.memory_mb)}
                    </td>
                    <td style={styles.tableCell}>{process.status}</td>
                    <td style={{...styles.tableCell, ...styles.actionCell}}>
                      <button
                        style={{
                          ...styles.button,
                          ...styles.buttonDanger,
                          ...(killingPid === process.pid ? styles.buttonDisabled : {}),
                          ...(killingPid === process.pid ? {cursor: 'not-allowed'} : {})
                        }}
                        onClick={() => killProcess(process.pid)}
                        disabled={!isAdmin || killingPid !== null}
                        title={!isAdmin ? "Administrator privileges required" : `Kill process ${process.pid}`}
                      >
                        {killingPid === process.pid ? (
                          <RefreshCw style={{width: '16px', height: '16px'}} />
                        ) : (
                          <Trash2 style={{width: '16px', height: '16px'}} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div style={{marginTop: '16px', fontSize: '12px', color: '#6c757d'}}>
          Showing top 15 processes by CPU usage. Auto-refresh every 5 seconds.
        </div>
      </div>
    </div>
  );
};

export default ProcessManager;
