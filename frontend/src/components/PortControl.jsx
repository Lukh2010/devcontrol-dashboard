import React, { useState, useEffect } from 'react';
import { Network, AlertTriangle, CheckCircle, XCircle, Kill } from 'lucide-react';

const PortControl = () => {
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPorts();
    const interval = setInterval(fetchPorts, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchPorts = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/ports');
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
      const response = await fetch(`http://localhost:8000/api/port/${port}`, {
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
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title flex items-center">
            <Network className="w-4 h-4 mr-2" />
            PORT CONTROL
          </h2>
        </div>
        <div className="p-4 text-center text-military-400">
          Scanning ports...
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title flex items-center">
          <Network className="w-4 h-4 mr-2" />
          PORT CONTROL
        </h2>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-tactical-green rounded-full animate-pulse"></div>
          <span className="text-xs text-tactical-green">{ports.length} ACTIVE</span>
        </div>
      </div>

      {message && (
        <div className={`mx-4 mt-4 p-2 border text-xs font-bold ${
          message.includes('✓') 
            ? 'bg-green-900 border-green-700 text-green-300' 
            : 'bg-red-900 border-red-700 text-red-300'
        }`}>
          {message}
        </div>
      )}

      <div className="p-4">
        {ports.length === 0 ? (
          <div className="text-center py-8">
            <XCircle className="w-12 h-12 text-military-600 mx-auto mb-2" />
            <div className="text-military-400 text-sm">No active listening ports found</div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-2 text-xs font-bold text-tactical-green border-b border-military-700 pb-2">
              <div>PORT</div>
              <div>PROCESS</div>
              <div>PID</div>
              <div>SERVICE</div>
              <div>ACTION</div>
            </div>
            
            {ports.map((portInfo, index) => (
              <div 
                key={index} 
                className="data-row border-b border-military-800"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-tactical-green rounded-full"></div>
                  <span className="font-bold text-tactical-green">{portInfo.port}</span>
                </div>
                <div className="text-military-100 font-mono text-xs truncate">
                  {portInfo.process_name}
                </div>
                <div className="text-military-400 text-xs">
                  {portInfo.pid}
                </div>
                <div className="text-xs">
                  <span className="px-2 py-1 bg-military-800 border border-military-600 text-military-300">
                    {getPortStatus(portInfo.port)}
                  </span>
                </div>
                <div>
                  <button
                    onClick={() => killProcess(portInfo.port)}
                    className="btn-danger flex items-center space-x-1"
                    title={`Kill process on port ${portInfo.port}`}
                  >
                    <Kill className="w-3 h-3" />
                    <span>KILL</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-3 bg-military-800 border border-military-700">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-tactical-orange" />
            <div className="text-xs font-bold text-tactical-orange">WARNING</div>
          </div>
          <div className="text-xs text-military-400">
            Terminating processes can cause data loss or system instability. 
            Use with caution and ensure you understand what each process does before killing it.
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-military-800 border border-military-700 p-3">
            <div className="text-xs font-bold text-tactical-green mb-2">COMMON PORTS</div>
            <div className="space-y-1 text-xs text-military-400">
              <div>80/443 - Web Servers</div>
              <div>3000/8000 - Development</div>
              <div>5432 - PostgreSQL</div>
              <div>3306 - MySQL</div>
            </div>
          </div>
          <div className="bg-military-800 border border-military-700 p-3">
            <div className="text-xs font-bold text-tactical-green mb-2">SYSTEM STATUS</div>
            <div className="space-y-1 text-xs text-military-400">
              <div>Total Ports: {ports.length}</div>
              <div>High Risk: {ports.filter(p => p.port < 1024).length}</div>
              <div>Dev Ports: {ports.filter(p => p.port >= 3000 && p.port <= 9000).length}</div>
              <div>Last Scan: Just now</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortControl;
