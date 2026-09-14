import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Field Officer Core Pages Smoke Tests', () => {
  const officerRoutes = [
    { path: '/officer', headingPattern: /Welcome|Dashboard|Operations|Field/i },
    { path: '/officer/assignments', headingPattern: /Assignments|Tasks|Queue/i },
    { path: '/officer/verification', headingPattern: /Verification|Tasks|Field/i },
    { path: '/officer/history', headingPattern: /History|Operational|Completed/i },
    { path: '/officer/profile', headingPattern: /Profile|Field Officer|Inspector/i },
  ];

  for (const route of officerRoutes) {
    test(`Officer page ${route.path} loads cleanly with role context`, async ({ officerPage }) => {
      const { page, monitor } = officerPage;

      await page.goto(route.path);
      await page.waitForLoadState('networkidle');

      // Verify URL
      await expect(page).toHaveURL(new RegExp(route.path.replace('/', '\\/')));

      // Check heading is visible
      const heading = page.locator('h1, h2, .stitch-page-title, .page-title').first();
      await expect(heading).toBeVisible({ timeout: 10000 });

      // Verify no fatal network errors
      expect(monitor.getNetworkErrors()).toHaveLength(0);
    });
  }
});
