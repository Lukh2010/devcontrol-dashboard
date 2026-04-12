import React, { useState } from 'react';
import { Activity, Wifi } from 'lucide-react';

const NetworkHub = ({ networkInfo, loading }) => {
  const [pingTarget, setPingTarget] = useState('google.com');
  const [pingResults, setPingResults] = useState([]);
  const [pinging, setPinging] = useState(false);

  const performPing = async (target = pingTarget) => {
    if (!target.trim()) return;

    setPinging(true);
    try {
      const response = await fetch('/api/network/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ host: target })
      });

      const result = await response.json();
      setPingResults((prev) => [{
        id: Date.now(),
        host: target,
        latency_ms: result.latency_ms,
        success: result.success,
        error: result.error,
        timestamp: new Date()
      }, ...prev].slice(0, 5));
    } catch (error) {
      setPingResults((prev) => [{
        id: Date.now(),
        host: target,
        success: false,
        error: error.message,
        timestamp: new Date()
      }, ...prev].slice(0, 5));
    } finally {
      setPinging(false);
    }
  };

  const getConnectionStatus = () => {
    if (!networkInfo) return { className: 'status-warning', text: 'Checking' };

    const hasInterfaces = Object.keys(networkInfo.interfaces || {}).length > 0;
    const hasIPv4 = Object.values(networkInfo.interfaces || {}).some((addrs) =>
      addrs.some((addr) => addr.family === 'IPv4')
    );

    if (hasInterfaces && hasIPv4) {
      return { className: 'status-success', text: 'Connected' };
    }

    return { className: 'status-danger', text: 'Disconnected' };
  };

  if (loading || !networkInfo) {
    return (
      <section className="panel">
        <div className="panel-header">
          <div className="panel-title-wrap">
            <span className="panel-icon">
              <Wifi size={18} />
            </span>
            <div>
              <h2 className="panel-title">Network Hub</h2>
              <p className="panel-subtitle">Interface inventory and reachability checks.</p>
            </div>
          </div>
        </div>
        <div className="panel-body">
          <div className="center-empty">Loading network information...</div>
        </div>
      </section>
    );
  }

  const connectionStatus = getConnectionStatus();

  return (
    <section className="panel">
      <div className="panel-header">
        <div className="panel-title-wrap">
          <span className="panel-icon">
            <Wifi size={18} />
          </span>
          <div>
            <h2 className="panel-title">Network Hub</h2>
            <p className="panel-subtitle">Reachability checks, interfaces, and gateway overview.</p>
          </div>
        </div>

        <span className={`status-badge ${connectionStatus.className}`}>
          {connectionStatus.text}
        </span>
      </div>
      <div className="panel-body stack">
        <div className="network-grid">
          {Object.entries(networkInfo.interfaces || {}).map(([interfaceName, addresses]) => (
            <div key={interfaceName} className="mini-card">
              <p className="metric-eyebrow">{interfaceName}</p>
              <div className="stack">
                {addresses.map((addr, index) => (
                  <div key={index} className="muted-note">
                    {addr.family}: {addr.address}
                    {addr.netmask && ` / ${addr.netmask}`}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mini-card">
          <p className="metric-eyebrow">Ping Target</p>
          <div className="control-layout">
            <div>
              <input
                className="input"
                type="text"
                placeholder="Enter hostname or IP address"
                value={pingTarget}
                onChange={(event) => setPingTarget(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && performPing()}
              />
            </div>
            <button className="button" onClick={() => performPing()} disabled={pinging}>
              <Activity size={16} />
              {pinging ? 'Pinging...' : 'Ping'}
            </button>
          </div>

          <div className="chip-row">
            {['google.com', '8.8.8.8', 'github.com', 'localhost'].map((target) => (
              <button
                key={target}
                className="chip"
                onClick={() => {
                  setPingTarget(target);
                  performPing(target);
                }}
              >
                {target}
              </button>
            ))}
          </div>
        </div>

        {pingResults.length > 0 && (
          <div className="results-grid">
            {pingResults.map((result) => (
              <div key={result.id} className="mini-card">
                <div className="panel-title-wrap" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <p className="metric-eyebrow">{result.host}</p>
                    <p className="muted-note">{result.timestamp.toLocaleTimeString()}</p>
                  </div>
                  <span className={`status-badge ${result.success ? 'status-success' : 'status-danger'}`}>
                    {result.success ? 'Reachable' : 'Failed'}
                  </span>
                </div>
                {result.success && result.latency_ms ? (
                  <div className="muted-note">Latency: {result.latency_ms}ms</div>
                ) : null}
                {result.error ? (
                  <div className="muted-note">Error: {result.error}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <div className="metrics-three">
          <div className="mini-card">
            <p className="metric-eyebrow">Hostname</p>
            <p className="metric-reading">{networkInfo.hostname || 'Unknown'}</p>
          </div>
          <div className="mini-card">
            <p className="metric-eyebrow">Interfaces</p>
            <p className="metric-reading">{Object.keys(networkInfo.interfaces || {}).length}</p>
          </div>
          <div className="mini-card">
            <p className="metric-eyebrow">Gateway</p>
            <p className="metric-reading">{networkInfo.default_gateway || 'Unknown'}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NetworkHub;
