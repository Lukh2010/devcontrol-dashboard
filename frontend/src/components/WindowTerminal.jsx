import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, RotateCcw, ShieldAlert, Square, Terminal } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { useAuthStatus } from '../features/dashboard/hooks/useAuthStatus';

const MAX_HISTORY = 50;

const WindowTerminal = ({ controlPassword }) => {
  const [connected, setConnected] = useState(false);
  const [output, setOutput] = useState([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [sudoModal, setSudoModal] = useState(null);
  const [workingDir, setWorkingDir] = useState('');
  const [copyState, setCopyState] = useState('idle');
  const outputEndRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const unauthorizedRef = useRef(false);
  const authStatusQuery = useAuthStatus();
  const passwordRequired = authStatusQuery.data?.enabled ?? true;
  const unauthorizedText = passwordRequired
    ? 'Wrong control password. Update it above to reconnect.'
    : 'Launch in Password Mode to access terminal.';

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

  const addOutput = useCallback((item) => {
    setOutput((prev) => [...prev, { ...item, timestamp: Date.now() }]);
  }, []);

  const terminalStatus = useMemo(() => {
    if (connected) {
      return { className: 'status-success', label: 'Connected' };
    }
    if (passwordRequired && controlPassword) {
      return { className: 'status-warning', label: 'Reconnecting' };
    }
    return { className: 'status-neutral', label: 'Idle' };
  }, [connected, controlPassword, passwordRequired]);

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
      case 'sudo_required':
        setSudoModal({
          command: message.command,
          reason: message.reason,
          warning: message.warning,
          dangerous_examples: message.dangerous_examples
        });
        break;
      case 'info':
      case 'warning':
      case 'sudo_confirmed':
      case 'sudo_cancelled':
        addOutput({ type: 'warning', text: message.message });
        break;
      case 'error':
        if (message.reason === 'unauthorized') {
          unauthorizedRef.current = true;
          addOutput({ type: 'error', text: unauthorizedText });
          break;
        }
        addOutput({ type: 'error', text: message.message });
        break;
      default:
        break;
    }
  }, [addOutput, unauthorizedText]);

  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const websocket = new WebSocket(`${protocol}://${window.location.hostname}:8003`);

        websocket.onopen = () => {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          unauthorizedRef.current = false;
          setConnected(true);
          wsRef.current = websocket;
        };

        websocket.onmessage = (event) => {
          const message = JSON.parse(event.data);
          handleMessage(message);
        };

        websocket.onclose = (event) => {
          setConnected(false);
          wsRef.current = null;

          if (event.code === 4401) {
            if (!unauthorizedRef.current) {
              addOutput({ type: 'error', text: unauthorizedText });
            }
            return;
          }

          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        };

        websocket.onerror = () => {
          setConnected(false);
          addOutput({ type: 'error', text: 'Connection error. Retrying...' });
        };
      } catch (error) {
        setConnected(false);
        addOutput({ type: 'error', text: `Failed to connect. ${error.message}` });
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [addOutput, controlPassword, handleMessage, passwordRequired, unauthorizedText]);

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

  const handleReconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    setConnected(false);
    addOutput({ type: 'warning', text: 'Manual reconnect requested.' });
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
          </div>
        </div>

        <div className="chip-row">
          <span className={`status-badge ${terminalStatus.className}`}>{terminalStatus.label}</span>
          <span className={`status-badge ${passwordRequired ? 'status-warning' : 'status-neutral'}`}>
            {passwordRequired ? 'Password gated' : 'No password'}
          </span>
        </div>
      </div>

      <div className="panel-body">
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
                {copyState === 'done' ? 'Copied' : 'Copy'}
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
                    {passwordRequired
                      ? 'Use the password above.'
                      : 'Password mode is disabled.'}
                  </p>
                </div>
              </div>
            ) : (
              output.map((item, index) => (
                <div key={`${item.timestamp}-${index}`} className={getLineClass(item.type)}>
                  {item.text}
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
                placeholder={passwordRequired
                  ? (connected ? 'Type command and press Enter' : 'Connecting to terminal gateway')
                  : 'Launch in password mode to access protected terminal'}
              />
            </div>
            <button className="secondary-button" type="button" disabled={!connected} onClick={interruptCommand}>
              <ShieldAlert size={16} />
              Interrupt
            </button>
          </div>
        </div>
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
                {sudoModal.dangerous_examples.map((example, index) => (
                  <div key={index} className="muted-note">{example}</div>
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
