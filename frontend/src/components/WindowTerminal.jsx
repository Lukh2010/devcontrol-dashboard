import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Minus, Square, Copy } from 'lucide-react';

const WindowTerminal = () => {
  const [connected, setConnected] = useState(false);
  const [output, setOutput] = useState([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [sudoModal, setSudoModal] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [workingDir, setWorkingDir] = useState('');
  const terminalRef = useRef(null);
  const inputRef = useRef(null);
  const outputEndRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        console.log('Connecting to WebSocket on ws://localhost:8003...');
        const websocket = new WebSocket('ws://localhost:8003');
        
        websocket.onopen = () => {
          console.log('WebSocket connected successfully!');
          setConnected(true);
          wsRef.current = websocket;
          setOutput([{ type: 'system', text: 'Connected to terminal server' }]);
        };
        
        websocket.onmessage = (event) => {
          const message = JSON.parse(event.data);
          handleMessage(message);
        };
        
        websocket.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          setConnected(false);
          wsRef.current = null;
          // Attempt to reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        };
        
        websocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnected(false);
          setOutput(prev => [...prev, { type: 'error', text: 'Connection error. Retrying...' }]);
        };
        
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setConnected(false);
        setOutput(prev => [...prev, { type: 'error', text: 'Failed to connect. Retrying...' }]);
        // Retry connection after 3 seconds
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
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output]);

  const handleMessage = (message) => {
    switch (message.type) {
      case 'welcome':
        setSessionId(message.session_id);
        setWorkingDir(message.working_dir);
        addOutput({ type: 'system', text: message.message });
        break;
        
      case 'output':
        console.log('Received output:', message.data);
        addOutput({ type: 'output', text: message.data });
        break;
        
      case 'command_sent':
        addOutput({ 
          type: 'command', 
          text: `$ ${message.command}`,
          className: message.classification === 'dangerous' ? 'text-red-400' : 'text-green-400'
        });
        break;
        
      case 'sudo_required':
        setSudoModal({
          command: message.command,
          reason: message.reason,
          warning: message.warning,
          dangerous_examples: message.dangerous_examples
        });
        break;
        
      case 'sudo_confirmed':
        addOutput({ type: 'system', text: message.message, className: 'text-yellow-400' });
        break;
        
      case 'sudo_cancelled':
        addOutput({ type: 'system', text: message.message, className: 'text-yellow-400' });
        break;
        
      case 'error':
        addOutput({ type: 'error', text: message.message, className: 'text-red-400' });
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  };

  const addOutput = (item) => {
    setOutput(prev => [...prev, { ...item, timestamp: Date.now() }]);
  };

  const sendCommand = (command) => {
    if (!wsRef.current || !connected) {
      console.log('Cannot send command - WebSocket not connected');
      addOutput({ type: 'error', text: 'Terminal not connected. Please wait...' });
      return;
    }
    
    if (!command.trim()) {
      console.log('Empty command - not sending');
      return;
    }
    
    console.log('Sending command:', command);
    
    // Add to history
    setHistory(prev => [...prev, { command, timestamp: Date.now() }].slice(-50));
    setHistoryIndex(-1);
    
    // Add command to output
    addOutput({ type: 'command', text: `$ ${command}` });
    
    try {
      // Send command
      wsRef.current.send(JSON.stringify({
        type: 'execute_command',
        command: command
      }));
      
      console.log('Command sent successfully');
    } catch (error) {
      console.error('Failed to send command:', error);
      addOutput({ type: 'error', text: `Failed to send command: ${error.message}` });
    }
    
    setCurrentCommand('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      sendCommand(currentCommand);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(history[newIndex].command);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = Math.min(history.length - 1, historyIndex + 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(history[newIndex].command);
      } else {
        setHistoryIndex(-1);
        setCurrentCommand('');
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      interruptCommand();
    }
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
        confirmed: confirmed
      }));
    }
    setSudoModal(null);
  };

  const clearTerminal = () => {
    setOutput([]);
  };

  const copyOutput = () => {
    const text = output.map(item => item.text).join('\n');
    navigator.clipboard.writeText(text);
  };

  const minimizeWindow = () => {
    // Could implement minimize functionality
    console.log('Minimize window');
  };

  const maximizeWindow = () => {
    // Could implement maximize functionality
    console.log('Maximize window');
  };

  const closeWindow = () => {
    // Could implement close functionality
    console.log('Close window');
  };

  return (
    <div style={{ 
      padding: '20px'
    }}>
      {/* Window Frame */}
      <div style={{
        width: '100%',
        maxWidth: '1200px',
        backgroundColor: '#2d2d2d',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        overflow: 'hidden',
        border: '1px solid #404040'
      }}>
        {/* Title Bar */}
        <div style={{
          backgroundColor: '#1e1e1e',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #404040'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={closeWindow}
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#ff5f57',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer'
                }}
                title="Close"
              />
              <button
                onClick={minimizeWindow}
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#ffbd2e',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer'
                }}
                title="Minimize"
              />
              <button
                onClick={maximizeWindow}
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#28ca42',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer'
                }}
                title="Maximize"
              />
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ color: '#e0e0e0', fontSize: '14px', fontWeight: '500' }}>Terminal</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={copyOutput}
              style={{
                color: '#888',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px'
              }}
              title="Copy"
            >
              <Copy style={{ width: '16px', height: '16px' }} />
            </button>
            <button
              onClick={clearTerminal}
              style={{
                color: '#888',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px'
              }}
              title="Clear"
            >
              <Square style={{ width: '16px', height: '16px' }} />
            </button>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: connected ? '#28ca42' : '#ff5f57'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: connected ? '#28ca42' : '#ff5f57'
              }} />
              {connected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>

        {/* Terminal Content */}
        <div style={{
          backgroundColor: '#000000',
          padding: '16px',
          fontFamily: 'Monaco, Consolas, monospace',
          fontSize: '14px',
          height: '500px',
          overflow: 'auto'
        }} ref={terminalRef}>
          {output.map((item, index) => (
            <div 
              key={index} 
              style={{
                color: item.className === 'text-red-400' ? '#ff5f57' : 
                       item.className === 'text-green-400' ? '#28ca42' :
                       item.className === 'text-yellow-400' ? '#ffbd2e' :
                       '#e0e0e0',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                marginBottom: '4px'
              }}
            >
              {item.text}
            </div>
          ))}
          <div ref={outputEndRef} />
        </div>

        {/* Command Input */}
        <div style={{
          backgroundColor: '#252526',
          borderTop: '1px solid #404040',
          padding: '12px 16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#28ca42', fontFamily: 'Monaco, Consolas, monospace' }}>$</span>
            <input
              ref={inputRef}
              type="text"
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!connected}
              placeholder={connected ? "Type command..." : "Connecting..."}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                border: 'none',
                color: '#e0e0e0',
                padding: '4px 8px',
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: '14px',
                outline: 'none',
                opacity: connected ? 1 : 0.5
              }}
            />
          </div>
          {workingDir && (
            <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
              {workingDir}
            </div>
          )}
        </div>
      </div>

      {/* Sudo Confirmation Modal */}
      {sudoModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: '#2d2d2d',
            border: '1px solid #404040',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            margin: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Terminal style={{ width: '24px', height: '24px', color: '#ffbd2e' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffbd2e', margin: 0 }}>DANGEROUS COMMAND DETECTED</h3>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                backgroundColor: '#1e1e1e',
                border: '1px solid #404040',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '12px'
              }}>
                <div style={{ color: '#ff5f57', fontFamily: 'Monaco, Consolas, monospace', fontSize: '14px', marginBottom: '8px' }}>
                  {sudoModal.command}
                </div>
                <div style={{ color: '#888', fontSize: '12px' }}>
                  {sudoModal.reason}
                </div>
              </div>
              
              <div style={{ color: '#ffbd2e', fontSize: '14px', marginBottom: '12px' }}>
                {sudoModal.warning}
              </div>
              
              <div style={{ color: '#888', fontSize: '12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Dangerous commands include:</div>
                <ul style={{ listStyle: 'disc', paddingLeft: '20px', margin: 0 }}>
                  {sudoModal.dangerous_examples.map((example, index) => (
                    <li key={index} style={{ marginBottom: '4px' }}>{example}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => confirmSudo(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#555',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                CANCEL
              </button>
              <button
                onClick={() => confirmSudo(true)}
                style={{
                  flex: 1,
                  backgroundColor: '#ff5f57',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                EXECUTE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WindowTerminal;
