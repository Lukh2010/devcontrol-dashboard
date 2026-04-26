import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const MAX_HISTORY = 50;

const EMPTY_COMMAND_SAFETY = {
  command: '',
  classification: 'empty',
  status: 'idle',
  reason: 'Enter a command to see how the backend will handle it.',
  reason_code: 'empty_command',
  message: 'Enter a command to see how the backend will handle it.',
  requires_confirmation: false
};

function formatRelativeRetry(retryUntil) {
  if (!retryUntil) {
    return null;
  }

  const deltaMs = retryUntil - Date.now();
  return deltaMs > 0 ? Math.ceil(deltaMs / 1000) : 0;
}

export function useTerminalSession({
  authUnlocked,
  passwordProtectionEnabled,
  onAction
}) {
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('idle');
  const [connectionMessage, setConnectionMessage] = useState('Waiting for terminal access.');
  const [retryUntil, setRetryUntil] = useState(null);
  const [output, setOutput] = useState([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [safeSuggestions, setSafeSuggestions] = useState([]);
  const [confirmCommandPrompt, setConfirmCommandPrompt] = useState(null);
  const [workingDir, setWorkingDir] = useState('');
  const [copyState, setCopyState] = useState('idle');
  const [commandSafety, setCommandSafety] = useState(EMPTY_COMMAND_SAFETY);

  const outputEndRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const connectWebSocketRef = useRef(null);
  const wasConnectedRef = useRef(false);
  const intentionalCloseRef = useRef(false);
  const classificationRequestRef = useRef(0);

  const retryCountdown = useMemo(() => formatRelativeRetry(retryUntil), [retryUntil]);

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

  useEffect(() => {
    const normalizedCommand = currentCommand.trim();

    if (!normalizedCommand) {
      setCommandSafety(EMPTY_COMMAND_SAFETY);
      return undefined;
    }

    if (!connected || !wsRef.current) {
      setCommandSafety((previous) => ({
        ...previous,
        command: normalizedCommand,
        classification: previous.classification === 'empty' ? 'unknown' : previous.classification,
        status: previous.status === 'idle' ? 'loading' : previous.status,
        reason: 'Waiting for backend classification...',
        reason_code: 'awaiting_backend_classification',
        message: 'Waiting for backend classification...'
      }));
      return undefined;
    }

    const requestId = classificationRequestRef.current + 1;
    classificationRequestRef.current = requestId;
    const timer = setTimeout(() => {
      wsRef.current?.send(JSON.stringify({
        type: 'classify_command',
        command: normalizedCommand,
        request_id: requestId
      }));
    }, 120);

    return () => clearTimeout(timer);
  }, [connected, currentCommand]);

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
      setConnectionState('reconnecting');
      setConnectionMessage('Attempting to reconnect to the terminal gateway.');
      connectWebSocketRef.current?.();
    }, delayMs);
  }, []);

  const handleMessage = useCallback((message) => {
    switch (message.type) {
      case 'welcome':
        wasConnectedRef.current = true;
        setConnected(true);
        setConnectionState('connected');
        setConnectionMessage('Terminal connected and ready.');
        setRetryUntil(null);
        setWorkingDir(message.working_dir);
        addOutput({ type: 'system', text: 'Connected to terminal server' });
        addOutput({ type: 'system', text: message.message });
        wsRef.current?.send(JSON.stringify({ type: 'get_safe_commands' }));
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
      case 'command_classification':
        if (message.request_id === classificationRequestRef.current) {
          setCommandSafety({
            command: message.command || '',
            classification: message.classification,
            status: message.status,
            reason: message.message,
            reason_code: message.reason,
            message: message.message,
            requires_confirmation: Boolean(message.requires_confirmation)
          });
        }
        break;
      case 'confirm_command_required':
        setConfirmCommandPrompt({
          command: message.command,
          classification: message.classification,
          reason: message.message,
          reason_code: message.reason,
          message: message.message,
          confirmation_guidance: message.confirmation_guidance || []
        });
        setCommandSafety({
          command: message.command || '',
          classification: message.classification,
          status: 'confirmation_required',
          reason: message.message,
          reason_code: message.reason,
          message: message.message,
          requires_confirmation: true
        });
        break;
      case 'interrupt_sent':
      case 'info':
      case 'warning':
      case 'confirm_command_confirmed':
      case 'confirm_command_cancelled':
        addOutput({ type: 'warning', text: message.message });
        break;
      case 'error':
        if (message.reason === 'rate_limited') {
          const retryAt = Date.now() + ((message.retry_after || 1) * 1000);
          setConnected(false);
          setRetryUntil(retryAt);
          setConnectionState('rate_limited');
          setConnectionMessage(`Rate limited. Retry in about ${message.retry_after}s.`);
          break;
        }

        if (message.reason === 'unauthorized') {
          const state = wasConnectedRef.current ? 'session_expired' : 'unauthorized';
          setConnected(false);
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
          break;
        }

        addOutput({ type: 'error', text: message.message });
        break;
      default:
        break;
    }
  }, [addOutput]);

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
        setConnectionState('connecting');
        setConnectionMessage('Authorizing terminal session.');
        setRetryUntil(null);
        wsRef.current = websocket;
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
    connectWebSocketRef.current = connectWebSocket;
  }, [connectWebSocket]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      closeSocket();
    };
  }, [closeSocket, connectWebSocket]);

  const sendCommand = useCallback((command) => {
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
        severity: commandSafety.status === 'blocked' ? 'warning' : 'neutral',
        entity_type: 'terminal',
        entity_id: command
      });
    } catch (error) {
      addOutput({ type: 'error', text: `Failed to send command: ${error.message}` });
    }

    setCurrentCommand('');
  }, [addOutput, commandSafety.classification, commandSafety.status, connected, onAction]);

  const interruptCommand = useCallback(() => {
    if (wsRef.current && connected) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
      addOutput({ type: 'warning', text: 'Interrupt signal sent.' });
    }
  }, [addOutput, connected]);

  const confirmPendingCommand = useCallback((confirmed) => {
    if (wsRef.current && connected && confirmCommandPrompt) {
      wsRef.current.send(JSON.stringify({
        type: 'confirm_command',
        confirmed
      }));
    }
    setConfirmCommandPrompt(null);
  }, [confirmCommandPrompt, connected]);

  const clearTerminal = useCallback(() => {
    setOutput([]);
  }, []);

  const copyOutput = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(output.map((item) => item.text).join('\n'));
      setCopyState('done');
    } catch {
      setCopyState('error');
    }
  }, [output]);

  const copyLine = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('done');
    } catch {
      setCopyState('error');
    }
  }, []);

  const reconnect = useCallback(() => {
    closeSocket();
    setConnectionState('reconnecting');
    setConnectionMessage('Manual reconnect requested.');
    connectWebSocket();
  }, [closeSocket, connectWebSocket]);

  const handleKeyDown = useCallback((event) => {
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
  }, [currentCommand, history, historyIndex, interruptCommand, sendCommand]);

  return {
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
    sendCommand,
    interruptCommand,
    confirmPendingCommand,
    clearTerminal,
    copyOutput,
    copyLine,
    reconnect,
    handleKeyDown
  };
}
