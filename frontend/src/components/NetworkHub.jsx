import React from 'react';
import { Wifi } from 'lucide-react';
import { motion } from 'motion/react';

function getPrimaryAddress(addresses, family) {
  return addresses.find((addr) => addr.family === family)?.address || null;
}

const NetworkHub = ({
  authHint = 'Unlock control access to view network details.',
  authUnlocked = false,
  createAuthSessionMutation,
  loading,
  networkInfo,
  passwordInput = '',
  passwordProtectionEnabled = true,
  setPasswordInput,
  unlockControl
}) => {
  const getConnectionStatus = () => {
    if (!networkInfo) return { className: 'status-warning', text: 'Checking' };

    if (networkInfo.sensitive_masked) {
      const maskedInterfaces = Object.keys(networkInfo.interfaces || {}).length;
      return {
        className: 'status-warning',
        text: maskedInterfaces > 0 ? 'Masked' : 'Locked'
      };
    }

    const hasInterfaces = Object.keys(networkInfo.interfaces || {}).length > 0;
    const hasIPv4 = Object.values(networkInfo.interfaces || {}).some((addrs) =>
      addrs.some((addr) => addr.family === 'IPv4')
    );

    if (hasInterfaces && hasIPv4) {
      return { className: 'status-success', text: 'Connected' };
    }

    return { className: 'status-danger', text: 'Offline' };
  };

  if (passwordProtectionEnabled && !authUnlocked) {
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

          <span className="status-badge status-warning">Locked</span>
        </div>
        <div className="panel-body">
          <div className="network-lock-view">
            <div className="center-empty compact-empty">
              <div className="stack">
                <p className="metric-reading compact-reading">Network is locked</p>
                <p className="muted-note">{authHint}</p>
              </div>
            </div>

            <div className="unlock-form network-unlock-form">
              <label className="field-label" htmlFor="network-control-password">Control Password</label>
              <input
                id="network-control-password"
                className="input"
                type="password"
                value={passwordInput}
                onChange={(event) => setPasswordInput?.(event.target.value)}
                placeholder="Enter startup password"
              />
              <button
                className="button"
                type="button"
                onClick={() => { void unlockControl?.(); }}
                disabled={createAuthSessionMutation?.isPending}
              >
                {createAuthSessionMutation?.isPending ? 'Unlocking...' : 'Unlock Network'}
              </button>
            </div>
          </div>
        </div>
      </motion.section>
    );
  }

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
  const accessStatus = !passwordProtectionEnabled
    ? { className: 'status-neutral', text: 'No password' }
    : authUnlocked && !networkInfo.sensitive_masked
      ? { className: 'status-success', text: 'Unlocked' }
      : { className: 'status-warning', text: 'Locked' };
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

        <div className="inline-badges">
          <span className={`status-badge ${accessStatus.className}`}>
            {accessStatus.text}
          </span>
          <span className={`status-badge ${connectionStatus.className}`}>
            {connectionStatus.text}
          </span>
        </div>
      </div>
      <div className="panel-body stack">
        {networkInfo.sensitive_masked ? (
          <div className="alert warning" aria-live="polite">
            Network details are partially hidden until control access is unlocked.
          </div>
        ) : passwordProtectionEnabled ? (
          <div className="alert success" aria-live="polite">
            Network details are unlocked for this control session.
          </div>
        ) : null}

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
