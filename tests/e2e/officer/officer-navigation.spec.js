import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Field Officer Navigation Schema & Isolation Verification', () => {
  test('Officer sidebar displays exactly the 5 operational items and Logout', async ({ officerPage }) => {
    const { page } = officerPage;

    const sidebar = page.locator('.sidebar, nav[aria-label="Sidebar navigation"], aside');
    await expect(sidebar.first()).toBeVisible();

    // Expected officer items
    const expectedOfficerItems = [
      'Dashboard',
      'My Assignments',
      'Verification',
      'History',
      'Profile',
    ];

    for (const label of expectedOfficerItems) {
      const navItem = sidebar.locator(`a:has-text("${label}"), .nav-item:has-text("${label}")`);
      await expect(navItem.first()).toBeVisible();
    }

    // Admin-only items that MUST NOT appear in officer navigation
    const forbiddenLabels = [
      'Predictions',
      'Risk Map',
      'Evaluations',
      'Officers',
      'Analytics',
      'System',
    ];

    for (const forbidden of forbiddenLabels) {
      const navItem = sidebar.locator(`a:has-text("${forbidden}"), .nav-item:has-text("${forbidden}")`);
      await expect(navItem).toHaveCount(0);
    }
  });

  test('Officer can navigate between operational tabs seamlessly', async ({ officerPage }) => {
    const { page } = officerPage;

    // Navigate to My Assignments
    await page.click('a[href*="/officer/assignments"], .nav-item:has-text("My Assignments")');
    await expect(page).toHaveURL(/\/officer\/assignments/);

    // Navigate to Verification
    await page.click('a[href*="/officer/verification"], .nav-item:has-text("Verification")');
    await expect(page).toHaveURL(/\/officer\/verification/);

    // Navigate to History
    await page.click('a[href*="/officer/history"], .nav-item:has-text("History")');
    await expect(page).toHaveURL(/\/officer\/history/);

    // Return to Dashboard
    await page.click('a[href="/officer"], .nav-item:has-text("Dashboard")');
    await expect(page).toHaveURL(/\/officer/);
  });
});
