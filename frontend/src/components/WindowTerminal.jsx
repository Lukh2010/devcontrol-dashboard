import React from 'react';
import { Copy, Plus, RotateCcw, ShieldAlert, Square, Terminal } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { useTerminalSession } from '../features/dashboard/hooks/useTerminalSession';
import { useTerminalTabs } from '../features/dashboard/hooks/useTerminalTabs';

function formatAuditTime(timestamp) {
  if (!timestamp) {
    return 'Pending';
  }

  return new Date(timestamp).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

const TerminalTabContent = ({
  tabId,
  authUnlocked,
  passwordProtectionEnabled,
  onAction,
  terminalSettings,
  onSessionLimit,
  isActive,
  shouldConnect
}) => {
  const {
    connected,
    connectionState,
    connectionMessage,
    retryCountdown,
    output,
    currentCommand,
    setCurrentCommand,
    history,
    confirmCommandPrompt,
    workingDir,
    copyState,
    outputEndRef,
    commandSafety,
    completionCandidates,
    applyCompletion,
    interruptCommand,
    confirmPendingCommand,
    clearTerminal,
    copyOutput,
    copyLine,
    reconnect,
    handleKeyDown
  } = useTerminalSession({
    tabId,
    authUnlocked,
    passwordProtectionEnabled,
    onAction,
    terminalSettings,
    shouldConnect
  });

  // Notify parent when backend session limit is hit or cleared — only from the active tab
  React.useEffect(() => {
    if (!isActive) return undefined;
    if (connectionState === 'session_limit') {
      onSessionLimit?.(true);
    } else if (connectionState === 'connected') {
      onSessionLimit?.(false);
    }
    return undefined;
  }, [connectionState, isActive, onSessionLimit]);

  const terminalStatus = connected
    ? { className: 'status-success', label: 'Connected' }
    : connectionState === 'rate_limited'
      ? { className: 'status-warning', label: 'Rate limited' }
      : connectionState === 'session_limit'
        ? { className: 'status-warning', label: 'Session limit' }
      : connectionState === 'unauthorized' || connectionState === 'session_expired'
        ? { className: 'status-danger', label: 'Locked' }
        : connectionState === 'gateway_down'
          ? { className: 'status-warning', label: 'Gateway down' }
          : { className: 'status-neutral', label: 'Idle' };

  const getLineClass = (type) => {
    if (type === 'command') return 'terminal-line command';
    if (type === 'warning' || type === 'system') return 'terminal-line warning';
    if (type === 'error') return 'terminal-line error';
    return 'terminal-line output';
  };

  return (
    <>
      <div className="glass-note" aria-live="polite">
        <span className={`status-badge ${terminalStatus.className}`}>{connectionState}</span>
        <p>
          {retryCountdown != null && retryCountdown > 0
            ? `${connectionMessage} Auto retry in ${retryCountdown}s.`
            : connectionMessage}
        </p>
      </div>

      <div className="terminal-shell">
        <div className="terminal-bar">
          <div className="terminal-actions">
            <button className="ghost-button" type="button" onClick={() => { void copyOutput(); }}>
              <Copy size={16} />
              {copyState === 'done' ? 'Copied' : 'Copy all'}
            </button>
            <button className="ghost-button" type="button" onClick={reconnect}>
              <RotateCcw size={16} />
              Reconnect
            </button>
            <button className="ghost-button" type="button" onClick={clearTerminal}>
              <Square size={16} />
              Clear
            </button>
          </div>
        </div>

        <div className="terminal-context">
          <div className="terminal-path">
            <span className="terminal-label">Working dir</span>
            <span className="terminal-inline-value">{workingDir || 'Waiting'}</span>
          </div>
          <div className="terminal-meta">
            <span className="terminal-label">History</span>
            <span className="terminal-inline-value">{history.length} cached</span>
          </div>
        </div>

        <div className="terminal-output">
          {output.length === 0 ? (
            <div className="center-empty">
              <div>
                <p className="metric-reading compact-reading">Terminal ready</p>
                <p className="muted-note">
                  {passwordProtectionEnabled && !authUnlocked
                    ? 'Unlock control access to start the protected session.'
                    : 'Type a safe command to begin.'}
                </p>
              </div>
            </div>
          ) : (
            output.map((item, index) => (
              <div key={`${item.timestamp}-${index}`} className="terminal-row">
                <div className={getLineClass(item.type)}>
                  {terminalSettings.showTimestamps ? (
                    <span className="terminal-line-timestamp">{formatAuditTime(item.timestamp)}</span>
                  ) : null}
                  {item.text}
                </div>
                <button className="ghost-button terminal-copy" type="button" onClick={() => { void copyLine(item.text); }}>
                  <Copy size={14} />
                </button>
              </div>
            ))
          )}
          <div ref={outputEndRef} />
        </div>

        <div className="terminal-input-row">
          <span className="terminal-prompt">$</span>
          <div className="terminal-input-shell">
            <input
              className="terminal-input"
              type="text"
              value={currentCommand}
              onChange={(event) => setCurrentCommand(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!connected}
              aria-label="Terminal command"
              placeholder={passwordProtectionEnabled && !authUnlocked
                ? 'Unlock control access to use the terminal'
                : connected
                  ? 'Type command and press Enter (or Tab to autocomplete)'
                  : 'Connecting to terminal gateway'}
            />
            {completionCandidates.length > 0 && (
              <div className="completion-suggestions" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                <span className="muted-note" style={{ fontSize: '11px', alignSelf: 'center' }}>Tab suggestions:</span>
                {completionCandidates.map((candidate) => (
                  <button
                    key={candidate}
                    type="button"
                    className="ghost-button"
                    style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.1)' }}
                    onClick={() => applyCompletion(candidate)}
                  >
                    {candidate}
                  </button>
                ))}
              </div>
            )}
            <div className="terminal-classifier-row">
              <span className={`status-badge status-${commandSafety.classification === 'dangerous' ? 'danger' : commandSafety.classification === 'interactive' || commandSafety.classification === 'unknown' ? 'warning' : commandSafety.classification === 'safe' ? 'success' : 'neutral'}`}>
                {commandSafety.classification}
              </span>
              <span className="muted-note wrap-text">{commandSafety.reason}</span>
            </div>
          </div>
          <button className="secondary-button" type="button" disabled={!connected} onClick={interruptCommand}>
            <ShieldAlert size={16} />
            Interrupt
          </button>
        </div>
      </div>

      {history.length ? (
        <div className="history-panel mini-card">
          <div className="history-header">
            <div>
              <div className="action-feed-title">Terminal audit</div>
              <div className="muted-note">Last commands with classification, result and block reason.</div>
            </div>
            <span className="status-badge status-neutral">{history.length} tracked</span>
          </div>
          <div className="terminal-audit-list">
            {[...history].reverse().map((entry) => (
              <div key={`${entry.command}-${entry.timestamp}`} className="terminal-audit-item">
                <div className="terminal-audit-main">
                  <button className="ghost-button history-command" type="button" onClick={() => setCurrentCommand(entry.command)}>
                    {entry.command}
                  </button>
                  <button className="ghost-button history-copy" type="button" onClick={() => { void copyLine(entry.command); }}>
                    <Copy size={14} />
                  </button>
                </div>
                <div className="terminal-audit-meta">
                  <span className={`status-pill ${entry.success === false ? 'warn' : entry.success === true ? 'good' : 'neutral'}`}>
                    {entry.status || 'queued'}
                  </span>
                  <span className="status-pill neutral">{entry.classification || 'unknown'}</span>
                  <span className="muted-note">
                    {entry.return_code == null ? 'Return code pending' : `Return code ${entry.return_code}`}
                  </span>
                  <span className="muted-note">{formatAuditTime(entry.completed_at || entry.timestamp)}</span>
                </div>
                {(entry.reason || entry.message || entry.timed_out) ? (
                  <div className="muted-note wrap-text">
                    {entry.timed_out ? 'Timeout' : entry.reason || entry.message}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {confirmCommandPrompt && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal-card"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className="panel-title-wrap">
                <span className="panel-icon">
                  <ShieldAlert size={18} />
                </span>
                <div>
                  <h3 className="panel-title">Confirmation required</h3>
                  <p className="panel-subtitle">{confirmCommandPrompt.message}</p>
                </div>
              </div>

              <div className="mini-card" style={{ marginTop: '18px' }}>
                <div className="terminal-line error">{confirmCommandPrompt.command}</div>
                <div className="muted-note">{confirmCommandPrompt.reason}</div>
              </div>

              <div className="stack" style={{ marginTop: '16px' }}>
                {confirmCommandPrompt.confirmation_guidance.map((example) => (
                  <div key={example} className="muted-note">{example}</div>
                ))}
              </div>

              <div className="modal-actions">
                <button className="ghost-button" type="button" style={{ flex: 1 }} onClick={() => confirmPendingCommand(false)}>
                  Cancel
                </button>
                <button className="danger-button" type="button" style={{ flex: 1 }} onClick={() => confirmPendingCommand(true)}>
                  Execute
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const WindowTerminal = ({
  authUnlocked,
  passwordProtectionEnabled,
  onAction,
  terminalSettings = {}
}) => {
  const { tabs, activeTabId, setActiveTabId, addTab, closeTab, canAddTab } = useTerminalTabs();
  const [sessionLimitReached, setSessionLimitReached] = React.useState(false);
  // Track which tab IDs have ever been activated so we can lazy-connect their WebSocket
  const [activatedTabs, setActivatedTabs] = React.useState(() => new Set([activeTabId]));

  React.useEffect(() => {
    setActivatedTabs((prev) => {
      if (prev.has(activeTabId)) return prev;
      const next = new Set(prev);
      next.add(activeTabId);
      return next;
    });
  }, [activeTabId]);

  // Clear the session-limit flag whenever a tab is closed (slot freed)
  React.useEffect(() => {
    setSessionLimitReached(false);
  }, [tabs.length]);

  const showAddButton = canAddTab && !sessionLimitReached;

  return (
    <motion.section
      className="panel"
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
    >
      <div className="panel-header">
        <div className="panel-title-wrap">
          <span className="panel-icon">
            <Terminal size={18} />
          </span>
          <div>
            <h2 className="panel-title">Terminal</h2>
            <p className="panel-subtitle">Protected command access with guided safety feedback.</p>
          </div>
        </div>

        <div className="chip-row">
          <span className={`status-badge ${passwordProtectionEnabled ? 'status-warning' : 'status-neutral'}`}>
            {passwordProtectionEnabled ? 'Password gated' : 'Password disabled'}
          </span>
        </div>
      </div>

      <div className="panel-body stack">
        <div className="terminal-tabs-header" style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
          <div className="terminal-lights" style={{ display: 'flex', gap: '6px', marginRight: '8px' }}>
            <span className="terminal-light" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fb7185' }} />
            <span className="terminal-light" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fbbf24' }} />
            <span className="terminal-light" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#34d399' }} />
          </div>

          <div className="terminal-tabs" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`ghost-button ${activeTabId === tab.id ? 'active-tab' : ''}`}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: activeTabId === tab.id ? '600' : '400',
                  borderRadius: '6px',
                  background: activeTabId === tab.id ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: activeTabId === tab.id ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid transparent'
                }}
                onClick={() => setActiveTabId(tab.id)}
              >
                {tab.title}
                {tabs.length > 1 && (
                  <span
                    role="button"
                    tabIndex={0}
                    style={{ marginLeft: '8px', opacity: 0.6 }}
                    onClick={(event) => {
                      event.stopPropagation();
                      closeTab(tab.id);
                    }}
                  >
                    ×
                  </span>
                )}
              </button>
            ))}
            {showAddButton && (
              <button
                type="button"
                className="ghost-button"
                style={{ padding: '4px 8px', fontSize: '12px' }}
                onClick={addTab}
                title="New terminal tab"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
        </div>

        {tabs.map((tab) => (
          <div
            key={tab.id}
            style={{ display: activeTabId === tab.id ? 'block' : 'none' }}
          >
            {activatedTabs.has(tab.id) && (
              <TerminalTabContent
                tabId={tab.id}
                authUnlocked={authUnlocked}
                passwordProtectionEnabled={passwordProtectionEnabled}
                onAction={onAction}
                terminalSettings={terminalSettings}
                onSessionLimit={setSessionLimitReached}
                isActive={activeTabId === tab.id}
                shouldConnect
              />
            )}
          </div>
        ))}
      </div>
    </motion.section>
  );
};

export default WindowTerminal;
