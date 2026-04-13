import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  lastHeartbeat: null,
  lastUpdate: null,
  streamStatus: 'connecting',
  reconnectAttempt: 0,
  streamError: null
};

export function DashboardStreamProvider({ children }) {
  const [state, setState] = useState(initialState);
  const [clock, setClock] = useState(Date.now());
  const queryClient = useQueryClient();
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);

  const refreshProcesses = async () => {
    const data = await queryClient.fetchQuery({
      queryKey: dashboardQueryKeys.processes,
      queryFn: fetchProcesses
    });
    setState((prev) => ({ ...prev, processes: data, lastUpdate: Date.now() }));
    return data;
  };

  const refreshPorts = async () => {
    const data = await queryClient.fetchQuery({
      queryKey: dashboardQueryKeys.ports,
      queryFn: fetchPorts
    });
    setState((prev) => ({ ...prev, ports: data, lastUpdate: Date.now() }));
    return data;
  };

  const refreshNetwork = async () => {
    const data = await queryClient.fetchQuery({
      queryKey: dashboardQueryKeys.networkInfo,
      queryFn: fetchNetworkInfo
    });
    setState((prev) => ({ ...prev, networkInfo: data, lastUpdate: Date.now() }));
    return data;
  };

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let source;
    let cancelled = false;

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
          streamError: null
        }));
      };

      source.addEventListener('heartbeat', () => {
        const now = Date.now();
        setState((prev) => ({ ...prev, lastHeartbeat: now }));
      });

      source.addEventListener('system_snapshot', (event) => {
        const payload = streamSystemSnapshotSchema.parse(JSON.parse(event.data || '{}'));
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
        const payload = streamProcessSnapshotSchema.parse(JSON.parse(event.data || '{}'));
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
        const payload = streamNetworkSnapshotSchema.parse(JSON.parse(event.data || '{}'));
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
        const payload = actionEventSchema.parse(JSON.parse(event.data || '{}'));
        setState((prev) => ({
          ...prev,
          lastAction: payload,
          terminalState: payload.action === 'terminal_state' ? payload.status : prev.terminalState,
          lastUpdate: Date.now()
        }));
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
  }, [clock, state.lastUpdate, state.lastHeartbeat, state.streamStatus]);

  const value = useMemo(() => ({
    ...state,
    stale,
    refreshProcesses,
    refreshPorts,
    refreshNetwork
  }), [state, stale]);

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
