import { test, expect } from '@playwright/test';
import { setupErrorMonitor, ADMIN_CREDENTIALS } from '../../helpers/test-utils.js';

test.describe('Admin Complete Authentication & Session Journey', () => {
  test('Admin performs complete login, session verification, and logout workflow', async ({ page }) => {
    const monitor = setupErrorMonitor(page);

    // 1. Open login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/Urban Predictive Intelligence|Civic/i);
    await expect(page.locator('form')).toBeVisible();

    // 2. Login as Admin
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill(ADMIN_CREDENTIALS.email);
    await passwordInput.fill(ADMIN_CREDENTIALS.password);
    await submitBtn.click();

    // 3. Verify successful authentication & redirect to /dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.stitch-page-title, .header-page-title, h1').first()).toBeVisible();

    // 4. Verify Admin sidebar navigation renders
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /Dashboard/i })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /Predictions/i })).toBeVisible();

    // 5. Verify session persistence on page reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('.stitch-page-title, .header-page-title, h1').first()).toBeVisible();

    // 6. Navigate to /profile and perform logout
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/profile/);

    const logoutBtn = page.locator('.btn-profile-logout, [aria-label*="Sign out"]').first();
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // 7. Verify redirect to /login
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page.locator('form')).toBeVisible();

    // 8. Verify unauthenticated access to /dashboard is blocked
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);

    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });

  test('Admin login fails gracefully with invalid password', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill(ADMIN_CREDENTIALS.email);
    await passwordInput.fill('IncorrectPassword999!');
    await submitBtn.click();

    // Verify error message appears and page stays on login
    await expect(page.getByText(/AUTHENTICATION FAILED/i).first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('Admin login requires non-empty credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Verify validation prevents navigation away from /login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('form')).toBeVisible();
  });
});
