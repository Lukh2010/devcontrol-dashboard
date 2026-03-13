import React, { useState } from 'react';
import { Terminal, Play, AlertTriangle, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react';

const CommandRunner = () => {
  const [customCommands, setCustomCommands] = useState([
    { id: 1, name: 'List Files', command: 'ls -la' },
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
        ...result,
        timestamp: new Date()
      }, ...prev].slice(0, 10)); // Keep last 10 results
      
    } catch (error) {
      setCommandResults(prev => [{
        id: Date.now(),
        name,
        command,
        success: false,
        error: error.message,
        timestamp: new Date()
      }, ...prev].slice(0, 10));
    } finally {
      setExecutingCommand(null);
    }
  };

  const addCustomCommand = () => {
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

  const formatTimestamp = (date) => {
    return date.toLocaleTimeString();
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title flex items-center">
          <Terminal className="w-4 h-4 mr-2" />
          COMMAND RUNNER
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary flex items-center space-x-1"
        >
          <Plus className="w-3 h-3" />
          <span>ADD COMMAND</span>
        </button>
      </div>

      {showAddForm && (
        <div className="mx-4 mt-4 p-3 bg-military-800 border border-military-700">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              placeholder="Command name..."
              value={newCommand.name}
              onChange={(e) => setNewCommand(prev => ({ ...prev, name: e.target.value }))}
              className="px-3 py-2 bg-military-900 border border-military-600 text-military-100 text-xs placeholder-military-500 focus:outline-none focus:border-tactical-green"
            />
            <input
              type="text"
              placeholder="Command..."
              value={newCommand.command}
              onChange={(e) => setNewCommand(prev => ({ ...prev, command: e.target.value }))}
              className="px-3 py-2 bg-military-900 border border-military-600 text-military-100 text-xs placeholder-military-500 focus:outline-none focus:border-tactical-green"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={addCustomCommand}
              className="btn-primary"
            >
              ADD
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="btn-secondary"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Command List */}
          <div>
            <h3 className="text-xs font-bold text-tactical-green mb-3">SAVED COMMANDS</h3>
            <div className="space-y-2">
              {customCommands.map((cmd) => (
                <div
                  key={cmd.id}
                  className="bg-military-800 border border-military-700 p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-military-100 text-sm">{cmd.name}</div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => executeCommand(cmd.command, cmd.name)}
                        disabled={executingCommand === cmd.name}
                        className={`btn-primary flex items-center space-x-1 ${
                          executingCommand === cmd.name ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Play className="w-3 h-3" />
                        <span>{executingCommand === cmd.name ? 'RUNNING...' : 'RUN'}</span>
                      </button>
                      <button
                        onClick={() => deleteCommand(cmd.id)}
                        className="btn-danger p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-military-400 font-mono bg-military-900 p-2 border border-military-700">
                    {cmd.command}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Command Results */}
          <div>
            <h3 className="text-xs font-bold text-tactical-green mb-3">EXECUTION HISTORY</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {commandResults.length === 0 ? (
                <div className="text-center py-8 text-military-400 text-sm">
                  No commands executed yet
                </div>
              ) : (
                commandResults.map((result) => (
                  <div
                    key={result.id}
                    className={`border p-3 ${
                      result.success 
                        ? 'bg-green-900 border-green-700' 
                        : 'bg-red-900 border-red-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {result.success ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                        <span className="font-bold text-sm">{result.name}</span>
                      </div>
                      <span className="text-xs text-military-400">
                        {formatTimestamp(result.timestamp)}
                      </span>
                    </div>
                    <div className="text-xs font-mono mb-2 text-military-300">
                      {result.command}
                    </div>
                    {result.stdout && (
                      <div className="text-xs font-mono bg-black bg-opacity-50 p-2 mb-1 text-green-300">
                        {result.stdout}
                      </div>
                    )}
                    {(result.stderr || result.error) && (
                      <div className="text-xs font-mono bg-black bg-opacity-50 p-2 text-red-300">
                        {result.stderr || result.error}
                      </div>
                    )}
                    {result.return_code !== undefined && (
                      <div className="text-xs mt-2 text-military-400">
                        Exit code: {result.return_code}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Commands */}
        <div className="mt-6">
          <h3 className="text-xs font-bold text-tactical-green mb-3">QUICK COMMANDS</h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              { name: 'Clear Terminal', command: 'clear' },
              { name: 'Current Directory', command: 'pwd' },
              { name: 'Disk Usage', command: 'df -h' },
              { name: 'System Info', command: 'uname -a' },
            ].map((cmd, index) => (
              <button
                key={index}
                onClick={() => executeCommand(cmd.command, cmd.name)}
                disabled={executingCommand === cmd.name}
                className="btn-secondary text-xs"
              >
                {cmd.name}
              </button>
            ))}
          </div>
        </div>

        {/* Security Warning */}
        <div className="mt-6 p-3 bg-military-800 border border-military-700">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-tactical-orange" />
            <div className="text-xs font-bold text-tactical-orange">SECURITY NOTICE</div>
          </div>
          <div className="text-xs text-military-400">
            Commands are executed with your current user permissions. 
            Be cautious when running commands that modify files or system settings. 
            Dangerous commands are automatically blocked for security.
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandRunner;
