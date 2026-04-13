import React, { useEffect, useState } from 'react';
import { Activity, Cpu, Network, Terminal, Wifi } from 'lucide-react';
import SystemMonitor from './components/SystemMonitor';
import PortControl from './components/PortControl';
import NetworkHub from './components/NetworkHub';
import WindowTerminal from './components/WindowTerminal';
import ProcessManager from './components/ProcessManager';
import { DashboardStreamProvider, useDashboardStream } from './context/DashboardStreamContext';

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
  const [passwordProtectionEnabled, setPasswordProtectionEnabled] = useState(true);
  const [authState, setAuthState] = useState(controlPassword ? 'checking' : 'idle');

  const {
    systemInfo,
    performanceData,
    ports,
    processes,
    networkInfo,
    isAdmin,
    streamStatus,
    reconnectAttempt,
    streamError,
    stale,
    lastHeartbeat,
    refreshProcesses,
    refreshPorts
  } = useDashboardStream();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        if (!cancelled) {
          const enabled = Boolean(data.enabled);
          setPasswordProtectionEnabled(enabled);
          if (!enabled) {
            setAuthState('disabled');
            setControlPassword('');
            sessionStorage.removeItem('devcontrol-password');
          }
        }
      } catch {
        if (!cancelled) {
          setPasswordProtectionEnabled(true);
        }
      }
    };

    loadAuthStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!passwordProtectionEnabled) {
      setAuthState('disabled');
      return undefined;
    }

    if (!controlPassword) {
      setAuthState('idle');
      return undefined;
    }

    let cancelled = false;
    setAuthState('checking');

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch('/api/auth/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ password: controlPassword })
        });

        const data = await response.json();
        if (!cancelled) {
          setAuthState(response.ok && data.valid ? 'valid' : 'invalid');
        }
      } catch {
        if (!cancelled) {
          setAuthState('error');
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [controlPassword, passwordProtectionEnabled]);

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
        <div className="workspace-overview">
          <SystemMonitor performanceData={performanceData} />
          <PortControl
            controlPassword={controlPassword}
            ports={ports}
            loading={!ports?.length && streamStatus !== 'connected'}
            onRefresh={refreshPorts}
          />
        </div>
      );
    }

    if (activePanel === 'ports') {
      return (
        <div className="workspace-single">
          <PortControl
            controlPassword={controlPassword}
            ports={ports}
            loading={!ports?.length && streamStatus !== 'connected'}
            onRefresh={refreshPorts}
          />
        </div>
      );
    }

    if (activePanel === 'process-manager') {
      return (
        <div className="workspace-single">
          <ProcessManager
            controlPassword={controlPassword}
            processes={processes}
            loading={!processes?.length && streamStatus !== 'connected'}
            isAdmin={isAdmin}
            onRefresh={refreshProcesses}
          />
        </div>
      );
    }

    if (activePanel === 'commands') {
      return (
        <div className="workspace-single">
          <WindowTerminal controlPassword={controlPassword} />
        </div>
      );
    }

    return (
      <div className="workspace-single">
        <NetworkHub
          networkInfo={networkInfo}
          loading={!networkInfo && streamStatus !== 'connected'}
        />
      </div>
    );
  };

  return (
    <div className="app-shell compact-shell">
      <header className="topbar">
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
      </header>

      <section className="toolbar-panel panel">
        <div className="toolbar-row">
          {passwordProtectionEnabled ? (
            <div className="toolbar-block">
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
            </div>
          ) : null}

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
            <button
              key={id}
              className={`nav-pill ${activePanel === id ? 'active' : ''}`}
              onClick={() => setActivePanel(id)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </section>

      {renderContent()}
    </div>
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
