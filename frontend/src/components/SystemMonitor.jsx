import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';

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
  grid3: { gridTemplateColumns: 'repeat(3, 1fr)' },
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
  const [history, setHistory] = useState([]);

  useEffect(() => {
    // Initial data fetch
    fetchPerformanceData();

    // Poll for updates every 4 seconds (less frequent)
    const interval = setInterval(fetchPerformanceData, 4000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchPerformanceData = async () => {
    try {
      const response = await fetch('/api/system/performance');
      const data = await response.json();
      setPerformanceData(data);
      
      // Update history for the chart
      setHistory(prev => {
        const newHistory = [...prev, {
          time: new Date().toLocaleTimeString(),
          cpu: data.cpu_percent,
          memory: data.memory.percent
        }];
        return newHistory.slice(-20); // Keep last 20 data points
      });
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    }
  };

  const getStatusColor = (value, threshold) => {
    if (value < threshold) return 'status-online';
    if (value < threshold * 1.5) return 'status-warning';
    return 'status-offline';
  };

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

export default SystemMonitor;
