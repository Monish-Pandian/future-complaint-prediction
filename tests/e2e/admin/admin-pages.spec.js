import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Admin Core Pages Smoke Tests', () => {
  const adminRoutes = [
    { path: '/dashboard', headingPattern: /Dashboard|Operations|Central Command/i },
    { path: '/predictions', headingPattern: /Predictions|Forecasting|Intelligence/i },
    { path: '/risk-map', headingPattern: /Risk Map|Heatmap|Spatial/i },
    { path: '/assignments', headingPattern: /Assignments|Dispatch/i },
    { path: '/verification', headingPattern: /Verification|Ground Truth|Field/i },
    { path: '/evaluations', headingPattern: /Evaluations|Model Governance|Performance/i },
    { path: '/officers', headingPattern: /Officers|Workforce|Personnel/i },
    { path: '/analytics', headingPattern: /Analytics|Intelligence|Trends/i },
    { path: '/profile', headingPattern: /Profile|Personnel|Administrator/i },
  ];

  for (const route of adminRoutes) {
    test(`Admin page ${route.path} loads cleanly without error`, async ({ adminPage }) => {
      const { page, monitor } = adminPage;

      await page.goto(route.path);
      await page.waitForLoadState('networkidle');

      // Verify URL
      await expect(page).toHaveURL(new RegExp(route.path.replace('/', '\\/')));

      // Check heading is visible
      const heading = page.locator('h1, h2, .stitch-page-title, .page-title').first();
      await expect(heading).toBeVisible({ timeout: 10000 });

      // Ensure no uncaught fatal network 500 errors occurred
      expect(monitor.getNetworkErrors()).toHaveLength(0);
    });
  }
});
