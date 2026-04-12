import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Network, Shield, Terminal, Wifi } from 'lucide-react';
import SystemMonitor from './components/SystemMonitor';
import PortControl from './components/PortControl';
import NetworkHub from './components/NetworkHub';
import WindowTerminal from './components/WindowTerminal';
import ProcessManager from './components/ProcessManager';

const PANELS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'ports', label: 'Ports', icon: Network },
  { id: 'process-manager', label: 'Processes', icon: Cpu },
  { id: 'commands', label: 'Terminal', icon: Terminal },
  { id: 'network', label: 'Network', icon: Wifi }
];

function App() {
  const [systemInfo, setSystemInfo] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activePanel, setActivePanel] = useState('overview');
  const [controlPassword, setControlPassword] = useState(() => sessionStorage.getItem('devcontrol-password') || '');
  const [authState, setAuthState] = useState(controlPassword ? 'checking' : 'idle');
  const [performanceData, setPerformanceData] = useState(null);
  const [ports, setPorts] = useState([]);
  const [portsLoading, setPortsLoading] = useState(true);
  const [processes, setProcesses] = useState([]);
  const [processesLoading, setProcessesLoading] = useState(true);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [networkLoading, setNetworkLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const fetchSystemInfo = async () => {
      try {
        const response = await fetch('/api/system/info');
        const data = await response.json();
        setSystemInfo(data);
      } catch (error) {
        console.error('Failed to fetch system info:', error);
      }
    };

    fetchSystemInfo();

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const response = await fetch('/api/system/performance');
        const data = await response.json();
        setPerformanceData(data);
      } catch (error) {
        console.error('Failed to fetch performance data:', error);
      }
    };

    fetchPerformance();
    const interval = setInterval(fetchPerformance, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchPorts = async () => {
      try {
        const response = await fetch('/api/ports');
        const data = await response.json();
        setPorts(data);
      } catch (error) {
        console.error('Failed to fetch ports:', error);
      } finally {
        setPortsLoading(false);
      }
    };

    fetchPorts();
    const interval = setInterval(fetchPorts, 12000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchProcesses = async () => {
      try {
        const response = await fetch('/api/processes');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        setProcesses(data);
      } catch (error) {
        console.error('Failed to fetch processes:', error);
      } finally {
        setProcessesLoading(false);
      }
    };

    fetchProcesses();
    const interval = setInterval(fetchProcesses, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchNetworkInfo = async () => {
      try {
        const response = await fetch('/api/network/info');
        const data = await response.json();
        setNetworkInfo(data);
      } catch (error) {
        console.error('Failed to fetch network info:', error);
      } finally {
        setNetworkLoading(false);
      }
    };

    fetchNetworkInfo();
    const interval = setInterval(fetchNetworkInfo, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchAdminState = async () => {
      try {
        const response = await fetch('/api/system/is-admin');
        if (!response.ok) {
          setIsAdmin(false);
          return;
        }
        const data = await response.json();
        setIsAdmin(Boolean(data.is_admin));
      } catch {
        setIsAdmin(false);
      }
    };

    fetchAdminState();
  }, []);

  useEffect(() => {
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
  }, [controlPassword]);

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

  const accessBadgeClass = authState === 'valid'
    ? 'status-success'
    : authState === 'checking'
      ? 'status-warning'
      : authState === 'invalid' || authState === 'error'
        ? 'status-danger'
        : 'status-warning';

  const accessBadgeText = authState === 'valid'
    ? 'Unlocked'
    : authState === 'checking'
      ? 'Checking'
      : authState === 'invalid'
        ? 'Rejected'
        : authState === 'error'
          ? 'Offline'
          : 'Locked';

  const passwordHint = authState === 'valid'
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
            loading={portsLoading}
            onRefresh={async () => {
              const response = await fetch('/api/ports');
              const data = await response.json();
              setPorts(data);
              setPortsLoading(false);
            }}
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
            loading={portsLoading}
            onRefresh={async () => {
              const response = await fetch('/api/ports');
              const data = await response.json();
              setPorts(data);
              setPortsLoading(false);
            }}
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
            loading={processesLoading}
            isAdmin={isAdmin}
            onRefresh={async () => {
              const response = await fetch('/api/processes');
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
              const data = await response.json();
              setProcesses(data);
              setProcessesLoading(false);
            }}
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
          loading={networkLoading}
          onRefresh={async () => {
            const response = await fetch('/api/network/info');
            const data = await response.json();
            setNetworkInfo(data);
            setNetworkLoading(false);
          }}
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
          <div className="topbar-chip">{formatTime(currentTime)}</div>
        </div>
      </header>

      <section className="toolbar-panel panel">
        <div className="toolbar-row">
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
            <div className="input-hint">{passwordHint}</div>
          </div>

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

export default App;
