import { test, expect } from '@playwright/test';
import { OFFICER_CREDENTIALS, setupErrorMonitor } from '../../helpers/test-utils.js';

test.describe('Field Officer Authentication E2E Smoke Tests', () => {
  test('Officer logs in successfully and is redirected to Officer Dashboard', async ({ page }) => {
    const monitor = setupErrorMonitor(page);

    await page.goto('/login');

    // Enter credentials
    await page.fill('input[type="email"], input[name="email"]', OFFICER_CREDENTIALS.email);
    await page.fill('input[type="password"], input[name="password"]', OFFICER_CREDENTIALS.password);

    // Submit
    await page.click('button[type="submit"]');

    // Verification
    await expect(page).toHaveURL(/\/officer/, { timeout: 10000 });
    await expect(page.locator('h1, .stitch-page-title, .page-title').first()).toBeVisible();

    // Check that no critical 500 network errors occurred
    expect(monitor.getNetworkErrors()).toHaveLength(0);
  });

  test('Officer login fails gracefully with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"], input[name="email"]', OFFICER_CREDENTIALS.email);
    await page.fill('input[type="password"], input[name="password"]', 'WrongPassword123');
    await page.click('button[type="submit"]');

    // Should stay on login page and display error feedback
    await expect(page).toHaveURL(/\/login/);
    const errorEl = page.locator('.auth-error-alert, .alert-error, [role="alert"], .error-message');
    await expect(errorEl.first()).toBeVisible({ timeout: 5000 });
  });
});
