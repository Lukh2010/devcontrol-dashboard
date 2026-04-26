import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  dashboardQueryKeys,
  portsQueryOptions,
  processesQueryOptions
} from '../api/client';
import {
  actionEventSchema,
  streamNetworkSnapshotSchema,
  streamProcessSnapshotSchema,
  streamSystemSnapshotSchema
} from '../api/schemas';

const DashboardStreamContext = createContext(null);

const initialState = {
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
  const lastEventIdRef = useRef(null);

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

    const rememberEventId = (event) => {
      const rawEventId = event?.lastEventId;
      if (!rawEventId) {
        return true;
      }

      const nextEventId = Number(rawEventId);
      const previousEventId = Number(lastEventIdRef.current);
      if (
        Number.isFinite(nextEventId)
        && Number.isFinite(previousEventId)
        && nextEventId <= previousEventId
      ) {
        return false;
      }

      lastEventIdRef.current = rawEventId;
      return true;
    };

    const connect = () => {
      if (cancelled) return;

      setState((prev) => ({
        ...prev,
        streamStatus: 'connecting',
        streamError: null
      }));

      const streamUrl = lastEventIdRef.current
        ? `/api/events/stream?last_event_id=${encodeURIComponent(lastEventIdRef.current)}`
        : '/api/events/stream';
      source = new EventSource(streamUrl);

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

      source.addEventListener('heartbeat', (event) => {
        if (!rememberEventId(event)) {
          return;
        }
        const now = Date.now();
        setState((prev) => ({ ...prev, lastHeartbeat: now }));
      });

      source.addEventListener('system_snapshot', (event) => {
        if (!rememberEventId(event)) {
          return;
        }
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
        if (typeof payload.is_admin === 'boolean') {
          const previousAdminState = queryClient.getQueryData(dashboardQueryKeys.systemAdmin);
          queryClient.setQueryData(dashboardQueryKeys.systemAdmin, {
            is_admin: payload.is_admin,
            platform: payload.system_info?.platform || previousAdminState?.platform || 'unknown'
          });
        }
        setState((prev) => ({
          ...prev,
          lastUpdate: Date.now()
        }));
      });

      source.addEventListener('process_snapshot', (event) => {
        if (!rememberEventId(event)) {
          return;
        }
        try {
          streamProcessSnapshotSchema.parse(JSON.parse(event.data || '{}'));
        } catch {
          markMalformedEvent('process_snapshot');
          return;
        }
        void queryClient.fetchQuery(processesQueryOptions()).catch(() => undefined);
        setState((prev) => ({
          ...prev,
          lastUpdate: Date.now()
        }));
      });

      source.addEventListener('network_snapshot', (event) => {
        if (!rememberEventId(event)) {
          return;
        }
        let payload;
        try {
          payload = streamNetworkSnapshotSchema.parse(JSON.parse(event.data || '{}'));
        } catch {
          markMalformedEvent('network_snapshot');
          return;
        }
        if (payload.network_info) {
          queryClient.setQueryData(dashboardQueryKeys.networkInfo, payload.network_info);
        }
        void queryClient.fetchQuery(portsQueryOptions()).catch(() => undefined);
        setState((prev) => ({
          ...prev,
          lastUpdate: Date.now()
        }));
      });

      source.addEventListener('action', (event) => {
        if (!rememberEventId(event)) {
          return;
        }
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
            void queryClient.fetchQuery(processesQueryOptions()).catch(() => undefined);
          }
          if (payload.action === 'kill_by_port' && payload.status === 'success') {
            void queryClient.fetchQuery(portsQueryOptions()).catch(() => undefined);
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

      source.addEventListener('stream_error', (event) => {
        if (!rememberEventId(event)) {
          return;
        }

        let payload;
        try {
          payload = JSON.parse(event.data || '{}');
        } catch {
          markMalformedEvent('stream_error');
          return;
        }

        setState((prev) => ({
          ...prev,
          streamError: payload.message || payload.reason || 'Live stream error',
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
  }, [state.lastUpdate]);

  const value = useMemo(() => ({
    ...state,
    stale,
    recordUiAction,
    dismissNotice
  }), [dismissNotice, recordUiAction, stale, state]);

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
