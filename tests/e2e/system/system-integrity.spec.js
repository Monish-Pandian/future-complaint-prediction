import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('System Data Integrity, Responsive Health & Console Monitoring', () => {
  test('Closed-loop pages render cleanly without horizontal overflow across Desktop, Tablet, and Mobile viewports', async ({ adminPage }) => {
    const { page, monitor } = adminPage;

    const testPages = [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Predictions', path: '/predictions' },
      { name: 'Assignments', path: '/assignments' },
      { name: 'Evaluations', path: '/evaluations' },
    ];

    const viewports = [
      { name: 'Desktop', width: 1280, height: 800 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 },
    ];

    for (const p of testPages) {
      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(p.path);
        await page.waitForLoadState('networkidle');

        // Check primary title is visible
        const header = page.locator('.stitch-page-title, h1').first();
        await expect(header).toBeVisible();

        // Check no horizontal scroll overflow
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth, `Overflow on ${p.name} at ${vp.name}`).toBeLessThanOrEqual(clientWidth + 2);
      }
    }

    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });

  test('Complete Admin-to-Officer closed-loop navigation exhibits zero fatal network 500 errors or unhandled exceptions', async ({ adminPage }) => {
    const { page, monitor } = adminPage;

    const fullLoopRoutes = [
      '/dashboard',
      '/predictions',
      '/risk-map',
      '/assignments',
      '/verification',
      '/evaluations',
      '/officers',
      '/analytics',
      '/profile',
    ];

    for (const route of fullLoopRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('.stitch-page-title, h1, .header-page-title').first()).toBeVisible();
    }

    // Assert zero 500 errors occurred
    expect(monitor.getNetworkErrors()).toHaveLength(0);
    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });
});
