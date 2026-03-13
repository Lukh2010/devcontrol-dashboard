import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, Activity, TrendingUp, AlertTriangle } from 'lucide-react';

const ProcessMonitor = () => {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('cpu');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchProcesses();
    const interval = setInterval(fetchProcesses, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchProcesses = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/processes');
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
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title flex items-center">
            <Cpu className="w-4 h-4 mr-2" />
            PROCESS MONITOR
          </h2>
        </div>
        <div className="p-4 text-center text-military-400">
          Loading process data...
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title flex items-center">
          <Cpu className="w-4 h-4 mr-2" />
          PROCESS MONITOR
        </h2>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-tactical-green rounded-full animate-pulse"></div>
          <span className="text-xs text-tactical-green">{processes.length} PROCESSES</span>
        </div>
      </div>

      <div className="p-4">
        {/* Controls */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <input
              type="text"
              placeholder="Filter processes..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-3 py-2 bg-military-800 border border-military-600 text-military-100 text-xs placeholder-military-500 focus:outline-none focus:border-tactical-green"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setSortBy('cpu')}
              className={`px-3 py-2 text-xs font-bold uppercase transition-colors ${
                sortBy === 'cpu' 
                  ? 'bg-tactical-green text-military-950' 
                  : 'btn-secondary'
              }`}
            >
              CPU
            </button>
            <button
              onClick={() => setSortBy('memory')}
              className={`px-3 py-2 text-xs font-bold uppercase transition-colors ${
                sortBy === 'memory' 
                  ? 'bg-tactical-green text-military-950' 
                  : 'btn-secondary'
              }`}
            >
              MEMORY
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-3 py-2 text-xs font-bold uppercase transition-colors ${
                sortBy === 'name' 
                  ? 'bg-tactical-green text-military-950' 
                  : 'btn-secondary'
              }`}
            >
              NAME
            </button>
          </div>
        </div>

        {/* Process List */}
        <div className="space-y-1">
          <div className="grid grid-cols-6 gap-2 text-xs font-bold text-tactical-green border-b border-military-700 pb-2">
            <div>PID</div>
            <div>NAME</div>
            <div>CPU %</div>
            <div>MEMORY</div>
            <div>STATUS</div>
            <div>PRIORITY</div>
          </div>
          
          {sortedAndFilteredProcesses.slice(0, 20).map((process, index) => {
            const statusInfo = getProcessStatus(process.status);
            const isHighCpu = process.cpu_percent > 50;
            const isHighMemory = process.memory_mb > 1000;
            
            return (
              <div 
                key={index}
                className={`data-row border-b border-military-800 ${
                  isHighCpu || isHighMemory ? 'bg-military-800' : ''
                }`}
              >
                <div className="text-military-400 text-xs font-mono">
                  {process.pid}
                </div>
                <div className="text-military-100 text-xs truncate font-mono">
                  {process.name}
                </div>
                <div className={`text-xs font-bold ${
                  isHighCpu ? 'status-warning' : 'status-online'
                }`}>
                  {process.cpu_percent.toFixed(1)}%
                </div>
                <div className={`text-xs font-bold ${
                  isHighMemory ? 'status-warning' : 'status-online'
                }`}>
                  {formatMemory(process.memory_mb)}
                </div>
                <div className="flex items-center space-x-1">
                  <span className={statusInfo.color}>{statusInfo.icon}</span>
                  <span className="text-xs text-military-400 capitalize">
                    {process.status}
                  </span>
                </div>
                <div>
                  {isHighCpu && (
                    <span className="px-2 py-1 bg-tactical-orange text-military-950 text-xs font-bold">
                      HIGH CPU
                    </span>
                  )}
                  {isHighMemory && (
                    <span className="px-2 py-1 bg-tactical-orange text-military-950 text-xs font-bold">
                      HIGH MEM
                    </span>
                  )}
                  {!isHighCpu && !isHighMemory && (
                    <span className="px-2 py-1 bg-military-700 text-military-300 text-xs">
                      NORMAL
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Statistics */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="bg-military-800 border border-military-700 p-3">
            <div className="text-xs font-bold text-tactical-green mb-2">CPU HEAVY</div>
            <div className="text-2xl font-bold text-tactical-orange">
              {processes.filter(p => p.cpu_percent > 50).length}
            </div>
            <div className="text-xs text-military-400">Processes &gt; 50% CPU</div>
          </div>
          <div className="bg-military-800 border border-military-700 p-3">
            <div className="text-xs font-bold text-tactical-green mb-2">MEMORY HEAVY</div>
            <div className="text-2xl font-bold text-tactical-orange">
              {processes.filter(p => p.memory_mb > 1000).length}
            </div>
            <div className="text-xs text-military-400">Processes &gt; 1GB RAM</div>
          </div>
          <div className="bg-military-800 border border-military-700 p-3">
            <div className="text-xs font-bold text-tactical-green mb-2">TOTAL PROCESSES</div>
            <div className="text-2xl font-bold text-tactical-green">
              {processes.length}
            </div>
            <div className="text-xs text-military-400">Active processes</div>
          </div>
        </div>

        {/* Top Processes */}
        <div className="mt-4 bg-military-800 border border-military-700 p-3">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingUp className="w-4 h-4 text-tactical-orange" />
            <div className="text-xs font-bold text-tactical-orange">TOP CONSUMERS</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-military-400 mb-1">Highest CPU</div>
              {processes.slice(0, 3).map((p, i) => (
                <div key={i} className="text-xs text-military-100 flex justify-between">
                  <span>{p.name}</span>
                  <span className="text-tactical-orange font-bold">{p.cpu_percent.toFixed(1)}%</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs text-military-400 mb-1">Highest Memory</div>
              {processes
                .sort((a, b) => b.memory_mb - a.memory_mb)
                .slice(0, 3)
                .map((p, i) => (
                  <div key={i} className="text-xs text-military-100 flex justify-between">
                    <span>{p.name}</span>
                    <span className="text-tactical-orange font-bold">{formatMemory(p.memory_mb)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-military-800 border border-military-700">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-tactical-orange" />
            <div className="text-xs font-bold text-tactical-orange">MONITORING TIPS</div>
          </div>
          <div className="text-xs text-military-400">
            • Processes using &gt;50% CPU may indicate performance issues<br/>
            • Memory usage &gt;1GB could impact system responsiveness<br/>
            • Zombie processes should be investigated and cleaned up<br/>
            • Sort by different metrics to identify resource bottlenecks
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessMonitor;
