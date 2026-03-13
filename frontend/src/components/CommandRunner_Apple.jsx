import React, { useState } from 'react';
import { Terminal, Play, AlertTriangle, Plus, Trash2 } from 'lucide-react';

const styles = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    padding: '20px'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px'
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1d1d1f',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  button: {
    backgroundColor: '#007aff',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease'
  },
  buttonSecondary: {
    backgroundColor: '#f1f3f4',
    color: '#1d1d1f',
    border: '1px solid rgba(0, 0, 0, 0.1)'
  },
  input: {
    backgroundColor: '#ffffff',
    border: '1px solid rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    marginBottom: '10px'
  },
  commandList: {
    maxHeight: '400px',
    overflowY: 'auto'
  },
  commandItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '8px',
    border: '1px solid rgba(0, 0, 0, 0.1)'
  },
  commandHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  commandName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1d1d1f'
  },
  commandText: {
    fontSize: '12px',
    color: '#6c757d',
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: '4px 8px',
    borderRadius: '4px',
    marginTop: '4px'
  },
  resultItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '8px',
    border: '1px solid rgba(0, 0, 0, 0.1)'
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  resultName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1d1d1f'
  },
  resultTime: {
    fontSize: '12px',
    color: '#6c757d'
  },
  resultOutput: {
    fontSize: '13px',
    color: '#1d1d1f',
    fontFamily: 'monospace',
    backgroundColor: '#ffffff',
    padding: '12px',
    borderRadius: '4px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    whiteSpace: 'pre-wrap',
    overflowX: 'auto'
  },
  errorOutput: {
    backgroundColor: '#fff5f5',
    color: '#dc3545',
    border: '1px solid #f8d7da'
  },
  quickCommands: {
    marginTop: '24px'
  },
  quickCommandsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: '12px'
  },
  quickCommandsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px'
  },
  quickCommandButton: {
    backgroundColor: '#f8f9fa',
    color: '#1d1d1f',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  securityNotice: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '24px'
  },
  securityHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px'
  },
  securityTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#856404'
  },
  securityText: {
    fontSize: '12px',
    color: '#856404',
    lineHeight: '1.4'
  }
};

const CommandRunner = () => {
  const [customCommands, setCustomCommands] = useState([
    { id: 1, name: 'List Files', command: 'dir' },
    { id: 2, name: 'Git Status', command: 'git status' },
    { id: 3, name: 'NPM Install', command: 'npm install' },
    { id: 4, name: 'Python Version', command: 'python --version' },
  ]);
  const [newCommand, setNewCommand] = useState({ name: '', command: '' });
  const [executingCommand, setExecutingCommand] = useState(null);
  const [commandResults, setCommandResults] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  const executeCommand = async (command, name) => {
    setExecutingCommand(name);
    
    try {
      const response = await fetch('http://localhost:8000/api/commands/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command, name }),
      });
      
      const result = await response.json();
      
      setCommandResults(prev => [{
        id: Date.now(),
        name,
        command,
        output: result.stdout || result.stderr || result.error,
        success: result.success,
        timestamp: new Date().toLocaleTimeString(),
        return_code: result.return_code
      }, ...prev].slice(-10)); // Keep last 10 results
    } catch (error) {
      setCommandResults(prev => [{
        id: Date.now(),
        name,
        command,
        output: `Error: ${error.message}`,
        success: false,
        timestamp: new Date().toLocaleTimeString(),
        return_code: -1
      }, ...prev].slice(-10));
    } finally {
      setExecutingCommand(null);
    }
  };

  const addCommand = () => {
    if (newCommand.name && newCommand.command) {
      setCustomCommands(prev => [...prev, {
        id: Date.now(),
        ...newCommand
      }]);
      setNewCommand({ name: '', command: '' });
      setShowAddForm(false);
    }
  };

  const deleteCommand = (id) => {
    setCustomCommands(prev => prev.filter(cmd => cmd.id !== id));
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          <Terminal style={{width: '20px', height: '20px'}} />
          Command Runner
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={styles.button}
        >
          <Plus style={{width: '16px', height: '16px'}} />
          Add Command
        </button>
      </div>

      {/* Add Command Form */}
      {showAddForm && (
        <div style={styles.commandItem}>
          <input
            type="text"
            placeholder="Command Name"
            value={newCommand.name}
            onChange={(e) => setNewCommand(prev => ({ ...prev, name: e.target.value }))}
            style={styles.input}
          />
          <input
            type="text"
            placeholder="Command"
            value={newCommand.command}
            onChange={(e) => setNewCommand(prev => ({ ...prev, command: e.target.value }))}
            style={styles.input}
          />
          <button
            onClick={addCommand}
            style={styles.button}
          >
            <Plus style={{width: '16px', height: '16px'}} />
            Save
          </button>
        </div>
      )}

      {/* Custom Commands */}
      <div style={styles.commandList}>
        {customCommands.map((cmd) => (
          <div key={cmd.id} style={styles.commandItem}>
            <div style={styles.commandHeader}>
              <div style={styles.commandName}>{cmd.name}</div>
              <button
                onClick={() => executeCommand(cmd.command, cmd.name)}
                disabled={executingCommand === cmd.name}
                style={{...styles.button, ...styles.buttonSecondary, padding: '6px 12px', fontSize: '12px'}}
              >
                <Play style={{width: '14px', height: '14px'}} />
                Run
              </button>
              <button
                onClick={() => deleteCommand(cmd.id)}
                style={{...styles.button, ...styles.buttonSecondary, backgroundColor: '#dc3545', color: '#ffffff', padding: '6px 12px', fontSize: '12px'}}
              >
                <Trash2 style={{width: '14px', height: '14px'}} />
              </button>
            </div>
            <div style={styles.commandText}>{cmd.command}</div>
          </div>
        ))}
      </div>

      {/* Execution Results */}
      {commandResults.length > 0 && (
        <div style={{marginTop: '24px'}}>
          <h3 style={styles.quickCommandsTitle}>Execution History</h3>
          <div style={styles.commandList}>
            {commandResults.map((result) => (
              <div key={result.id} style={styles.resultItem}>
                <div style={styles.resultHeader}>
                  <div style={styles.resultName}>{result.name}</div>
                  <div style={styles.resultTime}>{result.timestamp}</div>
                </div>
                <div style={{...styles.resultOutput, ...(result.success ? {} : styles.errorOutput)}}>
                  {result.output}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Commands */}
      <div style={styles.quickCommands}>
        <h3 style={styles.quickCommandsTitle}>Quick Commands</h3>
        <div style={styles.quickCommandsGrid}>
          {[
            { name: 'Clear Terminal', command: 'cls' },
            { name: 'Current Directory', command: 'cd' },
            { name: 'Disk Usage', command: 'dir' },
            { name: 'System Info', command: 'systeminfo' },
          ].map((cmd, index) => (
            <button
              key={index}
              onClick={() => executeCommand(cmd.command, cmd.name)}
              disabled={executingCommand === cmd.name}
              style={styles.quickCommandButton}
            >
              {cmd.name}
            </button>
          ))}
        </div>
      </div>

      {/* Security Warning */}
      <div style={styles.securityNotice}>
        <div style={styles.securityHeader}>
          <AlertTriangle style={{width: '16px', height: '16px', color: '#856404'}} />
          <div style={styles.securityTitle}>Security Notice</div>
        </div>
        <div style={styles.securityText}>
          Commands are executed with your current user permissions. 
          Be cautious when running commands that modify files or system settings. 
          Dangerous commands are automatically blocked for security.
        </div>
      </div>
    </div>
  );
};

export default CommandRunner;
