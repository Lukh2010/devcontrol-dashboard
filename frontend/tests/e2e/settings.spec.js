import { test, expect } from '@playwright/test';

test.describe('Settings Panel E2E Suite', () => {
  test('opens settings panel and toggles preferences', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('devcontrol.activePanel', 'settings');
        window.localStorage.setItem('devcontrol.settings.v1', JSON.stringify({
          lockSensitiveTabsOnStartup: false
        }));
      } catch {
        // storage fallback
      }
    });

    await page.route('**/api/events/stream', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive'
        },
        body: [
          'event: system_snapshot',
          `data: ${JSON.stringify({
            system_info: { platform: 'Linux', hostname: 'local-test-box' },
            performance: { cpu_percent: 10, memory: { percent: 20 } },
            is_admin: true
          })}`,
          '',
          'event: heartbeat',
          'data: {}',
          ''
        ].join('\n')
      });
    });

    await page.route('**/api/auth/status', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: false, session_active: true }) });
    });

    await page.route('**/api/system/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ platform: 'Linux', hostname: 'local-test-box', is_admin: true }) });
    });

    await page.route('**/api/health', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ api: { ready: true }, terminal: { thread_alive: true }, password: { enabled: false } }) });
    });

    await page.route('**/api/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.goto('/');

    // Verify Settings panel header or section text
    await expect(page.getByText('Refresh interval')).toBeVisible({ timeout: 10000 });

    // Switch to Appearance tab and verify options
    const appearanceBtn = page.getByRole('button', { name: 'Appearance' });
    await expect(appearanceBtn).toBeVisible();
    await appearanceBtn.click();
    await expect(page.getByText('Accent color')).toBeVisible();
  });
});
