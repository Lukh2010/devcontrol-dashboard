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
