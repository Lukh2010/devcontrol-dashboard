import { test, expect } from '@playwright/test';

test.describe('Terminal Tabs E2E Suite', () => {
  test('opens terminal and enforces max 4 tabs limit', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/api/auth/status')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: false, session_active: true }) });
      } else if (url.includes('/api/system/info')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ platform: 'Linux', hostname: 'local-test-box' }) });
      } else if (url.includes('/api/system/performance')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ cpu_percent: 10, memory: { percent: 20 } }) });
      } else if (url.includes('/api/health')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ api: { ready: true }, terminal: { thread_alive: true } }) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
    });

    await page.goto('/');

    const terminalTabBtn = page.locator('button', { hasText: 'Terminal' }).first();
    await expect(terminalTabBtn).toBeVisible();
    await terminalTabBtn.click();

    // Verify Terminal tab content is visible
    await expect(page.getByText(/^Terminal 1$/)).toBeVisible();

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
