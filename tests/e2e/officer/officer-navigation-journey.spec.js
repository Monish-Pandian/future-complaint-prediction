import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Field Officer Navigation & Browser Session Journey', () => {
  test('Officer sidebar contains exclusively 4 operational tabs and maintains isolation from Admin navigation', async ({ officerPage }) => {
    const { page } = officerPage;

    const sidebar = page.locator('.sidebar, nav[aria-label="Sidebar navigation"], aside').first();
    await expect(sidebar).toBeVisible();

    // 1. Expected Officer navigation items (Verification performed within My Assignments)
    const expectedOfficerItems = [
      { label: 'Dashboard', path: '/officer' },
      { label: 'My Assignments', path: '/officer/assignments' },
      { label: 'History', path: '/officer/history' },
      { label: 'Profile', path: '/officer/profile' },
    ];

    for (const item of expectedOfficerItems) {
      const link = sidebar.locator(`a[href*="${item.path}"], .nav-item:has-text("${item.label}")`).first();
      await expect(link).toBeVisible();
    }

    // 2. Prohibited Admin items and standalone Verification must NOT be visible in officer sidebar
    const prohibitedAdminItems = [
      'Verification',
      'Predictions',
      'Risk Map',
      'Evaluations',
      'Officers',
      'Analytics',
      'System',
    ];

    for (const adminLabel of prohibitedAdminItems) {
      const prohibitedEl = sidebar.locator(`a:has-text("${adminLabel}"), .nav-item:has-text("${adminLabel}")`);
      await expect(prohibitedEl).toHaveCount(0);
    }
  });

  test('Officer can navigate through all operational workspaces and browser history maintains valid state', async ({ officerPage }) => {
    const { page } = officerPage;

    // 1. Dashboard -> My Assignments
    await page.click('a[href*="/officer/assignments"], .nav-item:has-text("My Assignments")');
    await expect(page).toHaveURL(/\/officer\/assignments/);
    await expect(page.locator('h1').first()).toBeVisible();

    // 2. My Assignments -> History
    await page.click('a[href*="/officer/history"], .nav-item:has-text("History")');
    await expect(page).toHaveURL(/\/officer\/history/);
    await expect(page.locator('h1').first()).toBeVisible();

    // 3. History -> Profile
    await page.click('a[href*="/officer/profile"], .nav-item:has-text("Profile")');
    await expect(page).toHaveURL(/\/officer\/profile/);
    await expect(page.locator('.stitch-page-title, h1').first()).toBeVisible();

    // 5. Test Browser Back button (Profile -> History)
    await page.goBack();
    await expect(page).toHaveURL(/\/officer\/history/);
    await expect(page.locator('h1').first()).toBeVisible();

    // 6. Test Browser Forward button (History -> Profile)
    await page.goForward();
    await expect(page).toHaveURL(/\/officer\/profile/);
    await expect(page.locator('.stitch-page-title, h1').first()).toBeVisible();

    // 7. Direct URL Navigation & Authenticated Refresh
    await page.goto('/officer/assignments');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/officer\/assignments/);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/officer\/assignments/);
    await expect(page.locator('h1').first()).toBeVisible();
  });
});
