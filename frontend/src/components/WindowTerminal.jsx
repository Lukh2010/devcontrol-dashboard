import React from 'react';
import { Copy, RotateCcw, ShieldAlert, Square, Terminal } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { useTerminalSession } from '../features/dashboard/hooks/useTerminalSession';

const WindowTerminal = ({
  authUnlocked,
  passwordProtectionEnabled,
  onAction
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
    safeSuggestions,
    confirmCommandPrompt,
    workingDir,
    copyState,
    outputEndRef,
    commandSafety,
    interruptCommand,
    confirmPendingCommand,
    clearTerminal,
    copyOutput,
    copyLine,
    reconnect,
    handleKeyDown
  } = useTerminalSession({
    authUnlocked,
    passwordProtectionEnabled,
    onAction
  });

  const terminalStatus = connected
    ? { className: 'status-success', label: 'Connected' }
    : connectionState === 'rate_limited'
      ? { className: 'status-warning', label: 'Rate limited' }
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
          <span className={`status-badge ${terminalStatus.className}`}>{terminalStatus.label}</span>
          <span className={`status-badge ${passwordProtectionEnabled ? 'status-warning' : 'status-neutral'}`}>
            {passwordProtectionEnabled ? 'Password gated' : 'Password disabled'}
          </span>
          <span className={`status-badge status-${commandSafety.classification === 'dangerous' ? 'danger' : commandSafety.classification === 'interactive' || commandSafety.classification === 'unknown' ? 'warning' : commandSafety.classification === 'safe' ? 'success' : 'neutral'}`}>
            {commandSafety.classification}
          </span>
        </div>
      </div>

      <div className="panel-body stack">
        <div className="glass-note" aria-live="polite">
          <span className={`status-badge ${terminalStatus.className}`}>{connectionState}</span>
          <p>
            {retryCountdown != null && retryCountdown > 0
              ? `${connectionMessage} Auto retry in ${retryCountdown}s.`
              : connectionMessage}
          </p>
        </div>

        {safeSuggestions.length ? (
          <div className="suggestion-row">
            {safeSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                className="ghost-button suggestion-chip"
                type="button"
                onClick={() => setCurrentCommand(suggestion.split(' - ')[0])}
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        <div className="terminal-shell">
          <div className="terminal-bar">
            <div className="terminal-title-row">
              <div className="terminal-lights">
                <span className="terminal-light" style={{ background: '#fb7185' }} />
                <span className="terminal-light" style={{ background: '#fbbf24' }} />
                <span className="terminal-light" style={{ background: '#34d399' }} />
              </div>
              <span className="terminal-label">Session</span>
            </div>

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
                      : 'Use a safe command or a suggestion below.'}
                  </p>
                </div>
              </div>
            ) : (
              output.map((item, index) => (
                <div key={`${item.timestamp}-${index}`} className="terminal-row">
                  <div className={getLineClass(item.type)}>{item.text}</div>
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
                    ? 'Type command and press Enter'
                    : 'Connecting to terminal gateway'}
              />
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
            <div className="action-feed-title">Recent commands</div>
            <div className="history-list">
              {[...history].reverse().slice(0, 5).map((entry) => (
                <div key={`${entry.command}-${entry.timestamp}`} className="history-item">
                  <button className="ghost-button history-command" type="button" onClick={() => setCurrentCommand(entry.command)}>
                    {entry.command}
                  </button>
                  <button className="ghost-button history-copy" type="button" onClick={() => { void copyLine(entry.command); }}>
                    <Copy size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

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
    </motion.section>
  );
};

export default WindowTerminal;
