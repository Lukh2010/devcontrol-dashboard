import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  dashboardQueryKeys,
  fetchNetworkInfo,
  fetchPorts,
  fetchProcesses
} from '../api/client';
import {
  actionEventSchema,
  streamNetworkSnapshotSchema,
  streamProcessSnapshotSchema,
  streamSystemSnapshotSchema
} from '../api/schemas';

const DashboardStreamContext = createContext(null);

const initialState = {
  systemInfo: null,
  performanceData: null,
  ports: [],
  processes: [],
  networkInfo: null,
  isAdmin: false,
  terminalState: 'unknown',
  lastAction: null,
  actionFeed: [],
  lastHeartbeat: null,
  lastUpdate: null,
  streamStatus: 'connecting',
  reconnectAttempt: 0,
  streamError: null,
  terminalMessage: null,
  terminalRetryAfter: null,
  notice: null
};

export function DashboardStreamProvider({ children }) {
  const [state, setState] = useState(initialState);
  const queryClient = useQueryClient();
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);

  const refreshProcesses = useCallback(async () => {
    const data = await queryClient.fetchQuery({
      queryKey: dashboardQueryKeys.processes,
      queryFn: fetchProcesses
    });
    setState((prev) => ({ ...prev, processes: data, lastUpdate: Date.now() }));
    return data;
  }, [queryClient]);

  const refreshPorts = useCallback(async () => {
    const data = await queryClient.fetchQuery({
      queryKey: dashboardQueryKeys.ports,
      queryFn: fetchPorts
    });
    setState((prev) => ({ ...prev, ports: data, lastUpdate: Date.now() }));
    return data;
  }, [queryClient]);

  const refreshNetwork = useCallback(async () => {
    const data = await queryClient.fetchQuery({
      queryKey: dashboardQueryKeys.networkInfo,
      queryFn: fetchNetworkInfo
    });
    setState((prev) => ({ ...prev, networkInfo: data, lastUpdate: Date.now() }));
    return data;
  }, [queryClient]);

  const recordUiAction = useCallback((action) => {
    const normalizedAction = {
      action: action.action || 'ui_event',
      status: action.status || 'info',
      message: action.message || 'Interface updated',
      severity: action.severity || 'neutral',
      entity_type: action.entity_type || 'ui',
      entity_id: action.entity_id ?? null,
      retry_after: action.retry_after ?? null,
      requires_admin: action.requires_admin ?? false,
      requires_password: action.requires_password ?? false,
      timestamp: action.timestamp || Date.now(),
      ...action
    };

    setState((prev) => ({
      ...prev,
      lastAction: normalizedAction,
      actionFeed: [normalizedAction, ...prev.actionFeed].slice(0, 10),
      notice: normalizedAction.severity !== 'neutral' ? normalizedAction : prev.notice
    }));
  }, []);

  const dismissNotice = useCallback(() => {
    setState((prev) => ({ ...prev, notice: null }));
  }, []);

  useEffect(() => {
    let source;
    let cancelled = false;

    const markMalformedEvent = (eventType) => {
      setState((prev) => ({ ...prev, streamError: `Malformed event: ${eventType}` }));
    };

    const connect = () => {
      if (cancelled) return;

      setState((prev) => ({
        ...prev,
        streamStatus: 'connecting',
        streamError: null
      }));

      source = new EventSource('/api/events/stream');

      source.onopen = () => {
        reconnectAttemptRef.current = 0;
        setState((prev) => ({
          ...prev,
          streamStatus: 'connected',
          reconnectAttempt: 0,
          streamError: null,
          lastUpdate: Date.now()
        }));
      };

      source.addEventListener('heartbeat', () => {
        const now = Date.now();
        setState((prev) => ({ ...prev, lastHeartbeat: now }));
      });

      source.addEventListener('system_snapshot', (event) => {
        let payload;
        try {
          payload = streamSystemSnapshotSchema.parse(JSON.parse(event.data || '{}'));
        } catch {
          markMalformedEvent('system_snapshot');
          return;
        }
        if (payload.system_info) {
          queryClient.setQueryData(dashboardQueryKeys.systemInfo, payload.system_info);
        }
        if (payload.performance) {
          queryClient.setQueryData(dashboardQueryKeys.systemPerformance, payload.performance);
        }
        setState((prev) => ({
          ...prev,
          systemInfo: payload.system_info || prev.systemInfo,
          performanceData: payload.performance || prev.performanceData,
          isAdmin: typeof payload.is_admin === 'boolean' ? payload.is_admin : prev.isAdmin,
          lastUpdate: Date.now()
        }));
      });

      source.addEventListener('process_snapshot', (event) => {
        let payload;
        try {
          payload = streamProcessSnapshotSchema.parse(JSON.parse(event.data || '{}'));
        } catch {
          markMalformedEvent('process_snapshot');
          return;
        }
        if (payload.processes) {
          queryClient.setQueryData(dashboardQueryKeys.processes, payload.processes);
        }
        setState((prev) => ({
          ...prev,
          processes: payload.processes || prev.processes,
          lastUpdate: Date.now()
        }));
      });

      source.addEventListener('network_snapshot', (event) => {
        let payload;
        try {
          payload = streamNetworkSnapshotSchema.parse(JSON.parse(event.data || '{}'));
        } catch {
          markMalformedEvent('network_snapshot');
          return;
        }
        if (payload.ports) {
          queryClient.setQueryData(dashboardQueryKeys.ports, payload.ports);
        }
        if (payload.network_info) {
          queryClient.setQueryData(dashboardQueryKeys.networkInfo, payload.network_info);
        }
        setState((prev) => ({
          ...prev,
          ports: payload.ports || prev.ports,
          networkInfo: payload.network_info || prev.networkInfo,
          lastUpdate: Date.now()
        }));
      });

      source.addEventListener('action', (event) => {
        let payload;
        try {
          payload = actionEventSchema.parse(JSON.parse(event.data || '{}'));
        } catch {
          markMalformedEvent('action');
          return;
        }
        setState((prev) => {
          const normalizedAction = {
            severity: payload.severity || (payload.status === 'success' ? 'success' : payload.status === 'failed' ? 'danger' : 'warning'),
            message: payload.message || payload.action,
            timestamp: payload.timestamp || Date.now(),
            ...payload
          };

          // Keep list queries fresh when the backend reports successful state changes.
          if (payload.action === 'kill_process' && payload.status === 'success') {
            queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.processes });
          }
          if (payload.action === 'kill_by_port' && payload.status === 'success') {
            queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.ports });
          }

          return {
            ...prev,
            lastAction: normalizedAction,
            actionFeed: [normalizedAction, ...prev.actionFeed].slice(0, 10),
            terminalState: payload.action === 'terminal_state' ? payload.status : prev.terminalState,
            terminalMessage: payload.action === 'terminal_state' ? (payload.message || prev.terminalMessage) : prev.terminalMessage,
            terminalRetryAfter: payload.action === 'terminal_state' ? (payload.retry_after ?? prev.terminalRetryAfter) : prev.terminalRetryAfter,
            notice: normalizedAction.severity !== 'neutral' ? normalizedAction : prev.notice,
            lastUpdate: Date.now()
          };
        });
      });

      source.onerror = () => {
        source.close();
        if (cancelled) return;

        reconnectAttemptRef.current += 1;
        const attempt = reconnectAttemptRef.current;
        const delay = Math.min(1000 * 2 ** (attempt - 1), 15000);

        setState((prev) => ({
          ...prev,
          streamStatus: 'reconnecting',
          reconnectAttempt: attempt,
          streamError: `Connection dropped, retrying in ${Math.round(delay / 1000)}s`
        }));

        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (source) {
        source.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [queryClient]);

  const stale = useMemo(() => {
    if (!state.lastUpdate) return true;
    return Date.now() - state.lastUpdate > 15000;
  }, [state.lastUpdate]);

  const value = useMemo(() => ({
    ...state,
    stale,
    refreshProcesses,
    refreshPorts,
    refreshNetwork,
    recordUiAction,
    dismissNotice
  }), [dismissNotice, recordUiAction, refreshNetwork, refreshPorts, refreshProcesses, stale, state]);

  return (
    <DashboardStreamContext.Provider value={value}>
      {children}
    </DashboardStreamContext.Provider>
  );
}

export function useDashboardStream() {
  const context = useContext(DashboardStreamContext);
  if (!context) {
    throw new Error('useDashboardStream must be used within DashboardStreamProvider');
  }
  return context;
}
