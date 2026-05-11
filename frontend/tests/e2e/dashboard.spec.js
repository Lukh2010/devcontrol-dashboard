import { expect, test } from '@playwright/test';

function sseBody({ hostname = 'playwright-box' } = {}) {
  return [
    'event: system_snapshot',
    `data: ${JSON.stringify({
      system_info: {
        platform: 'Windows',
        platform_release: '11',
        platform_version: '10.0',
        architecture: 'AMD64',
        hostname,
        processor: 'x86',
        cpu_count: 8,
        memory_total: 17179869184,
        memory_available: 8589934592
      },
      performance: {
        cpu_percent: 18.5,
        cpu_count: 8,
        memory: { total: 1, available: 1, percent: 1, used: 1, free: 1 },
        disk: { total: 1, used: 1, free: 1, percent: 1 },
        timestamp: Date.now()
      },
      is_admin: true
    })}`,
    '',
    'event: process_snapshot',
    `data: ${JSON.stringify({ processes: [] })}`,
    '',
    'event: network_snapshot',
    `data: ${JSON.stringify({
      ports: [],
      network_info: {
        interfaces: {},
        default_gateway: 'Unknown',
        hostname
      }
    })}`,
    '',
    'event: heartbeat',
    'data: {}',
    ''
  ].join('\n');
}

async function mockAuthSession(route) {
  const method = route.request().method();

  if (method === 'DELETE') {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    });
    return;
  }

  const body = JSON.parse(route.request().postData() ?? '{}');
  await route.fulfill({
    status: body.password === 'secret-123' ? 200 : 401,
    contentType: 'application/json',
    body: JSON.stringify({
      valid: body.password === 'secret-123',
      configured: true,
      required: true
    })
  });
}

async function mockTerminalWebSocket(page) {
  await page.addInitScript(() => {
    class MockTerminalWebSocket {
      static CONNECTING = 0;

      static OPEN = 1;

      static CLOSING = 2;

      static CLOSED = 3;

      constructor(url) {
        this.url = url;
        this.readyState = MockTerminalWebSocket.CONNECTING;
        setTimeout(() => {
          this.readyState = MockTerminalWebSocket.OPEN;
          this.onopen?.();
          this.emit({
            type: 'welcome',
            message: 'Terminal session ready',
            working_dir: 'C:/Users/lukas/Documents/Windsurf/CascadeProjects/Admin Pannel',
            session_id: 'playwright-terminal'
          });
        }, 10);
      }

      emit(payload) {
        this.onmessage?.({ data: JSON.stringify(payload) });
      }

      send(payload) {
        const message = JSON.parse(payload);
        if (message.type === 'get_safe_commands') {
          this.emit({ type: 'safe_commands', examples: ['dir - list files'] });
          return;
        }

        if (message.type === 'classify_command') {
          this.emit({
            type: 'command_classification',
            request_id: message.request_id,
            command: message.command,
            classification: 'safe',
            status: 'allowed',
            reason: 'safe_command',
            message: 'Command is allowed.',
            requires_confirmation: false
          });
          return;
        }

        if (message.type === 'execute_command' && message.command === 'dir') {
          this.emit({ type: 'command_sent', command: 'dir', classification: 'safe' });
          this.emit({
            type: 'output',
            data: ' Directory of C:\\\\DevControl\\nREADME.md\\nbackend\\nfrontend\\n',
            timestamp: Date.now() / 1000
          });
          this.emit({
            type: 'command_result',
            command: 'dir',
            classification: 'safe',
            status: 'completed',
            reason: null,
            message: 'Command exited with code 0',
            return_code: 0,
            success: true,
            timed_out: false,
            timestamp: Date.now() / 1000
          });
        }
      }

      close() {
        this.readyState = MockTerminalWebSocket.CLOSED;
        this.onclose?.({ code: 1000 });
      }
    }

    window.WebSocket = MockTerminalWebSocket;
  });
}

test('hides the password field when password protection is disabled', async ({ page }) => {
  await page.route('**/api/auth/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ enabled: false, required: false })
    });
  });

  await page.route('**/api/auth/session', mockAuthSession);

  await page.route('**/api/events/stream', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody({ hostname: 'no-password-host' })
    });
  });

  await page.goto('/');

  await expect(page.getByText('no-password-host')).toBeVisible();
  await expect(page.getByLabel('Control Password')).toHaveCount(0);
  await expect(page.getByText('No Password').first()).toBeVisible();
});

test('shows the password field when password protection is enabled', async ({ page }) => {
  await page.route('**/api/auth/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ enabled: true, required: true })
    });
  });

  await page.route('**/api/auth/validate', async (route) => {
    const request = route.request();
    const body = JSON.parse(request.postData() ?? '{}');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        valid: body.password === 'secret-123',
        configured: true,
        required: true
      })
    });
  });

  await page.route('**/api/auth/session', mockAuthSession);

  await page.route('**/api/events/stream', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody({ hostname: 'locked-host' })
    });
  });

  await page.goto('/');

  await expect(page.getByLabel('Control Password')).toBeVisible();
  await expect(page.getByText('locked-host')).toBeVisible();
});

test('unlocks with password and shows unlocked state', async ({ page }) => {
  let sessionActive = false;

  await page.route('**/api/auth/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ enabled: true, required: true, session_active: sessionActive })
    });
  });

  await page.route('**/api/auth/validate', async (route) => {
    const request = route.request();
    const body = JSON.parse(request.postData() ?? '{}');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        valid: body.password === 'secret-123',
        configured: true,
        required: true
      })
    });
  });

  await page.route('**/api/auth/session', async (route) => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() ?? '{}');
      sessionActive = body.password === 'secret-123';
      await route.fulfill({
        status: sessionActive ? 200 : 401,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: sessionActive,
          configured: true,
          required: true,
          session_active: sessionActive,
          message: sessionActive ? 'Control session unlocked.' : 'Invalid control password'
        })
      });
      return;
    }

    sessionActive = false;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, session_active: false })
    });
  });

  await page.route('**/api/events/stream', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody({ hostname: 'unlock-test-host' })
    });
  });

  await page.goto('/');

  await page.getByLabel('Control Password').fill('secret-123');
  await page.getByRole('button', { name: 'Unlock' }).click();

  await expect(page.getByText(/^Unlocked$/).first()).toBeVisible();
});

test('locks session and shows locked state', async ({ page }) => {
  let sessionActive = true;

  await page.route('**/api/auth/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ enabled: true, required: true, session_active: sessionActive })
    });
  });

  await page.route('**/api/auth/session', async (route) => {
    if (route.request().method() === 'DELETE') {
      sessionActive = false;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, session_active: false })
      });
      return;
    }

    sessionActive = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        valid: true,
        configured: true,
        required: true,
        session_active: true,
        message: 'Control session unlocked.'
      })
    });
  });

  await page.route('**/api/events/stream', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody({ hostname: 'lock-test-host' })
    });
  });

  await page.goto('/');

  await page.getByRole('button', { name: 'Lock', exact: true }).click();

  await expect(page.getByText('Control session locked.').first()).toBeVisible();
});

test('displays action events in the recent actions feed', async ({ page }) => {
  const actionSseBody = [
    'event: system_snapshot',
    `data: ${JSON.stringify({
      system_info: {
        platform: 'Windows',
        platform_release: '11',
        platform_version: '10.0',
        architecture: 'AMD64',
        hostname: 'action-feed-host',
        processor: 'x86',
        cpu_count: 8,
        memory_total: 17179869184,
        memory_available: 8589934592
      },
      performance: {
        cpu_percent: 18.5,
        cpu_count: 8,
        memory: { total: 1, available: 1, percent: 1, used: 1, free: 1 },
        disk: { total: 1, used: 1, free: 1, percent: 1 },
        timestamp: Date.now()
      },
      is_admin: true
    })}`,
    '',
    'event: process_snapshot',
    `data: ${JSON.stringify({ processes: [] })}`,
    '',
    'event: network_snapshot',
    `data: ${JSON.stringify({
      ports: [],
      network_info: { interfaces: {}, default_gateway: 'Unknown', hostname: 'action-feed-host' }
    })}`,
    '',
    'event: action',
    `data: ${JSON.stringify({
      action: 'kill_process',
      status: 'success',
      message: 'Stopped process 1234',
      severity: 'success',
      entity_type: 'process',
      entity_id: 1234,
      retry_after: null,
      requires_admin: false,
      requires_password: true,
      timestamp: Date.now()
    })}`,
    '',
    'event: action',
    `data: ${JSON.stringify({
      action: 'kill_by_port',
      status: 'error',
      message: 'Rate limited',
      severity: 'danger',
      entity_type: 'port',
      entity_id: 8080,
      retry_after: 30,
      requires_admin: false,
      requires_password: true,
      timestamp: Date.now()
    })}`,
    '',
    'event: heartbeat',
    'data: {}',
    ''
  ].join('\n');

  await page.route('**/api/auth/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ enabled: false, required: false })
    });
  });

  await page.route('**/api/auth/session', mockAuthSession);

  await page.route('**/api/events/stream', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: actionSseBody
    });
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Recent actions', exact: true })).toBeVisible();
  await expect(page.locator('.action-feed').getByText('Stopped process 1234')).toBeVisible();
  await expect(page.locator('.action-feed').getByText('Rate limited')).toBeVisible();
});

test('unlocks password mode and executes dir in the terminal', async ({ page }) => {
  let sessionActive = false;
  await mockTerminalWebSocket(page);

  await page.route('**/api/auth/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ enabled: true, required: true, session_active: sessionActive })
    });
  });

  await page.route('**/api/auth/validate', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        valid: body.password === 'secret-123',
        configured: true,
        required: true
      })
    });
  });

  await page.route('**/api/auth/session', async (route) => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() ?? '{}');
      sessionActive = body.password === 'secret-123';
      await route.fulfill({
        status: sessionActive ? 200 : 401,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: sessionActive,
          configured: true,
          required: true,
          session_active: sessionActive,
          message: sessionActive ? 'Control session unlocked.' : 'Invalid control password'
        })
      });
      return;
    }

    sessionActive = false;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, session_active: false })
    });
  });

  await page.route('**/api/events/stream', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody({ hostname: 'terminal-dir-host' })
    });
  });

  await page.goto('/');

  await page.getByLabel('Control Password').fill('secret-123');
  await page.getByRole('button', { name: 'Unlock' }).click();

  await expect(page.getByText(/^Unlocked$/).first()).toBeVisible();
  await expect(page.getByText('Connected').first()).toBeVisible();

  const terminalInput = page.getByLabel('Terminal command');
  await terminalInput.fill('dir');
  await terminalInput.press('Enter');

  await expect(page.getByText('$ dir')).toBeVisible();
  await expect(page.getByText('README.md')).toBeVisible();
  await expect(page.getByText('Terminal audit')).toBeVisible();
  await expect(page.getByText('Return code 0')).toBeVisible();
});
