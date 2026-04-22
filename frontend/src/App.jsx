import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Cpu,
  HardDrive,
  LockKeyhole,
  Network,
  RefreshCw,
  Shield,
  Terminal,
  Wifi
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import ActionFeed from './components/ActionFeed';
import AttentionPanel from './components/AttentionPanel';
import NetworkHub from './components/NetworkHub';
import PortControl from './components/PortControl';
import ProcessManager from './components/ProcessManager';
import SystemMonitor from './components/SystemMonitor';
import SystemReadiness from './components/SystemReadiness';
import ToastViewport from './components/ToastViewport';
import WindowTerminal from './components/WindowTerminal';
import { DashboardStreamProvider, useDashboardStream } from './features/dashboard/context/DashboardStreamContext';
import { useAuthStatus, useCreateAuthSession, useDeleteAuthSession } from './features/dashboard/hooks/useAuthStatus';

const PANEL_STORAGE_KEY = 'devcontrol.activePanel';

const PANELS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'ports', label: 'Ports', icon: Network },
  { id: 'process-manager', label: 'Processes', icon: Cpu },
  { id: 'commands', label: 'Terminal', icon: Terminal },
  { id: 'network', label: 'Network', icon: Wifi }
];

const PANEL_TITLES = {
  overview: { title: 'Overview', subtitle: 'Readiness, attention points and live action feedback.' },
  ports: { title: 'Ports', subtitle: 'Filter and stop only managed listeners.' },
  'process-manager': { title: 'Processes', subtitle: 'Search and control dashboard-managed processes.' },
  commands: { title: 'Terminal', subtitle: 'Guided command execution with explicit terminal states.' },
  network: { title: 'Network', subtitle: 'Interfaces, gateway and connectivity overview.' }
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

function getTerminalReadiness({ terminalState, terminalMessage, authUnlocked, passwordProtectionEnabled }) {
  if (passwordProtectionEnabled && !authUnlocked) {
    return {
      tone: 'status-warning',
      label: 'Locked',
      summary: 'Unlock control access to start a terminal session.',
      hint: 'The terminal uses the same control session as protected actions.',
      attention: false
    };
  }

  if (terminalState === 'connected') {
    return {
      tone: 'status-success',
      label: 'Live',
      summary: 'Terminal session connected.',
      hint: terminalMessage || 'The terminal is open and ready for commands.',
      attention: false
    };
  }

  if (terminalState === 'rate_limited') {
    return {
      tone: 'status-warning',
      label: 'Retry',
      summary: terminalMessage || 'Terminal access is temporarily rate limited.',
      hint: 'Wait for the retry window before opening a new session.',
      attention: true
    };
  }

  if (terminalState === 'unauthorized' || terminalState === 'session_expired') {
    return {
      tone: 'status-warning',
      label: 'Unlock',
      summary: terminalMessage || 'The terminal needs a fresh control session.',
      hint: 'Unlock control access again to open a new session.',
      attention: true
    };
  }

  if (terminalState === 'gateway_down' || terminalState === 'unavailable') {
    return {
      tone: 'status-danger',
      label: 'Down',
      summary: terminalMessage || 'The terminal gateway is unavailable.',
      hint: 'Check the backend and the WebSocket gateway on 127.0.0.1:8003.',
      attention: true
    };
  }

  return {
    tone: 'status-neutral',
    label: 'Idle',
    summary: 'Open the Terminal tab to start a session.',
    hint: 'No active terminal session is running right now.',
    attention: false
  };
}

function AppContent() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activePanel, setActivePanel] = useState(() => window.localStorage.getItem(PANEL_STORAGE_KEY) || 'overview');
  const [passwordInput, setPasswordInput] = useState('');

  const {
    systemInfo,
    performanceData,
    ports,
    processes,
    networkInfo,
    isAdmin,
    terminalState,
    terminalMessage,
    streamStatus,
    reconnectAttempt,
    streamError,
    stale,
    lastHeartbeat,
    actionFeed,
    notice,
    refreshProcesses,
    refreshPorts,
    refreshNetwork,
    recordUiAction,
    dismissNotice
  } = useDashboardStream();

  const authStatusQuery = useAuthStatus();
  const createAuthSessionMutation = useCreateAuthSession();
  const deleteAuthSessionMutation = useDeleteAuthSession();

  const passwordProtectionEnabled = authStatusQuery.data?.enabled ?? true;
  const authUnlocked = !passwordProtectionEnabled || Boolean(authStatusQuery.data?.session_active);
  const authMutationError = createAuthSessionMutation.error;
  const authRetryAfter = authMutationError?.retryAfter ?? null;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(PANEL_STORAGE_KEY, activePanel);
  }, [activePanel]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = setTimeout(() => dismissNotice(), 4800);
    return () => clearTimeout(timer);
  }, [dismissNotice, notice]);

  useEffect(() => {
    if (!passwordProtectionEnabled) {
      setPasswordInput('');
    }
  }, [passwordProtectionEnabled]);

  const unlockControl = async () => {
    if (!passwordInput.trim()) {
      recordUiAction({
        action: 'auth_session',
        status: 'blocked',
        message: 'Enter the control password before unlocking.',
        severity: 'warning',
        entity_type: 'auth'
      });
      return;
    }

    try {
      const result = await createAuthSessionMutation.mutateAsync(passwordInput.trim());
      recordUiAction({
        action: 'auth_session',
        status: 'success',
        message: result.message || 'Control session unlocked.',
        severity: 'success',
        entity_type: 'auth'
      });
    } catch (error) {
      recordUiAction({
        action: 'auth_session',
        status: error.status === 429 ? 'rate_limited' : 'failed',
        message: error.status === 429
          ? `Too many unlock attempts. Retry in ${error.retryAfter}s.`
          : error.message,
        severity: error.status === 429 ? 'warning' : 'danger',
        entity_type: 'auth',
        retry_after: error.retryAfter ?? null,
        requires_password: true
      });
    }
  };

  const lockControl = async () => {
    try {
      await deleteAuthSessionMutation.mutateAsync();
      recordUiAction({
        action: 'auth_session',
        status: 'success',
        message: 'Control session locked.',
        severity: 'neutral',
        entity_type: 'auth'
      });
    } catch (error) {
      recordUiAction({
        action: 'auth_session',
        status: 'failed',
        message: error.message,
        severity: 'danger',
        entity_type: 'auth'
      });
    }
  };

  const authBadge = !passwordProtectionEnabled
    ? { tone: 'status-neutral', label: 'No Password' }
    : authUnlocked
      ? { tone: 'status-success', label: 'Unlocked' }
      : createAuthSessionMutation.isPending
        ? { tone: 'status-warning', label: 'Unlocking' }
        : authRetryAfter
          ? { tone: 'status-warning', label: `Retry in ${authRetryAfter}s` }
          : authStatusQuery.isError
            ? { tone: 'status-danger', label: 'Auth offline' }
            : { tone: 'status-warning', label: 'Locked' };

  const streamBadge = streamStatus === 'connected'
    ? { tone: stale ? 'status-warning' : 'status-success', label: stale ? 'Stale stream' : 'Live stream' }
    : { tone: 'status-warning', label: reconnectAttempt ? `Reconnecting x${reconnectAttempt}` : 'Connecting' };

  const terminalBadge = terminalState === 'connected'
    ? { tone: 'status-success', label: 'Terminal ready' }
    : terminalState === 'rate_limited'
      ? { tone: 'status-warning', label: 'Rate limited' }
      : terminalState === 'unauthorized'
        ? { tone: 'status-danger', label: 'Terminal locked' }
        : { tone: 'status-neutral', label: 'Terminal idle' };

  const authHint = !passwordProtectionEnabled
    ? 'Password protection is disabled for this session.'
    : authUnlocked
      ? 'Protected actions use the active control session cookie.'
      : authRetryAfter
        ? `Unlock temporarily rate limited. Retry in about ${authRetryAfter}s.`
        : authMutationError
          ? authMutationError.message
          : 'Unlock once to enable process, port and terminal actions.';

  const terminalReadiness = useMemo(() => getTerminalReadiness({
    terminalState,
    terminalMessage,
    authUnlocked,
    passwordProtectionEnabled
  }), [authUnlocked, passwordProtectionEnabled, terminalMessage, terminalState]);

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

  const readinessItems = [
    {
      label: 'Backend',
      badgeTone: systemInfo ? 'status-success' : 'status-warning',
      badgeLabel: systemInfo ? 'Ready' : 'Waiting',
      summary: systemInfo ? `API live on 127.0.0.1:8000` : 'Waiting for bootstrap snapshot',
      hint: streamError || 'Flask API and telemetry bootstrap.'
    },
    {
      label: 'Live stream',
      badgeTone: streamBadge.tone,
      badgeLabel: streamBadge.label,
      summary: stale ? 'Stream data is stale.' : 'SSE snapshots are current.',
      hint: `Heartbeat ${formatLastSeen(lastHeartbeat)}`
    },
    {
      label: 'Terminal',
      badgeTone: terminalReadiness.tone,
      badgeLabel: terminalReadiness.label,
      summary: terminalReadiness.summary,
      hint: terminalReadiness.hint
    },
    {
      label: 'Auth',
      badgeTone: authBadge.tone,
      badgeLabel: authBadge.label,
      summary: authUnlocked ? 'Control session is active.' : 'Protected actions are locked.',
      hint: authHint
    },
    {
      label: 'Admin',
      badgeTone: isAdmin ? 'status-success' : 'status-warning',
      badgeLabel: isAdmin ? 'Available' : 'Limited',
      summary: isAdmin ? 'Windows admin actions are available.' : 'Process termination may be blocked.',
      hint: 'Only dashboard-owned processes and ports remain killable.'
    }
  ];

  const attentionItems = useMemo(() => {
    const items = [];

    if (performanceData?.cpu_percent >= 85) {
      items.push({
        title: 'CPU pressure is high',
        description: `CPU usage is ${performanceData.cpu_percent.toFixed(1)}%. Inspect the process list for hot tasks.`,
        severity: 'danger',
        label: 'Critical'
      });
    }

    if (stale) {
      items.push({
        title: 'Telemetry stream is stale',
        description: 'The last live update is older than expected. Refresh the affected views or inspect the backend.',
        severity: 'warning',
        label: 'Warning'
      });
    }

    if (passwordProtectionEnabled && !authUnlocked) {
      items.push({
        title: 'Protected actions are locked',
        description: authHint,
        severity: 'warning',
        label: 'Action needed'
      });
    }

    if (!isAdmin) {
      items.push({
        title: 'Admin privileges missing',
        description: 'Process termination on Windows needs Administrator mode even for dashboard-owned processes.',
        severity: 'warning',
        label: 'Limited'
      });
    }

    if (terminalReadiness.attention) {
      items.push({
        title: 'Terminal needs attention',
        description: terminalReadiness.summary,
        severity: terminalReadiness.tone === 'status-danger' ? 'danger' : 'warning',
        label: terminalReadiness.label
      });
    }

    return items.slice(0, 4);
  }, [authHint, authUnlocked, isAdmin, passwordProtectionEnabled, performanceData?.cpu_percent, stale, terminalReadiness]);

  const refreshAll = async () => {
    await Promise.allSettled([
      refreshProcesses(),
      refreshPorts(),
      refreshNetwork(),
      authStatusQuery.refetch()
    ]);
    recordUiAction({
      action: 'refresh_all',
      status: 'success',
      message: 'Requested a full dashboard refresh.',
      severity: 'neutral',
      entity_type: 'dashboard'
    });
  };

  const heroAttention = attentionItems.slice(0, 3);

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
          <AttentionPanel
            items={attentionItems}
            actions={[
              { label: 'Open Processes', onClick: () => setActivePanel('process-manager') },
              { label: 'Open Ports', onClick: () => setActivePanel('ports') },
              { label: 'Open Terminal', onClick: () => setActivePanel('commands') },
              { label: 'Refresh all', onClick: () => { void refreshAll(); } }
            ]}
          />
          <SystemReadiness items={readinessItems} />
          <ActionFeed actions={actionFeed} />
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
            authUnlocked={authUnlocked}
            passwordProtectionEnabled={passwordProtectionEnabled}
            ports={ports}
            loading={!ports?.length && streamStatus !== 'connected'}
            onRefresh={refreshPorts}
            onAction={recordUiAction}
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
            authUnlocked={authUnlocked}
            passwordProtectionEnabled={passwordProtectionEnabled}
            processes={processes}
            loading={!processes?.length && streamStatus !== 'connected'}
            isAdmin={isAdmin}
            onRefresh={refreshProcesses}
            onAction={recordUiAction}
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
          <WindowTerminal
            authUnlocked={authUnlocked}
            passwordProtectionEnabled={passwordProtectionEnabled}
            onAction={recordUiAction}
          />
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
    <>
      <motion.div
        className="app-shell"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <section className="hero-panel panel">
          <div className="hero-copy">
            <span className="hero-kicker">DevControl dashboard</span>
            <h1 className="hero-title">Local control surface with clear trust signals.</h1>
            <div className="hero-badges">
              <span className={`status-badge ${authBadge.tone}`}>{authBadge.label}</span>
              <span className={`status-badge ${streamBadge.tone}`}>{streamBadge.label}</span>
              <span className={`status-badge ${terminalBadge.tone}`}>{terminalBadge.label}</span>
            </div>
            <div className="hero-attention-list">
              {heroAttention.length ? heroAttention.map((item) => (
                <div key={item.title} className="hero-attention-item">
                  <span className={`status-badge status-${item.severity}`}>{item.label}</span>
                  <span>{item.description}</span>
                </div>
              )) : (
                <div className="hero-attention-item">
                  <span className="status-badge status-success">Stable</span>
                  <span>No urgent issues detected across auth, terminal and telemetry.</span>
                </div>
              )}
            </div>
          </div>

          <div className="hero-aside">
            <div className="hero-clock">{formatClock(currentTime)}</div>
            <div className="hero-meta">Heartbeat {formatLastSeen(lastHeartbeat)}</div>
            <div className="hero-meta">
              {stale ? 'Telemetry needs refresh' : 'Telemetry pipeline is healthy'}
            </div>
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
                    <p className="panel-subtitle">Unlock once, then use the same control session everywhere.</p>
                  </div>
                </div>
              </div>

              <div className="panel-body stack">
                {passwordProtectionEnabled ? (
                  <div className="unlock-form">
                    <label className="field-label" htmlFor="control-password">Control Password</label>
                    <input
                      id="control-password"
                      className="input"
                      type="password"
                      value={passwordInput}
                      onChange={(event) => setPasswordInput(event.target.value)}
                      placeholder="Enter startup password"
                    />
                    <div className="quick-action-row">
                      <button
                        className="button"
                        type="button"
                        onClick={() => { void unlockControl(); }}
                        disabled={createAuthSessionMutation.isPending}
                      >
                        {createAuthSessionMutation.isPending ? 'Unlocking...' : 'Unlock'}
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => { void lockControl(); }}
                        disabled={!authUnlocked || deleteAuthSessionMutation.isPending}
                      >
                        Lock
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="glass-note">
                  <span className={`status-badge ${authBadge.tone}`}>{authBadge.label}</span>
                  <p>{streamError || authHint}</p>
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

            <SystemReadiness items={readinessItems} />
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
                  <button className="ghost-button compact-action-button" type="button" onClick={() => { void refreshAll(); }}>
                    <RefreshCw size={16} />
                    Refresh all
                  </button>
                </div>
              </div>

              <div className="panel-body">
                <nav className="nav-grid" aria-label="Dashboard navigation">
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

      <ToastViewport notice={notice} onDismiss={dismissNotice} />
    </>
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
