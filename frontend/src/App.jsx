import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Cpu,
  HardDrive,
  LockKeyhole,
  Network,
  Shield,
  Terminal,
  Wifi
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import NetworkHub from './components/NetworkHub';
import OverviewHighlights from './components/OverviewHighlights';
import PortControl from './components/PortControl';
import ProcessManager from './components/ProcessManager';
import SystemMonitor from './components/SystemMonitor';
import WindowTerminal from './components/WindowTerminal';
import { DashboardStreamProvider, useDashboardStream } from './features/dashboard/context/DashboardStreamContext';
import { useAuthStatus, usePasswordValidation } from './features/dashboard/hooks/useAuthStatus';

const PANELS = [
  {
    id: 'overview',
    label: 'Overview',
    icon: Activity
  },
  {
    id: 'ports',
    label: 'Ports',
    icon: Network
  },
  {
    id: 'process-manager',
    label: 'Processes',
    icon: Cpu
  },
  {
    id: 'commands',
    label: 'Terminal',
    icon: Terminal
  },
  {
    id: 'network',
    label: 'Network',
    icon: Wifi
  }
];

const PANEL_TITLES = {
  overview: {
    title: 'Overview',
    subtitle: 'Live telemetry and status.'
  },
  ports: {
    title: 'Ports',
    subtitle: 'Listening services.'
  },
  'process-manager': {
    title: 'Processes',
    subtitle: 'CPU-heavy tasks.'
  },
  commands: {
    title: 'Terminal',
    subtitle: 'Protected command access.'
  },
  network: {
    title: 'Network',
    subtitle: 'Interfaces and gateway.'
  }
};

function formatClock(date) {
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatLastSeen(value) {
  if (!value) {
    return 'Awaiting heartbeat';
  }

  return new Date(value).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatBytesToGb(value) {
  if (!value) {
    return '...';
  }

  return `${Math.round(value / 1024 / 1024 / 1024)} GB`;
}

function AppContent() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activePanel, setActivePanel] = useState('overview');
  const [controlPassword, setControlPassword] = useState('');

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
    lastAction,
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
    }
  }, [passwordProtectionEnabled]);

  useEffect(() => {
    let cancelled = false;

    const syncSession = async () => {
      if (!passwordProtectionEnabled || !controlPassword || !passwordValidationQuery.data?.valid) {
        await fetch('/api/auth/session', {
          method: 'DELETE',
          credentials: 'same-origin'
        }).catch(() => {});
        return;
      }

      try {
        const response = await fetch('/api/auth/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'same-origin',
          body: JSON.stringify({ password: controlPassword })
        });

        if (!response.ok && !cancelled) {
          setControlPassword('');
        }
      } catch {
        if (!cancelled) {
          setControlPassword('');
        }
      }
    };

    void syncSession();

    return () => {
      cancelled = true;
    };
  }, [controlPassword, passwordProtectionEnabled, passwordValidationQuery.data?.valid]);

  const authBadge = authState === 'disabled'
    ? { tone: 'status-neutral', label: 'No Password' }
    : authState === 'valid'
      ? { tone: 'status-success', label: 'Unlocked' }
      : authState === 'checking'
        ? { tone: 'status-warning', label: 'Checking' }
        : authState === 'invalid'
          ? { tone: 'status-danger', label: 'Rejected' }
          : authState === 'error'
            ? { tone: 'status-danger', label: 'Offline' }
            : { tone: 'status-warning', label: 'Locked' };

  const streamBadge = streamStatus === 'connected'
    ? { tone: stale ? 'status-warning' : 'status-success', label: stale ? 'Stale stream' : 'Live stream' }
    : { tone: 'status-warning', label: reconnectAttempt ? `Reconnecting x${reconnectAttempt}` : 'Connecting' };

  const terminalBadge = terminalState === 'connected'
    ? { tone: 'status-success', label: 'Terminal ready' }
    : { tone: 'status-neutral', label: 'Terminal idle' };

  const passwordHint = authState === 'disabled'
    ? 'Protection disabled for this session.'
    : authState === 'valid'
      ? 'Protected actions unlocked.'
      : authState === 'checking'
        ? 'Validating password.'
        : authState === 'invalid'
          ? 'Password does not match.'
          : authState === 'error'
            ? 'Validation unavailable.'
            : 'Enter the startup password.';

  const quickStats = [
    {
      label: 'Host',
      value: systemInfo?.hostname || 'Loading',
      hint: systemInfo?.platform || 'Waiting',
      icon: Shield
    },
    {
      label: 'Memory',
      value: formatBytesToGb(systemInfo?.memory_total),
      hint: performanceData ? `${Math.round(performanceData.memory.percent)}% used` : 'Waiting',
      icon: HardDrive
    },
    {
      label: 'Processes',
      value: String(processes?.length || 0),
      hint: processes?.[0] ? processes[0].name : 'No sample',
      icon: Cpu
    },
    {
      label: 'Ports',
      value: String(ports?.length || 0),
      hint: networkInfo?.default_gateway || 'No gateway',
      icon: ArrowUpRight
    }
  ];

  const telemetryCards = [
    {
      label: 'CPU load',
      value: performanceData ? `${performanceData.cpu_percent.toFixed(1)}%` : '...',
      progress: performanceData?.cpu_percent ?? 0
    },
    {
      label: 'Memory pressure',
      value: performanceData ? `${performanceData.memory.percent.toFixed(1)}%` : '...',
      progress: performanceData?.memory.percent ?? 0
    },
    {
      label: 'Disk usage',
      value: performanceData ? `${performanceData.disk.percent.toFixed(1)}%` : '...',
      progress: performanceData?.disk.percent ?? 0
    }
  ];

  const panelMeta = PANEL_TITLES[activePanel];

  const renderContent = () => {
    if (activePanel === 'overview') {
      return (
        <motion.div
          key="overview"
          className="workspace-overview"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
        >
          <WindowTerminal controlPassword={controlPassword} />
        </motion.div>
      );
    }

    return (
      <motion.div
        key="network"
        className="workspace-single"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
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
      className="app-shell"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <section className="hero-panel panel">
        <div className="hero-copy">
          <span className="hero-kicker">DevControl dashboard</span>
          <h1 className="hero-title">Modern control surface for your local machine.</h1>
          <div className="hero-badges">
            <span className={`status-badge ${authBadge.tone}`}>{authBadge.label}</span>
            <span className={`status-badge ${streamBadge.tone}`}>{streamBadge.label}</span>
            <span className={`status-badge ${terminalBadge.tone}`}>{terminalBadge.label}</span>
          </div>
        </div>

        <div className="hero-aside">
          <div className="hero-clock">{formatClock(currentTime)}</div>
          <div className="hero-meta">Heartbeat {formatLastSeen(lastHeartbeat)}</div>
          <div className="hero-meta">
            {stale ? 'Telemetry needs refresh' : 'Telemetry pipeline is healthy'}
          </div>
          {lastAction ? (
            <div className="hero-meta">
              Last action: {lastAction.action} / {lastAction.status}
            </div>
          ) : null}
        </div>
      </section>

      <section className="dashboard-grid">
        <aside className="sidebar-stack">
          <section className="panel control-panel">
            <div className="panel-header compact-header">
              <div className="panel-title-wrap">
                <span className="panel-icon">
                  <LockKeyhole size={18} />
                </span>
                <div>
                  <h2 className="panel-title">Control access</h2>
                </div>
              </div>
            </div>

            <div className="panel-body stack">
              <AnimatePresence initial={false}>
                {passwordProtectionEnabled ? (
                  <motion.div
                    key="password"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <label className="field-label" htmlFor="control-password">Control Password</label>
                    <input
                      id="control-password"
                      className="input"
                      type="password"
                      value={controlPassword}
                      onChange={(event) => setControlPassword(event.target.value)}
                      placeholder="Enter startup password"
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div className="glass-note">
                <span className={`status-badge ${authBadge.tone}`}>{authBadge.label}</span>
                <p>{streamError || passwordHint}</p>
              </div>

              <div className="stat-grid">
                {quickStats.map(({ label, value, hint, icon: Icon }) => (
                  <div key={label} className="mini-card stat-card">
                    <div className="stat-card-top">
                      <span className="panel-icon small-icon">
                        <Icon size={15} />
                      </span>
                      <span className="metric-eyebrow">{label}</span>
                    </div>
                    <p className="metric-reading compact-reading">{value}</p>
                    <p className="muted-note">{hint}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header compact-header">
              <div className="panel-title-wrap">
                <span className="panel-icon">
                  <Activity size={18} />
                </span>
                <div>
                  <h2 className="panel-title">Telemetry pulse</h2>
                </div>
              </div>
            </div>
            <div className="panel-body stack">
              {telemetryCards.map((card) => (
                <div key={card.label} className="telemetry-card">
                  <div className="telemetry-card-row">
                    <span className="metric-eyebrow">{card.label}</span>
                    <span className="telemetry-value">{card.value}</span>
                  </div>
                  <div className="progress-track strong-track">
                    <div className="progress-fill" style={{ width: `${card.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <main className="workspace-stack">
          <section className="panel nav-panel">
            <div className="panel-header compact-header">
              <div>
                <h2 className="panel-title">{panelMeta.title}</h2>
                <p className="panel-subtitle">{panelMeta.subtitle}</p>
              </div>
              <div className="chip-row">
                <span className={`status-badge ${streamBadge.tone}`}>{streamBadge.label}</span>
                <span className={`status-badge ${isAdmin ? 'status-success' : 'status-warning'}`}>
                  {isAdmin ? 'Admin' : 'User mode'}
                </span>
              </div>
            </div>

            <div className="panel-body">
              <nav className="nav-grid">
                {PANELS.map(({ id, label, icon: Icon }) => (
                  <motion.button
                    key={id}
                    type="button"
                    className={`nav-card ${activePanel === id ? 'active' : ''}`}
                    onClick={() => setActivePanel(id)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <span className="panel-icon nav-icon">
                      <Icon size={16} />
                    </span>
                    <span className="nav-card-label">{label}</span>
                  </motion.button>
                ))}
              </nav>
            </div>
          </section>

          <AnimatePresence mode="wait" initial={false}>
            {renderContent()}
          </AnimatePresence>
        </main>
      </section>
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
