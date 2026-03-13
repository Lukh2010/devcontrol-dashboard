import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, Zap, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SystemMonitor = () => {
  const [performanceData, setPerformanceData] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    // Initial data fetch
    fetchPerformanceData();

    // Poll for updates every 2 seconds (replacing WebSocket)
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
    if (value < threshold) return 'status-online';
    if (value < threshold * 1.5) return 'status-warning';
    return 'status-offline';
  };

  if (!performanceData) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title flex items-center">
            <Activity className="w-4 h-4 mr-2" />
            SYSTEM MONITOR
          </h2>
        </div>
        <div className="p-4 text-center text-military-400">
          Loading system data...
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title flex items-center">
          <Activity className="w-4 h-4 mr-2" />
          SYSTEM MONITOR
        </h2>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-tactical-green rounded-full animate-pulse"></div>
          <span className="text-xs text-tactical-green">LIVE</span>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Performance Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="metric-card">
            <div className="flex items-center justify-between mb-2">
              <Cpu className="w-4 h-4 text-tactical-orange" />
              <span className={`text-xs font-bold ${getStatusColor(performanceData.cpu_percent, 70)}`}>
                {performanceData.cpu_percent > 70 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              </span>
            </div>
            <div className="metric-value">{performanceData.cpu_percent.toFixed(1)}%</div>
            <div className="metric-label">CPU Usage</div>
          </div>

          <div className="metric-card">
            <div className="flex items-center justify-between mb-2">
              <HardDrive className="w-4 h-4 text-tactical-orange" />
              <span className={`text-xs font-bold ${getStatusColor(performanceData.memory.percent, 80)}`}>
                {performanceData.memory.percent > 80 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              </span>
            </div>
            <div className="metric-value">{performanceData.memory.percent.toFixed(1)}%</div>
            <div className="metric-label">Memory Usage</div>
          </div>

          <div className="metric-card">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-4 h-4 text-tactical-orange" />
              <span className="text-xs font-bold text-military-400">
                <Activity className="w-3 h-3" />
              </span>
            </div>
            <div className="metric-value">{performanceData.disk.percent.toFixed(1)}%</div>
            <div className="metric-label">Disk Usage</div>
          </div>
        </div>

        {/* Memory Details */}
        <div className="bg-military-800 border border-military-700 p-3">
          <div className="text-xs font-bold text-tactical-green mb-2">MEMORY DETAILS</div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-military-400">Total:</span>
              <span className="text-military-100">{(performanceData.memory.total / 1024 / 1024 / 1024).toFixed(2)} GB</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-military-400">Used:</span>
              <span className="text-military-100">{(performanceData.memory.used / 1024 / 1024 / 1024).toFixed(2)} GB</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-military-400">Available:</span>
              <span className="text-military-100">{(performanceData.memory.available / 1024 / 1024 / 1024).toFixed(2)} GB</span>
            </div>
          </div>
        </div>

        {/* Performance Chart */}
        {history.length > 0 && (
          <div className="bg-military-800 border border-military-700 p-3">
            <div className="text-xs font-bold text-tactical-green mb-2">PERFORMANCE HISTORY</div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9ca3af" 
                  fontSize={10}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="#9ca3af" 
                  fontSize={10}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a202c', 
                    border: '1px solid #4a5568',
                    fontSize: '10px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke="#ff6b35" 
                  strokeWidth={2}
                  dot={false}
                  name="CPU %"
                />
                <Line 
                  type="monotone" 
                  dataKey="memory" 
                  stroke="#00ff41" 
                  strokeWidth={2}
                  dot={false}
                  name="Memory %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* System Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-military-800 border border-military-700 p-3">
            <div className="text-xs font-bold text-tactical-green mb-1">CPU INFO</div>
            <div className="text-xs text-military-400">
              <div>Cores: {performanceData.cpu_count}</div>
              <div>Usage: {performanceData.cpu_percent.toFixed(1)}%</div>
            </div>
          </div>
          <div className="bg-military-800 border border-military-700 p-3">
            <div className="text-xs font-bold text-tactical-green mb-1">DISK INFO</div>
            <div className="text-xs text-military-400">
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
