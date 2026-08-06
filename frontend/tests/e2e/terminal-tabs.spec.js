import { test, expect } from '@playwright/test';

test.describe('Terminal Tabs E2E Suite', () => {
  test('opens terminal and enforces max 4 tabs limit', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('devcontrol.activePanel', 'commands');
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

    // Verify Terminal tab content is visible
    await expect(page.getByText(/^Terminal 1$/)).toBeVisible({ timeout: 10000 });

    // Find the add tab button (+)
    const addTabButton = page.locator('button', { hasText: '+' });

    // Click + button 3 times to reach 4 tabs total
    if (await addTabButton.isVisible()) {
      await addTabButton.click();
      await page.waitForTimeout(100);
      await addTabButton.click();
      await page.waitForTimeout(100);
      await addTabButton.click();
      await page.waitForTimeout(100);
    }

    // Verify 4 terminal tabs are present
    await expect(page.getByText('Terminal 4')).toBeVisible();

    // Plus (+) button should disappear when 4 tabs are open
    await expect(addTabButton).toHaveCount(0);
  });
});
