import { test, expect } from '@playwright/test';
import { ADMIN_CREDENTIALS, setupErrorMonitor } from '../../helpers/test-utils.js';

test.describe('Admin Authentication E2E Smoke Tests', () => {
  test('Admin logs in successfully and is redirected to Dashboard', async ({ page }) => {
    const monitor = setupErrorMonitor(page);

    await page.goto('/login');
    await expect(page).toHaveTitle(/Civic/i);

    // Enter credentials
    await page.fill('input[type="email"], input[name="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"], input[name="password"]', ADMIN_CREDENTIALS.password);

    // Submit
    await page.click('button[type="submit"]');

    // Verification
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.locator('h1, .stitch-page-title, .page-title').first()).toBeVisible();

    // Check that no critical 500 network errors occurred
    expect(monitor.getNetworkErrors()).toHaveLength(0);
  });

  test('Admin login fails gracefully with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"], input[name="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"], input[name="password"]', 'WrongPassword123');
    await page.click('button[type="submit"]');

    // Should stay on login page and display error feedback
    await expect(page).toHaveURL(/\/login/);
    const errorEl = page.locator('.auth-error-alert, .alert-error, [role="alert"], .error-message');
    await expect(errorEl.first()).toBeVisible({ timeout: 5000 });
  });
});
