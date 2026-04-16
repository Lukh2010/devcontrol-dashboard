import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, RotateCcw, ShieldAlert, Square, Terminal } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { classifyCommand } from '../features/dashboard/utils/commandClassifier';

const MAX_HISTORY = 50;

function formatRelativeRetry(retryUntil) {
  if (!retryUntil) {
    return null;
  }

  const deltaMs = retryUntil - Date.now();
  return deltaMs > 0 ? Math.ceil(deltaMs / 1000) : 0;
}

const WindowTerminal = ({
  authUnlocked,
  passwordProtectionEnabled,
  onAction
}) => {
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('idle');
  const [connectionMessage, setConnectionMessage] = useState('Waiting for terminal access.');
  const [retryUntil, setRetryUntil] = useState(null);
  const [output, setOutput] = useState([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [safeSuggestions, setSafeSuggestions] = useState([]);
  const [sudoModal, setSudoModal] = useState(null);
  const [workingDir, setWorkingDir] = useState('');
  const [copyState, setCopyState] = useState('idle');
  const outputEndRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectStateRef = useRef('idle');
  const wasConnectedRef = useRef(false);
  const intentionalCloseRef = useRef(false);

  const retryCountdown = useMemo(() => formatRelativeRetry(retryUntil), [retryUntil]);
  const commandSafety = useMemo(() => classifyCommand(currentCommand), [currentCommand]);

  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output]);

  useEffect(() => {
    if (copyState !== 'done') {
      return undefined;
    }

    const timer = setTimeout(() => setCopyState('idle'), 1800);
    return () => clearTimeout(timer);
  }, [copyState]);

  useEffect(() => {
    if (retryUntil == null) {
      return undefined;
    }

    const timer = setInterval(() => {
      if (Date.now() >= retryUntil) {
        setRetryUntil(null);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [retryUntil]);

  const addOutput = useCallback((item) => {
    setOutput((prev) => [...prev, { ...item, timestamp: Date.now() }]);
  }, []);

  const closeSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      intentionalCloseRef.current = true;
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnected(false);
  }, []);

  const scheduleReconnect = useCallback((delayMs) => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      reconnectStateRef.current = 'reconnecting';
      setConnectionState('reconnecting');
      setConnectionMessage('Attempting to reconnect to the terminal gateway.');
      connectWebSocket();
    }, delayMs);
  }, []);

  const handleMessage = useCallback((message) => {
    switch (message.type) {
      case 'welcome':
        setWorkingDir(message.working_dir);
        addOutput({ type: 'system', text: 'Connected to terminal server' });
        addOutput({ type: 'system', text: message.message });
        break;
      case 'cwd_changed':
        setWorkingDir(message.working_dir);
        addOutput({ type: 'system', text: message.message });
        break;
      case 'output':
        addOutput({ type: 'output', text: message.data });
        break;
      case 'command_sent':
        addOutput({ type: 'command', text: `$ ${message.command}` });
        break;
      case 'safe_commands':
        setSafeSuggestions(message.examples || []);
        break;
      case 'sudo_required':
        setSudoModal({
          command: message.command,
          reason: message.reason,
          warning: message.warning,
          dangerous_examples: message.dangerous_examples
        });
        break;
      case 'interrupt_sent':
      case 'info':
      case 'warning':
      case 'sudo_confirmed':
      case 'sudo_cancelled':
        addOutput({ type: 'warning', text: message.message });
        break;
      case 'error':
        if (message.reason === 'rate_limited') {
          const retryAt = Date.now() + ((message.retry_after || 1) * 1000);
          setRetryUntil(retryAt);
          setConnectionState('rate_limited');
          setConnectionMessage(`Rate limited. Retry in about ${message.retry_after}s.`);
          onAction?.({
            action: 'terminal_state',
            status: 'rate_limited',
            message: `Terminal rate limited. Retry in ${message.retry_after}s.`,
            severity: 'warning',
            entity_type: 'terminal',
            retry_after: message.retry_after
          });
          break;
        }

        if (message.reason === 'unauthorized') {
          const state = wasConnectedRef.current ? 'session_expired' : 'unauthorized';
          setConnectionState(state);
          setConnectionMessage(
            state === 'session_expired'
              ? 'The control session expired. Unlock again to reconnect.'
              : 'Unlock control access to use the protected terminal.'
          );
          addOutput({
            type: 'error',
            text: state === 'session_expired'
              ? 'Terminal session expired. Unlock again to reconnect.'
              : 'Terminal access requires an unlocked control session.'
          });
          onAction?.({
            action: 'terminal_state',
            status: state,
            message: state === 'session_expired'
              ? 'Terminal session expired.'
              : 'Terminal access blocked until control access is unlocked.',
            severity: 'warning',
            entity_type: 'terminal'
          });
          break;
        }

        addOutput({ type: 'error', text: message.message });
        break;
      default:
        break;
    }
  }, [addOutput, onAction]);

  const connectWebSocket = useCallback(() => {
    if (passwordProtectionEnabled && !authUnlocked) {
      setConnectionState('locked');
      setConnectionMessage('Unlock control access to start the protected terminal session.');
      closeSocket();
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const websocket = new WebSocket(`${protocol}://${window.location.hostname}:8003`);

      websocket.onopen = () => {
        intentionalCloseRef.current = false;
        reconnectStateRef.current = 'connected';
        wasConnectedRef.current = true;
        setConnected(true);
        setConnectionState('connected');
        setConnectionMessage('Terminal connected and ready.');
        setRetryUntil(null);
        wsRef.current = websocket;
        websocket.send(JSON.stringify({ type: 'get_safe_commands' }));
      };

      websocket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleMessage(message);
      };

      websocket.onclose = (event) => {
        setConnected(false);
        wsRef.current = null;

        if (intentionalCloseRef.current) {
          intentionalCloseRef.current = false;
          return;
        }

        if (event.code === 4401 || event.code === 4429) {
          return;
        }

        setConnectionState('gateway_down');
        setConnectionMessage('Terminal gateway is unavailable. Retrying automatically.');
        scheduleReconnect(3000);
      };

      websocket.onerror = () => {
        setConnected(false);
        setConnectionState('gateway_down');
        setConnectionMessage('Terminal gateway error. Retrying automatically.');
      };
    } catch (error) {
      setConnected(false);
      setConnectionState('gateway_down');
      setConnectionMessage(`Failed to connect: ${error.message}`);
      scheduleReconnect(3000);
    }
  }, [authUnlocked, closeSocket, handleMessage, passwordProtectionEnabled, scheduleReconnect]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      closeSocket();
    };
  }, [closeSocket, connectWebSocket]);

  const sendCommand = (command) => {
    if (!wsRef.current || !connected) {
      addOutput({ type: 'error', text: 'Terminal not connected. Please wait...' });
      return;
    }

    if (!command.trim()) {
      return;
    }

    setHistory((prev) => [...prev, { command, timestamp: Date.now() }].slice(-MAX_HISTORY));
    setHistoryIndex(-1);

    try {
      wsRef.current.send(JSON.stringify({
        type: 'execute_command',
        command
      }));

      onAction?.({
        action: 'terminal_command',
        status: 'queued',
        message: `Command queued as ${commandSafety.classification}.`,
        severity: commandSafety.classification === 'dangerous' ? 'warning' : 'neutral',
        entity_type: 'terminal',
        entity_id: command
      });
    } catch (error) {
      addOutput({ type: 'error', text: `Failed to send command: ${error.message}` });
    }

    setCurrentCommand('');
  };

  const interruptCommand = () => {
    if (wsRef.current && connected) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
      addOutput({ type: 'warning', text: 'Interrupt signal sent.' });
    }
  };

  const confirmSudo = (confirmed) => {
    if (wsRef.current && connected && sudoModal) {
      wsRef.current.send(JSON.stringify({
        type: 'sudo_confirm',
        confirmed
      }));
    }
    setSudoModal(null);
  };

  const clearTerminal = () => setOutput([]);

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output.map((item) => item.text).join('\n'));
      setCopyState('done');
    } catch {
      setCopyState('error');
    }
  };

  const copyLine = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('done');
    } catch {
      setCopyState('error');
    }
  };

  const handleReconnect = () => {
    closeSocket();
    setConnectionState('reconnecting');
    setConnectionMessage('Manual reconnect requested.');
    connectWebSocket();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      sendCommand(currentCommand);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(history[newIndex].command);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIndex !== -1) {
        if (historyIndex >= history.length - 1) {
          setHistoryIndex(-1);
          setCurrentCommand('');
        } else {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setCurrentCommand(history[newIndex].command);
        }
      }
      return;
    }

    if (event.key === 'c' && event.ctrlKey) {
      event.preventDefault();
      interruptCommand();
    }
  };

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
          <span className={`status-badge status-${commandSafety.classification === 'dangerous' ? 'danger' : commandSafety.classification === 'interactive' ? 'warning' : commandSafety.classification === 'safe' ? 'success' : 'neutral'}`}>
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
              <button className="ghost-button" type="button" onClick={copyOutput}>
                <Copy size={16} />
                {copyState === 'done' ? 'Copied' : 'Copy all'}
              </button>
              <button className="ghost-button" type="button" onClick={handleReconnect}>
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
                <span className={`status-badge status-${commandSafety.classification === 'dangerous' ? 'danger' : commandSafety.classification === 'interactive' ? 'warning' : commandSafety.classification === 'safe' ? 'success' : 'neutral'}`}>
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
        {sudoModal && (
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
                  <h3 className="panel-title">Dangerous command detected</h3>
                  <p className="panel-subtitle">{sudoModal.warning}</p>
                </div>
              </div>

              <div className="mini-card" style={{ marginTop: '18px' }}>
                <div className="terminal-line error">{sudoModal.command}</div>
                <div className="muted-note">{sudoModal.reason}</div>
              </div>

              <div className="stack" style={{ marginTop: '16px' }}>
                {sudoModal.dangerous_examples.map((example) => (
                  <div key={example} className="muted-note">{example}</div>
                ))}
              </div>

              <div className="modal-actions">
                <button className="ghost-button" type="button" style={{ flex: 1 }} onClick={() => confirmSudo(false)}>
                  Cancel
                </button>
                <button className="danger-button" type="button" style={{ flex: 1 }} onClick={() => confirmSudo(true)}>
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
