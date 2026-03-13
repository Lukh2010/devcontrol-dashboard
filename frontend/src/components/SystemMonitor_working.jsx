import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, Zap, Activity, TrendingUp, TrendingDown } from 'lucide-react';

const styles = {
  panel: {
    backgroundColor: '#171923',
    border: '1px solid #4a5568',
    borderRadius: '4px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
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
  spaceY4: { marginBottom: '16px' },
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
  fontBold: { fontWeight: 'bold' },
  textMilitary100: { color: '#f0f4f8' },
  textMilitary400: { color: '#748894' },
  textTacticalGreen: { color: '#00ff41' },
  textTacticalOrange: { color: '#ff6b35' },
  bgMilitary800: { backgroundColor: '#2d3748' },
  border: { border: '1px solid #4a5568' },
  p3: { padding: '12px' },
  spaceY1: { marginBottom: '4px' },
  justifyBetweenFlex: { 
    display: 'flex', 
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  grid2: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(2, 1fr)', 
    gap: '12px' 
  },
  textCenter: { textAlign: 'center' }
};

const SystemMonitor = () => {
  const [performanceData, setPerformanceData] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    // Initial data fetch
    fetchPerformanceData();

    // Poll for updates every 2 seconds
    const interval = setInterval(fetchPerformanceData, 2000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchPerformanceData = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/system/performance');
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
    if (value < threshold) return '#00ff41';  // Green
    if (value < threshold * 1.5) return '#ff6b35'; // Orange
    return '#dc2626'; // Red
  };

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
        <div style={{...styles.flex, ...styles.itemsCenter, ...styles.spaceX2}}>
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
      
      <div style={{...styles.p4, ...styles.spaceY4}}>
        {/* Performance Metrics */}
        <div style={styles.grid3}>
          <div style={styles.metricCard}>
            <div style={{...styles.justifyBetweenFlex, ...styles.mb2}}>
              <Cpu style={{width: '16px', height: '16px', color: '#ff6b35'}} />
              <span style={{...styles.textXs, ...styles.fontBold, color: getStatusColor(performanceData.cpu_percent, 70)}}>
                {performanceData.cpu_percent > 70 ? 
                  <TrendingUp style={{width: '12px', height: '12px'}} /> : 
                  <TrendingDown style={{width: '12px', height: '12px'}} />
                }
              </span>
            </div>
            <div style={styles.metricValue}>{performanceData.cpu_percent.toFixed(1)}%</div>
            <div style={styles.metricLabel}>CPU Usage</div>
          </div>

          <div style={styles.metricCard}>
            <div style={{...styles.justifyBetweenFlex, ...styles.mb2}}>
              <HardDrive style={{width: '16px', height: '16px', color: '#ff6b35'}} />
              <span style={{...styles.textXs, ...styles.fontBold, color: getStatusColor(performanceData.memory.percent, 80)}}>
                {performanceData.memory.percent > 80 ? 
                  <TrendingUp style={{width: '12px', height: '12px'}} /> : 
                  <TrendingDown style={{width: '12px', height: '12px'}} />
                }
              </span>
            </div>
            <div style={styles.metricValue}>{performanceData.memory.percent.toFixed(1)}%</div>
            <div style={styles.metricLabel}>Memory Usage</div>
          </div>

          <div style={styles.metricCard}>
            <div style={{...styles.justifyBetweenFlex, ...styles.mb2}}>
              <Zap style={{width: '16px', height: '16px', color: '#ff6b35'}} />
              <span style={{...styles.textXs, ...styles.fontBold, ...styles.textMilitary400}}>
                <Activity style={{width: '12px', height: '12px'}} />
              </span>
            </div>
            <div style={styles.metricValue}>{performanceData.disk.percent.toFixed(1)}%</div>
            <div style={styles.metricLabel}>Disk Usage</div>
          </div>
        </div>

        {/* Memory Details */}
        <div style={{...styles.bgMilitary800, ...styles.border, ...styles.p3}}>
          <div style={{...styles.textXs, ...styles.fontBold, ...styles.textTacticalGreen, ...styles.mb2}}>
            MEMORY DETAILS
          </div>
          <div style={styles.spaceY1}>
            <div style={{...styles.justifyBetweenFlex, ...styles.textXs}}>
              <span style={styles.textMilitary400}>Total:</span>
              <span style={styles.textMilitary100}>
                {(performanceData.memory.total / 1024 / 1024 / 1024).toFixed(2)} GB
              </span>
            </div>
            <div style={{...styles.justifyBetweenFlex, ...styles.textXs}}>
              <span style={styles.textMilitary400}>Used:</span>
              <span style={styles.textMilitary100}>
                {(performanceData.memory.used / 1024 / 1024 / 1024).toFixed(2)} GB
              </span>
            </div>
            <div style={{...styles.justifyBetweenFlex, ...styles.textXs}}>
              <span style={styles.textMilitary400}>Available:</span>
              <span style={styles.textMilitary100}>
                {(performanceData.memory.available / 1024 / 1024 / 1024).toFixed(2)} GB
              </span>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div style={styles.grid2}>
          <div style={{...styles.bgMilitary800, ...styles.border, ...styles.p3}}>
            <div style={{...styles.textXs, ...styles.fontBold, ...styles.textTacticalGreen, ...styles.mb2}}>
              CPU INFO
            </div>
            <div style={styles.textXs}>
              <div>Cores: {performanceData.cpu_count}</div>
              <div>Usage: {performanceData.cpu_percent.toFixed(1)}%</div>
            </div>
          </div>
          <div style={{...styles.bgMilitary800, ...styles.border, ...styles.p3}}>
            <div style={{...styles.textXs, ...styles.fontBold, ...styles.textTacticalGreen, ...styles.mb2}}>
              DISK INFO
            </div>
            <div style={styles.textXs}>
              <div>Total: {(performanceData.disk.total / 1024 / 1024 / 1024).toFixed(0)} GB</div>
              <div>Free: {(performanceData.disk.free / 1024 / 1024 / 1024).toFixed(0)} GB</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemMonitor;
