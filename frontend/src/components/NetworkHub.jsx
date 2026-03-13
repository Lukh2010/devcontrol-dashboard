  import React, { useState, useEffect } from 'react';
import { Wifi, Activity, Globe, AlertTriangle, CheckCircle, XCircle, Zap } from 'lucide-react';

const NetworkHub = () => {
  const [networkInfo, setNetworkInfo] = useState(null);
  const [pingTarget, setPingTarget] = useState('google.com');
  const [pingResults, setPingResults] = useState([]);
  const [pingning, setPinging] = useState(false);

  useEffect(() => {
    fetchNetworkInfo();
    const interval = setInterval(fetchNetworkInfo, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchNetworkInfo = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/network/info');
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
      const response = await fetch('http://localhost:8000/api/network/ping', {
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
        ...result,
        timestamp: new Date()
      }, ...prev].slice(0, 5)); // Keep last 5 results
      
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
    if (!networkInfo) return { status: 'unknown', color: 'status-warning', text: 'Checking...' };
    
    const hasInterfaces = Object.keys(networkInfo.interfaces).length > 0;
    const hasIPv4 = Object.values(networkInfo.interfaces).some(addrs => 
      addrs.some(addr => addr.family === 'IPv4')
    );
    
    if (hasInterfaces && hasIPv4) {
      return { status: 'connected', color: 'status-online', text: 'CONNECTED' };
    } else {
      return { status: 'disconnected', color: 'status-offline', text: 'DISCONNECTED' };
    }
  };

  if (!networkInfo) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title flex items-center">
            <Wifi className="w-4 h-4 mr-2" />
            NETWORK HUB
          </h2>
        </div>
        <div className="p-4 text-center text-military-400">
          Loading network information...
        </div>
      </div>
    );
  }

  const connectionStatus = getConnectionStatus();

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title flex items-center">
          <Wifi className="w-4 h-4 mr-2" />
          NETWORK HUB
        </h2>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            connectionStatus.status === 'connected' ? 'bg-tactical-green' : 'bg-tactical-orange'
          }`}></div>
          <span className={`text-xs font-bold ${connectionStatus.color}`}>
            {connectionStatus.text}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Network Interfaces */}
          <div>
            <h3 className="text-xs font-bold text-tactical-green mb-3">NETWORK INTERFACES</h3>
            <div className="space-y-2">
              {Object.entries(networkInfo.interfaces).map(([interfaceName, addresses]) => (
                <div key={interfaceName} className="bg-military-800 border border-military-700 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-military-100 text-sm">{interfaceName}</div>
                    <div className="flex items-center space-x-1">
                      <Activity className="w-3 h-3 text-tactical-green" />
                      <span className="text-xs text-tactical-green">ACTIVE</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {addresses.map((addr, index) => (
                      <div key={index} className="text-xs">
                        <span className="text-military-400">{addr.family}:</span>
                        <span className="text-military-100 ml-2 font-mono">{addr.address}</span>
                        {addr.netmask && (
                          <span className="text-military-500 ml-2">/{addr.netmask}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ping Tool */}
          <div>
            <h3 className="text-xs font-bold text-tactical-green mb-3">LATENCY CHECKER</h3>
            <div className="bg-military-800 border border-military-700 p-3">
              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  placeholder="Enter host or IP..."
                  value={pingTarget}
                  onChange={(e) => setPingTarget(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && performPing()}
                  className="flex-1 px-3 py-2 bg-military-900 border border-military-600 text-military-100 text-xs placeholder-military-500 focus:outline-none focus:border-tactical-green"
                />
                <button
                  onClick={performPing}
                  disabled={pingning}
                  className="btn-primary flex items-center space-x-1"
                >
                  <Zap className="w-3 h-3" />
                  <span>{pingning ? 'PINGING...' : 'PING'}</span>
                </button>
              </div>
              
              <div className="space-y-2">
                {pingResults.length === 0 ? (
                  <div className="text-center py-4 text-military-400 text-sm">
                    No ping tests performed yet
                  </div>
                ) : (
                  pingResults.map((result) => (
                    <div
                      key={result.id}
                      className={`border p-2 ${
                        result.success 
                          ? 'bg-green-900 border-green-700' 
                          : 'bg-red-900 border-red-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          {result.success ? (
                            <CheckCircle className="w-3 h-3 text-green-400" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-400" />
                          )}
                          <span className="text-xs font-bold">{result.host}</span>
                        </div>
                        <span className="text-xs text-military-400">
                          {formatTimestamp(result.timestamp)}
                        </span>
                      </div>
                      {result.success && result.latency_ms && (
                        <div className="text-xs text-green-300 font-bold">
                          Latency: {result.latency_ms}ms
                        </div>
                      )}
                      {(result.error || !result.success) && (
                        <div className="text-xs text-red-300">
                          {result.error || 'Connection failed'}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Ping Targets */}
            <div className="mt-3">
              <div className="text-xs text-military-400 mb-2">QUICK TARGETS:</div>
              <div className="flex flex-wrap gap-2">
                {['google.com', '8.8.8.8', 'github.com', 'localhost'].map((target) => (
                  <button
                    key={target}
                    onClick={() => {
                      setPingTarget(target);
                      setTimeout(() => performPing(), 100);
                    }}
                    className="px-2 py-1 bg-military-700 border border-military-600 text-xs text-military-300 hover:bg-military-600 transition-colors"
                  >
                    {target}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Network Statistics */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="metric-card">
            <div className="flex items-center justify-between mb-2">
              <Globe className="w-4 h-4 text-tactical-orange" />
              <span className="text-xs font-bold text-military-400">
                <Activity className="w-3 h-3" />
              </span>
            </div>
            <div className="metric-value">{networkInfo.hostname}</div>
            <div className="metric-label">Hostname</div>
          </div>

          <div className="metric-card">
            <div className="flex items-center justify-between mb-2">
              <Wifi className="w-4 h-4 text-tactical-orange" />
              <span className="text-xs font-bold text-military-400">
                <Activity className="w-3 h-3" />
              </span>
            </div>
            <div className="metric-value">{Object.keys(networkInfo.interfaces).length}</div>
            <div className="metric-label">Interfaces</div>
          </div>

          <div className="metric-card">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-4 h-4 text-tactical-orange" />
              <span className="text-xs font-bold text-military-400">
                <Activity className="w-3 h-3" />
              </span>
            </div>
            <div className="metric-value">{networkInfo.default_gateway || 'Unknown'}</div>
            <div className="metric-label">Gateway</div>
          </div>
        </div>

        {/* Network Tips */}
        <div className="mt-4 p-3 bg-military-800 border border-military-700">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-tactical-orange" />
            <div className="text-xs font-bold text-tactical-orange">NETWORK TIPS</div>
          </div>
          <div className="text-xs text-military-400">
            • Use the latency checker to test connection quality<br/>
            • Monitor multiple interfaces for different network connections<br/>
            • Ping your gateway to verify local network connectivity<br/>
            • Test external hosts to verify internet connectivity
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkHub;
