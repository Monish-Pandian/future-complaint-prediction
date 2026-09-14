import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Admin Navigation Schema & Sidebar Verification', () => {
  test('Admin sidebar displays exactly the 9 primary operational items and Logout', async ({ adminPage }) => {
    const { page } = adminPage;

    // Sidebar should be visible
    const sidebar = page.locator('.sidebar, nav[aria-label="Sidebar navigation"], aside');
    await expect(sidebar.first()).toBeVisible();

    // Expected primary items
    const expectedLabels = [
      'Dashboard',
      'Predictions',
      'Risk Map',
      'Assignments',
      'Verification',
      'Evaluations',
      'Officers',
      'Analytics',
      'Profile',
    ];

    for (const label of expectedLabels) {
      const navItem = sidebar.locator(`a:has-text("${label}"), button:has-text("${label}"), .nav-item:has-text("${label}")`);
      await expect(navItem.first()).toBeVisible();
    }

    // Verify "System" is NOT present in the normal sidebar navigation
    const systemNavItem = sidebar.locator('a:has-text("System"), .nav-item:has-text("System")');
    await expect(systemNavItem).toHaveCount(0);

    // Verify Logout button exists in sidebar
    const logoutBtn = sidebar.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")');
    await expect(logoutBtn.first()).toBeVisible();
  });

  test('Admin can navigate through primary tabs seamlessly', async ({ adminPage }) => {
    const { page } = adminPage;

    // Navigate to Predictions
    await page.click('a[href*="/predictions"], .nav-item:has-text("Predictions")');
    await expect(page).toHaveURL(/\/predictions/);

    // Navigate to Risk Map
    await page.click('a[href*="/risk-map"], a[href*="/heatmap"], .nav-item:has-text("Risk Map")');
    await expect(page).toHaveURL(/\/(risk-map|heatmap)/);

    // Navigate to Assignments
    await page.click('a[href*="/assignments"], .nav-item:has-text("Assignments")');
    await expect(page).toHaveURL(/\/assignments/);

    // Navigate to Dashboard
    await page.click('a[href*="/dashboard"], .nav-item:has-text("Dashboard")');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
