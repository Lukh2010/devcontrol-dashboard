import React from 'react';
import { Wifi } from 'lucide-react';

const NetworkHub = ({ networkInfo, loading }) => {
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
              <p className="panel-subtitle">Interface inventory and gateway overview.</p>
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
            <p className="panel-subtitle">Interface inventory and gateway overview.</p>
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
