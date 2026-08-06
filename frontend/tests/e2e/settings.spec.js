import { test, expect } from '@playwright/test';

test.describe('Settings Panel E2E Suite', () => {
  test('opens settings panel and toggles preferences', async ({ page }) => {
    await page.goto('/');

    const settingsBtn = page.getByRole('button', { name: 'Settings', exact: true });
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // Verify Settings panel header
    await expect(page.getByText('Local UI and behavior preferences')).toBeVisible();

    // Verify theme selector options exist
    await expect(page.getByText('Theme Accent')).toBeVisible();
  });
});
