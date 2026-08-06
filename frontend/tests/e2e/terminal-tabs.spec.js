import { test, expect } from '@playwright/test';

test.describe('Terminal Tabs E2E Suite', () => {
  test('opens terminal and enforces max 4 tabs limit', async ({ page }) => {
    await page.goto('/');

    const terminalTabBtn = page.getByRole('button', { name: 'Terminal', exact: true });
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
