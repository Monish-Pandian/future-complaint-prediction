import { test, expect } from '@playwright/test';
import { setupErrorMonitor, OFFICER_CREDENTIALS } from '../../helpers/test-utils.js';

test.describe('Field Officer Complete Authentication & Session Journey', () => {
  test('Officer performs complete login, session verification, reload persistence, and logout workflow', async ({ page }) => {
    const monitor = setupErrorMonitor(page);

    // 1. Open login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/Urban Predictive Intelligence|Civic/i);
    await expect(page.locator('form')).toBeVisible();

    // 2. Login with Officer credentials
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill(OFFICER_CREDENTIALS.email);
    await passwordInput.fill(OFFICER_CREDENTIALS.password);
    await submitBtn.click();

    // 3. Verify successful authentication & redirect to /officer
    await page.waitForURL(/\/officer/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // 4. Verify Officer identity is displayed
    const pageTitle = page.locator('.stitch-page-title, .header-page-title, h1').first();
    await expect(pageTitle).toBeVisible();
    await expect(pageTitle).toContainText(/Welcome back|Field|Officer/i);

    // 5. Verify Officer sidebar navigation is displayed
    const sidebar = page.locator('.sidebar, nav[aria-label="Sidebar navigation"], aside');
    await expect(sidebar.first()).toBeVisible();
    await expect(sidebar.locator('a[href="/officer"], .nav-item:has-text("Dashboard")').first()).toBeVisible();
    await expect(sidebar.locator('a[href*="/officer/assignments"], .nav-item:has-text("My Assignments")').first()).toBeVisible();

    // 6. Reload page & verify session persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/officer/);
    await expect(pageTitle).toBeVisible();

    // 7. Navigate to Officer Profile and perform logout
    await page.goto('/officer/profile');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/officer\/profile/);

    const logoutBtn = page.locator('.btn-profile-logout, [aria-label*="Sign out"]').first();
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // 8. Verify redirect to /login
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page.locator('form')).toBeVisible();

    // 9. Verify unauthenticated access to /officer is blocked and redirected to /login
    await page.goto('/officer');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);

    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });

  test('Officer login fails gracefully with invalid password', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill(OFFICER_CREDENTIALS.email);
    await passwordInput.fill('InvalidOfficerPass999!');
    await submitBtn.click();

    // Verify error feedback appears and user remains unauthenticated
    await expect(page.getByText(/AUTHENTICATION FAILED/i).first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('Officer login handles empty and partial submissions correctly', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    // 1. Completely empty submission
    await submitBtn.click();
    await expect(page).toHaveURL(/\/login/);

    // 2. Email only
    await emailInput.fill(OFFICER_CREDENTIALS.email);
    await passwordInput.fill('');
    await submitBtn.click();
    await expect(page).toHaveURL(/\/login/);

    // 3. Password only
    await emailInput.fill('');
    await passwordInput.fill(OFFICER_CREDENTIALS.password);
    await submitBtn.click();
    await expect(page).toHaveURL(/\/login/);
  });
});
