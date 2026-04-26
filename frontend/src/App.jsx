import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Cpu, Network, Terminal, Wifi } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import ActionFeed from './components/ActionFeed';
import AttentionPanel from './components/AttentionPanel';
import ControlAccessPanel from './components/ControlAccessPanel';
import DashboardHero from './components/DashboardHero';
import DashboardNavigation from './components/DashboardNavigation';
import NetworkHub from './components/NetworkHub';
import PortControl from './components/PortControl';
import ProcessManager from './components/ProcessManager';
import SystemMonitor from './components/SystemMonitor';
import SystemReadiness from './components/SystemReadiness';
import ToastViewport from './components/ToastViewport';
import WindowTerminal from './components/WindowTerminal';
import { DashboardStreamProvider, useDashboardStream } from './features/dashboard/context/DashboardStreamContext';
import { useAuthStatus, useCreateAuthSession, useDeleteAuthSession } from './features/dashboard/hooks/useAuthStatus';
import { useDashboardLiveData } from './features/dashboard/hooks/useDashboardLiveData';

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
    terminalState,
    terminalMessage,
    streamStatus,
    reconnectAttempt,
    streamError,
    stale,
    lastHeartbeat,
    actionFeed,
    notice,
    recordUiAction,
    dismissNotice
  } = useDashboardStream();

  const {
    systemInfo,
    performanceData,
    isAdmin,
    processes,
    ports,
    networkInfo,
    processesLoading,
    processesFetching,
    processesUpdatedAt,
    portsLoading,
    portsFetching,
    portsUpdatedAt,
    networkLoading,
    refreshSystem,
    refreshProcesses,
    refreshPorts,
    refreshNetwork
  } = useDashboardLiveData();

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

  const readinessItems = [
    {
      label: 'Backend',
      badgeTone: systemInfo ? 'status-success' : 'status-warning',
      badgeLabel: systemInfo ? 'Ready' : 'Waiting',
      summary: systemInfo ? 'API live on 127.0.0.1:8000' : 'Waiting for bootstrap snapshot',
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
      refreshSystem(),
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

  const currentStats = {
    systemInfo,
    performanceData,
    processes,
    ports,
    networkInfo
  };

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
            loading={portsLoading && !ports.length}
            isRefreshing={portsFetching}
            lastUpdatedAt={portsUpdatedAt}
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
            loading={processesLoading && !processes.length}
            isAdmin={isAdmin}
            isRefreshing={processesFetching}
            lastUpdatedAt={processesUpdatedAt}
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
          loading={networkLoading && !networkInfo}
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
        <DashboardHero
          currentTime={currentTime}
          authBadge={authBadge}
          streamBadge={streamBadge}
          terminalBadge={terminalBadge}
          heroAttention={heroAttention}
          lastHeartbeat={lastHeartbeat}
          stale={stale}
        />

        <section className="dashboard-grid">
          <aside className="sidebar-stack">
            <ControlAccessPanel
              authBadge={authBadge}
              authHint={authHint}
              authUnlocked={authUnlocked}
              createAuthSessionMutation={createAuthSessionMutation}
              currentStats={currentStats}
              deleteAuthSessionMutation={deleteAuthSessionMutation}
              passwordInput={passwordInput}
              passwordProtectionEnabled={passwordProtectionEnabled}
              setPasswordInput={setPasswordInput}
              streamError={streamError}
              unlockControl={unlockControl}
              lockControl={lockControl}
            />

            <SystemReadiness items={readinessItems} />
          </aside>

          <main className="workspace-stack">
            <DashboardNavigation
              activePanel={activePanel}
              isAdmin={isAdmin}
              onRefreshAll={refreshAll}
              panels={PANELS}
              panelMeta={panelMeta}
              setActivePanel={setActivePanel}
              streamBadge={streamBadge}
            />

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
