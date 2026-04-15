import React from 'react';
import { Wifi } from 'lucide-react';
import { motion } from 'motion/react';

function getPrimaryAddress(addresses, family) {
  return addresses.find((addr) => addr.family === family)?.address || null;
}

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

    return { className: 'status-danger', text: 'Offline' };
  };

  if (loading || !networkInfo) {
    return (
      <motion.section
        className="panel"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className="panel-header">
          <div className="panel-title-wrap">
            <span className="panel-icon">
              <Wifi size={18} />
            </span>
            <div>
              <h2 className="panel-title">Network</h2>
            </div>
          </div>
        </div>
        <div className="panel-body">
          <div className="center-empty">Loading network data...</div>
        </div>
      </motion.section>
    );
  }

  const connectionStatus = getConnectionStatus();
  const interfaces = Object.entries(networkInfo.interfaces || {}).map(([interfaceName, addresses]) => ({
    interfaceName,
    ipv4: getPrimaryAddress(addresses, 'IPv4'),
    ipv6: getPrimaryAddress(addresses, 'IPv6')
  }));

  return (
    <motion.section
      className="panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="panel-header">
        <div className="panel-title-wrap">
          <span className="panel-icon">
            <Wifi size={18} />
          </span>
          <div>
            <h2 className="panel-title">Network</h2>
          </div>
        </div>

        <span className={`status-badge ${connectionStatus.className}`}>
          {connectionStatus.text}
        </span>
      </div>
      <div className="panel-body stack">
        <div className="network-grid">
          {interfaces.map(({ interfaceName, ipv4, ipv6 }) => (
            <motion.div
              key={interfaceName}
              className="mini-card network-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <p className="metric-eyebrow network-card-title">{interfaceName}</p>
              <div className="network-address-list">
                <div className="network-address-row">
                  <span className="network-address-label">IPv4</span>
                  <span className="network-address-value">{ipv4 || 'None'}</span>
                </div>
                <div className="network-address-row">
                  <span className="network-address-label">IPv6</span>
                  <span className="network-address-value">{ipv6 || 'None'}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="metrics-three">
          <motion.div className="mini-card status-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="metric-eyebrow">Host</p>
            <p className="metric-reading compact-reading clamp-text">{networkInfo.hostname || 'Unknown'}</p>
          </motion.div>
          <motion.div className="mini-card status-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="metric-eyebrow">Interfaces</p>
            <p className="metric-reading compact-reading">{interfaces.length}</p>
          </motion.div>
          <motion.div className="mini-card status-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="metric-eyebrow">Gateway</p>
            <p className="metric-reading compact-reading clamp-text">{networkInfo.default_gateway || 'Unknown'}</p>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
};

export default NetworkHub;
