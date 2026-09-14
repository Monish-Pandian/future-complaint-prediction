import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Admin Complete Navigation & Browser History Journey', () => {
  test('Admin can navigate through the entire 9-module operational lifecycle via sidebar', async ({ adminPage }) => {
    const { page, monitor } = adminPage;
    const sidebar = page.locator('.sidebar');

    const operationalSteps = [
      { name: 'Dashboard', path: /\/dashboard/ },
      { name: 'Predictions', path: /\/predictions/ },
      { name: 'Risk Map', path: /\/risk-map/ },
      { name: 'Assignments', path: /\/assignments/ },
      { name: 'Verification', path: /\/verification/ },
      { name: 'Evaluations', path: /\/evaluations/ },
      { name: 'Officers', path: /\/officers/ },
      { name: 'Analytics', path: /\/analytics/ },
      { name: 'Profile', path: /\/profile/ },
    ];

    for (const step of operationalSteps) {
      const navLink = sidebar.getByRole('link', { name: new RegExp(step.name, 'i') });
      await expect(navLink).toBeVisible();
      await navLink.click();
      await page.waitForURL(step.path, { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(step.path);
      await expect(page.locator('.stitch-page-title, .header-page-title, h1').first()).toBeVisible();
    }

    // Verify "System" is strictly NOT in the sidebar navigation
    const systemLink = sidebar.getByRole('link', { name: /^system$/i });
    await expect(systemLink).not.toBeVisible();

    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });

  test('Admin browser back and forward buttons maintain valid state and authentication', async ({ adminPage }) => {
    const { page } = adminPage;

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.goto('/predictions');
    await page.waitForLoadState('networkidle');

    await page.goto('/assignments');
    await page.waitForLoadState('networkidle');

    // Go back to Predictions
    await page.goBack();
    await page.waitForURL(/\/predictions/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/predictions/);

    // Go back to Dashboard
    await page.goBack();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard/);

    // Go forward to Predictions
    await page.goForward();
    await page.waitForURL(/\/predictions/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/predictions/);

    // Go forward to Assignments
    await page.goForward();
    await page.waitForURL(/\/assignments/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/assignments/);
  });
});
