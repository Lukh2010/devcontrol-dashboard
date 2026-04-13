import React from 'react';
import { Wifi } from 'lucide-react';
import { motion } from 'motion/react';

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
              <h2 className="panel-title">Network Hub</h2>
              <p className="panel-subtitle">Interface inventory and gateway overview.</p>
            </div>
          </div>
        </div>
        <div className="panel-body">
          <div className="center-empty">Loading network information...</div>
        </div>
      </motion.section>
    );
  }

  const connectionStatus = getConnectionStatus();

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
            <motion.div
              key={interfaceName}
              className="mini-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <p className="metric-eyebrow">{interfaceName}</p>
              <div className="stack">
                {addresses.map((addr, index) => (
                  <div key={index} className="muted-note">
                    {addr.family}: {addr.address}
                    {addr.netmask && ` / ${addr.netmask}`}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="metrics-three">
          <motion.div className="mini-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="metric-eyebrow">Hostname</p>
            <p className="metric-reading">{networkInfo.hostname || 'Unknown'}</p>
          </motion.div>
          <motion.div className="mini-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="metric-eyebrow">Interfaces</p>
            <p className="metric-reading">{Object.keys(networkInfo.interfaces || {}).length}</p>
          </motion.div>
          <motion.div className="mini-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="metric-eyebrow">Gateway</p>
            <p className="metric-reading">{networkInfo.default_gateway || 'Unknown'}</p>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
};

export default NetworkHub;
