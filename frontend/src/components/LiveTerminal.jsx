import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Play, Square, Trash2, Copy } from 'lucide-react';

const LiveTerminal = () => {
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom when new output is added
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  const executeCommand = async (command) => {
    if (!command.trim()) return;

    setIsRunning(true);
    
    // Add command to output
    const newOutput = [...terminalOutput, { type: 'command', text: `$ ${command}` }];
    setTerminalOutput(newOutput);

    try {
      const response = await fetch('http://localhost:8000/api/commands/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      
      const result = await response.json();
      
      // Add command output
      const updatedOutput = [
        ...newOutput,
        { 
          type: result.success ? 'output' : 'error', 
          text: result.stdout || result.stderr || result.error || 'Command executed' 
        }
      ];
      setTerminalOutput(updatedOutput);
      
      // Add to history
      setHistory(prev => [...prev, command].slice(-50)); // Keep last 50 commands
      
    } catch (error) {
      setTerminalOutput([
        ...newOutput,
        { type: 'error', text: `Error: ${error.message}` }
      ]);
    } finally {
      setIsRunning(false);
      setCurrentCommand('');
      setHistoryIndex(-1);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      executeCommand(currentCommand);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = Math.min(history.length - 1, historyIndex + 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(history[newIndex]);
      } else {
        setHistoryIndex(-1);
        setCurrentCommand('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Simple tab completion could be implemented here
    }
  };

  const clearTerminal = () => {
    setTerminalOutput([]);
  };

  const copyOutput = () => {
    const text = terminalOutput.map(item => item.text).join('\n');
    navigator.clipboard.writeText(text);
  };

  const stopCommand = () => {
    setIsRunning(false);
    // In a real implementation, you'd need to track the process ID and kill it
    setTerminalOutput(prev => [
      ...prev,
      { type: 'error', text: 'Command stopped by user' }
    ]);
  };

  return (
    <div style={{
      backgroundColor: '#1d1d1f',
      borderRadius: '12px',
      border: '1px solid rgba(0, 0, 0, 0.2)',
      overflow: 'hidden',
      fontFamily: 'Monaco, Consolas, "Courier New", monospace',
      fontSize: '13px'
    }}>
      {/* Terminal Header */}
      <div style={{
        backgroundColor: '#2d2d2f',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(0, 0, 0, 0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#f8f9fa',
          fontWeight: '500'
        }}>
          <Terminal style={{width: '16px', height: '16px'}} />
          Live Terminal
        </div>
        <div style={{display: 'flex', gap: '8px'}}>
          <button
            onClick={copyOutput}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#6c757d',
              padding: '4px',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Copy output"
          >
            <Copy style={{width: '14px', height: '14px'}} />
          </button>
          <button
            onClick={clearTerminal}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#6c757d',
              padding: '4px',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Clear terminal"
          >
            <Trash2 style={{width: '14px', height: '14px'}} />
          </button>
          {isRunning && (
            <button
              onClick={stopCommand}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#ff3b30',
                padding: '4px',
                cursor: 'pointer',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Stop command"
            >
              <Square style={{width: '14px', height: '14px'}} />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        style={{
          height: '400px',
          overflow: 'auto',
          padding: '16px',
          backgroundColor: '#1d1d1f'
        }}
      >
        {terminalOutput.map((item, index) => (
          <div
            key={index}
            style={{
              marginBottom: '4px',
              color: item.type === 'error' ? '#ff3b30' : 
                     item.type === 'command' ? '#34c759' : '#f8f9fa',
              whiteSpace: 'pre-wrap'
            }}
          >
            {item.text}
          </div>
        ))}
        
        {/* Command Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          color: '#34c759'
        }}>
          <span>$ </span>
          <input
            ref={inputRef}
            type="text"
            value={currentCommand}
            onChange={(e) => setCurrentCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isRunning}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#f8f9fa',
              outline: 'none',
              flex: 1,
              fontFamily: 'inherit',
              fontSize: 'inherit',
              marginLeft: '4px'
            }}
            placeholder={isRunning ? 'Executing...' : 'Type command...'}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div style={{
        backgroundColor: '#2d2d2f',
        padding: '8px 16px',
        borderTop: '1px solid rgba(0, 0, 0, 0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px',
        color: '#6c757d'
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isRunning ? '#34c759' : '#6c757d'
          }} />
          {isRunning ? 'Running' : 'Ready'}
        </div>
        <div>
          History: {history.length} commands
        </div>
      </div>
    </div>
  );
};

export default LiveTerminal;
