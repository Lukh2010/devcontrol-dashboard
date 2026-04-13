import React, { useState, useEffect, useRef } from 'react';
import { Copy, Square, Terminal } from 'lucide-react';

const WindowTerminal = ({ controlPassword }) => {
  const [connected, setConnected] = useState(false);
  const [output, setOutput] = useState([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [sudoModal, setSudoModal] = useState(null);
  const [workingDir, setWorkingDir] = useState('');
  const outputEndRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const [passwordRequired, setPasswordRequired] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const passwordQuery = controlPassword ? `?password=${encodeURIComponent(controlPassword)}` : '';
        const websocket = new WebSocket(`${protocol}://${window.location.hostname}:8003${passwordQuery}`);

        websocket.onopen = () => {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          setConnected(true);
          wsRef.current = websocket;
          addOutput({ type: 'system', text: 'Connected to terminal server' });
        };

        websocket.onmessage = (event) => {
          const message = JSON.parse(event.data);
          handleMessage(message);
        };

        websocket.onclose = (event) => {
          setConnected(false);
          wsRef.current = null;
          if (event.code === 4401) {
            setPasswordRequired(true);
            addOutput({ type: 'error', text: 'Wrong control password. Update it above to reconnect.' });
            return;
          }
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        };

        websocket.onerror = () => {
          setConnected(false);
          setOutput((prev) => [...prev, { type: 'error', text: 'Connection error. Retrying...' }]);
        };
      } catch (error) {
        setConnected(false);
        setOutput((prev) => [...prev, { type: 'error', text: `Failed to connect. ${error.message}` }]);
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      }
    };

    const loadAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        if (cancelled) {
          return;
        }

        const enabled = Boolean(data.enabled);
        setPasswordRequired(enabled);

        if (enabled && !controlPassword) {
          setConnected(false);
          setOutput([{ type: 'system', text: 'Enter the control password to unlock terminal access.' }]);
          if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
          }
          return;
        }

        connectWebSocket();
      } catch {
        if (cancelled) {
          return;
        }

        if (!controlPassword) {
          setConnected(false);
          setOutput([{ type: 'system', text: 'Enter the control password to unlock terminal access.' }]);
          return;
        }

        connectWebSocket();
      }
    };

    loadAuthStatus();

    return () => {
      cancelled = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [controlPassword]);

  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output]);

  const handleMessage = (message) => {
    switch (message.type) {
      case 'welcome':
        setWorkingDir(message.working_dir);
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
        addOutput({ type: 'error', text: message.message });
        break;
      default:
        break;
    }
  };

  const addOutput = (item) => {
    setOutput((prev) => [...prev, { ...item, timestamp: Date.now() }]);
  };

  const sendCommand = (command) => {
    if (!wsRef.current || !connected) {
      addOutput({ type: 'error', text: 'Terminal not connected. Please wait...' });
      return;
    }

    if (!command.trim()) {
      return;
    }

    setHistory((prev) => [...prev, { command, timestamp: Date.now() }].slice(-50));
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
  const copyOutput = () => navigator.clipboard.writeText(output.map((item) => item.text).join('\n'));

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      sendCommand(currentCommand);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(history[newIndex].command);
      }
    } else if (event.key === 'ArrowDown') {
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
    } else if (event.key === 'c' && event.ctrlKey) {
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
    <section className="panel">
      <div className="panel-header">
        <div className="panel-title-wrap">
          <span className="panel-icon">
            <Terminal size={18} />
          </span>
          <div>
            <h2 className="panel-title">Terminal</h2>
            <p className="panel-subtitle">
              {passwordRequired
                ? 'Password-gated command console with WebSocket transport.'
                : 'Command console with WebSocket transport.'}
            </p>
          </div>
        </div>

        <span className={`status-badge ${connected ? 'status-success' : 'status-warning'}`}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div className="panel-body">
        <div className="terminal-shell">
          <div className="terminal-bar">
            <div className="terminal-lights">
              <span className="terminal-light" style={{ background: '#fb7185' }} />
              <span className="terminal-light" style={{ background: '#fbbf24' }} />
              <span className="terminal-light" style={{ background: '#34d399' }} />
            </div>

            <div className="panel-title-wrap">
              <button className="ghost-button" onClick={copyOutput} title="Copy">
                <Copy size={16} />
                Copy
              </button>
              <button className="ghost-button" onClick={clearTerminal} title="Clear">
                <Square size={16} />
                Clear
              </button>
            </div>
          </div>

          <div className="terminal-output">
            {output.map((item, index) => (
              <div key={`${item.timestamp}-${index}`} className={getLineClass(item.type)}>
                {item.text}
              </div>
            ))}
            <div ref={outputEndRef} />
          </div>

          <div className="terminal-input-row">
            <span className="terminal-line command">$</span>
            <input
              className="terminal-input"
              type="text"
              value={currentCommand}
              onChange={(event) => setCurrentCommand(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!connected}
              placeholder={passwordRequired
                ? (controlPassword ? (connected ? 'Type command...' : 'Connecting...') : 'Enter control password above')
                : (connected ? 'Type command...' : 'Connecting...')}
            />
          </div>
        </div>

        {workingDir ? (
          <div className="muted-note" style={{ marginTop: '12px' }}>
            Working directory: {workingDir}
          </div>
        ) : null}
      </div>

      {sudoModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="panel-title-wrap">
              <span className="panel-icon">
                <Terminal size={18} />
              </span>
              <div>
                <h3 className="panel-title">Dangerous Command Detected</h3>
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
              <button className="ghost-button" style={{ flex: 1 }} onClick={() => confirmSudo(false)}>
                Cancel
              </button>
              <button className="danger-button" style={{ flex: 1 }} onClick={() => confirmSudo(true)}>
                Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default WindowTerminal;
