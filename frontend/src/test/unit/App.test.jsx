import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../../App';

class MockEventSource {
  constructor(url) {
    this.url = url;
    this.listeners = new Map();
    setTimeout(() => {
      this.onopen?.();
      this.emit('system_snapshot', {
        system_info: {
          hostname: 'dev-box',
          platform: 'Windows',
          platform_release: '11',
          platform_version: '10.0',
          architecture: 'AMD64',
          processor: 'x86',
          cpu_count: 8,
          memory_total: 17179869184,
          memory_available: 8589934592
        },
        performance: {
          cpu_percent: 11.2,
          cpu_count: 8,
          memory: { total: 1, available: 1, percent: 1, used: 1, free: 1 },
          disk: { total: 1, used: 1, free: 1, percent: 1 },
          timestamp: Date.now()
        },
        is_admin: true
      });
      this.emit('process_snapshot', { processes: [] });
      this.emit('network_snapshot', {
        ports: [],
        network_info: { interfaces: {}, default_gateway: 'Unknown', hostname: 'dev-box' }
      });
      this.emit('action', {
        action: 'terminal_state',
        status: 'connected',
        message: 'Terminal session connected',
        severity: 'success',
        entity_type: 'terminal',
        entity_id: 8003,
        timestamp: Date.now()
      });
      this.emit('heartbeat', {});
    }, 0);
  }

  addEventListener(type, callback) {
    this.listeners.set(type, callback);
  }

  emit(type, payload) {
    const callback = this.listeners.get(type);
    callback?.({ data: JSON.stringify(payload) });
  }

  close() {}
}

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

describe('App auth mode rendering', () => {
  beforeEach(() => {
    vi.stubGlobal('EventSource', MockEventSource);
    vi.stubGlobal('fetch', vi.fn((input, init) => {
      const url = String(input);

      if (url.endsWith('/api/auth/status')) {
        return Promise.resolve(new Response(JSON.stringify({
          enabled: true,
          required: true,
          session_active: false
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }

      if (url.endsWith('/api/auth/validate')) {
        const body = JSON.parse(init?.body ?? '{}');
        return Promise.resolve(new Response(JSON.stringify({
          valid: body.password === 'secret-123',
          configured: true,
          required: true
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }

      return Promise.resolve(new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows the password field when password protection is enabled', async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByLabelText('Control Password')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Unlock' })).toBeInTheDocument();
  });

  it('renders live system information from the stream', async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByText('dev-box')).toBeInTheDocument();
    });

    expect(screen.getByText('Recent actions')).toBeInTheDocument();
    expect(screen.getAllByText('Terminal session connected').length).toBeGreaterThan(0);
  });
});
