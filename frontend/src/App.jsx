import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Cpu, Network, Terminal, Wifi } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import SystemMonitor from './components/SystemMonitor';
import OverviewHighlights from './components/OverviewHighlights';
import PortControl from './components/PortControl';
import NetworkHub from './components/NetworkHub';
import WindowTerminal from './components/WindowTerminal';
import ProcessManager from './components/ProcessManager';
import { DashboardStreamProvider, useDashboardStream } from './features/dashboard/context/DashboardStreamContext';
import { useAuthStatus, usePasswordValidation } from './features/dashboard/hooks/useAuthStatus';

const PANELS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'ports', label: 'Ports', icon: Network },
  { id: 'process-manager', label: 'Processes', icon: Cpu },
  { id: 'commands', label: 'Terminal', icon: Terminal },
  { id: 'network', label: 'Network', icon: Wifi }
];

function AppContent() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activePanel, setActivePanel] = useState('overview');
  const [controlPassword, setControlPassword] = useState(() => sessionStorage.getItem('devcontrol-password') || '');

  const {
    systemInfo,
    performanceData,
    ports,
    processes,
    networkInfo,
    isAdmin,
    terminalState,
    streamStatus,
    reconnectAttempt,
    streamError,
    stale,
    lastHeartbeat,
    refreshProcesses,
    refreshPorts
  } = useDashboardStream();

  const authStatusQuery = useAuthStatus();
  const passwordProtectionEnabled = authStatusQuery.data?.enabled ?? true;
  const passwordValidationQuery = usePasswordValidation(controlPassword, passwordProtectionEnabled);

  const authState = useMemo(() => {
    if (!passwordProtectionEnabled) {
      return 'disabled';
    }
    if (!controlPassword) {
      return 'idle';
    }
    if (passwordValidationQuery.isLoading || passwordValidationQuery.isFetching) {
      return 'checking';
    }
    if (passwordValidationQuery.isError) {
      return 'error';
    }
    return passwordValidationQuery.data?.valid ? 'valid' : 'invalid';
  }, [
    controlPassword,
    passwordProtectionEnabled,
    passwordValidationQuery.data?.valid,
    passwordValidationQuery.isError,
    passwordValidationQuery.isFetching,
    passwordValidationQuery.isLoading
  ]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!passwordProtectionEnabled) {
      setControlPassword('');
      sessionStorage.removeItem('devcontrol-password');
    }
  }, [passwordProtectionEnabled]);

  const handlePasswordChange = (value) => {
    setControlPassword(value);
    if (value) {
      sessionStorage.setItem('devcontrol-password', value);
    } else {
      sessionStorage.removeItem('devcontrol-password');
    }
  };

  const formatTime = (date) => date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const accessBadgeClass = authState === 'disabled'
    ? 'status-warning'
    : authState === 'valid'
    ? 'status-success'
    : authState === 'checking'
      ? 'status-warning'
      : authState === 'invalid' || authState === 'error'
        ? 'status-danger'
        : 'status-warning';

  const accessBadgeText = authState === 'disabled'
    ? 'No Password'
    : authState === 'valid'
    ? 'Unlocked'
    : authState === 'checking'
      ? 'Checking'
      : authState === 'invalid'
        ? 'Rejected'
        : authState === 'error'
          ? 'Offline'
          : 'Locked';

  const passwordHint = authState === 'disabled'
    ? 'Password protection is disabled for this session.'
    : authState === 'valid'
    ? 'Password verified.'
    : authState === 'checking'
      ? 'Verifying password.'
      : authState === 'invalid'
        ? 'Password does not match the backend.'
        : authState === 'error'
          ? 'Backend unavailable for validation.'
          : 'Enter the startup password to unlock protected actions.';

  const renderContent = () => {
    if (activePanel === 'overview') {
      return (
        <motion.div
          key="overview"
          className="workspace-overview"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          <SystemMonitor performanceData={performanceData} />
          <OverviewHighlights
            systemInfo={systemInfo}
            processes={processes}
            ports={ports}
            networkInfo={networkInfo}
            streamStatus={streamStatus}
            terminalState={terminalState}
            isAdmin={isAdmin}
            stale={stale}
          />
        </motion.div>
      );
    }

    if (activePanel === 'ports') {
      return (
        <motion.div
          key="ports"
          className="workspace-single"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          <PortControl
            controlPassword={controlPassword}
            ports={ports}
            loading={!ports?.length && streamStatus !== 'connected'}
            onRefresh={refreshPorts}
          />
        </motion.div>
      );
    }

    if (activePanel === 'process-manager') {
      return (
        <motion.div
          key="process-manager"
          className="workspace-single"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          <ProcessManager
            controlPassword={controlPassword}
            processes={processes}
            loading={!processes?.length && streamStatus !== 'connected'}
            isAdmin={isAdmin}
            onRefresh={refreshProcesses}
          />
        </motion.div>
      );
    }

    if (activePanel === 'commands') {
      return (
        <motion.div
          key="commands"
          className="workspace-single"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          <WindowTerminal controlPassword={controlPassword} />
        </motion.div>
      );
    }

    return (
      <motion.div
        key="network"
        className="workspace-single"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        <NetworkHub
          networkInfo={networkInfo}
          loading={!networkInfo && streamStatus !== 'connected'}
        />
      </motion.div>
    );
  };

  return (
    <motion.div
      className="app-shell compact-shell"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <motion.header className="topbar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
        <div>
          <div className="topbar-kicker">DevControl</div>
          <h1 className="topbar-title">Local Control Dashboard</h1>
        </div>
        <div className="topbar-meta">
          <div className="topbar-chip">
            <span className={`status-badge ${accessBadgeClass}`}>{accessBadgeText}</span>
          </div>
          <div className="topbar-chip">
            <span className={`status-badge ${streamStatus === 'connected' ? 'status-success' : 'status-warning'}`}>
              {streamStatus === 'connected' ? 'Live Stream' : `Reconnecting (${reconnectAttempt})`}
            </span>
          </div>
          <div className="topbar-chip">
            <span className={`status-badge ${stale ? 'status-danger' : 'status-success'}`}>
              {stale ? 'Data Stale' : 'Data Fresh'}
            </span>
          </div>
          <div className="topbar-chip">{lastHeartbeat ? `Heartbeat ${new Date(lastHeartbeat).toLocaleTimeString()}` : 'Awaiting heartbeat...'}</div>
          <div className="topbar-chip">{formatTime(currentTime)}</div>
        </div>
      </motion.header>

      <motion.section
        className="toolbar-panel panel"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <div className="toolbar-row">
          <AnimatePresence initial={false}>
            {passwordProtectionEnabled ? (
              <motion.div
                className="toolbar-block"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
              <label className="field-label" htmlFor="control-password">Control Password</label>
              <input
                id="control-password"
                className="input compact-input"
                type="password"
                value={controlPassword}
                onChange={(event) => handlePasswordChange(event.target.value)}
                placeholder="Enter startup password"
              />
                <div className="input-hint">{streamError || passwordHint}</div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="toolbar-block toolbar-block-summary">
            <div className="summary-card">
              <span className="summary-label">Host</span>
              <span className="summary-value">{systemInfo?.hostname || 'Loading...'}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Platform</span>
              <span className="summary-value">{systemInfo?.platform || '...'}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Memory</span>
              <span className="summary-value">
                {systemInfo ? `${Math.round(systemInfo.memory_total / 1024 / 1024 / 1024)}GB` : '...'}
              </span>
            </div>
          </div>
        </div>

        <nav className="nav-pills compact-pills">
          {PANELS.map(({ id, label, icon: Icon }) => (
            <motion.button
              key={id}
              className={`nav-pill ${activePanel === id ? 'active' : ''}`}
              onClick={() => setActivePanel(id)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon size={16} />
              {label}
            </motion.button>
          ))}
        </nav>
      </motion.section>

      <AnimatePresence mode="wait" initial={false}>
        {renderContent()}
      </AnimatePresence>
    </motion.div>
  );
}

function App() {
  return (
    <DashboardStreamProvider>
      <AppContent />
    </DashboardStreamProvider>
  );
}

export default App;
