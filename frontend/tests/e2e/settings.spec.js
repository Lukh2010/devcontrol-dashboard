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

    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/api/auth/status')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: false, session_active: true }) });
      } else if (url.includes('/api/system/info')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ platform: 'Linux', hostname: 'local-test-box' }) });
      } else if (url.includes('/api/system/performance')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ cpu_percent: 10, memory: { percent: 20 } }) });
      } else if (url.includes('/api/health')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ api: { ready: true }, terminal: { thread_alive: true }, password: { enabled: false } }) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
    });

    await page.goto('/');

    // Verify Settings panel header or section text
    await expect(page.getByText('Refresh interval')).toBeVisible();

    // Switch to Appearance tab and verify options
    const appearanceBtn = page.getByRole('button', { name: 'Appearance' });
    await expect(appearanceBtn).toBeVisible();
    await appearanceBtn.click();
    await expect(page.getByText('Accent color')).toBeVisible();
  });
});
