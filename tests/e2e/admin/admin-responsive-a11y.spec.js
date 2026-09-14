import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Admin Responsive & Accessibility Verification', () => {
  const adminPages = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Predictions', path: '/predictions' },
    { name: 'Risk Map', path: '/risk-map' },
    { name: 'Assignments', path: '/assignments' },
    { name: 'Verification', path: '/verification' },
    { name: 'Evaluations', path: '/evaluations' },
    { name: 'Officers', path: '/officers' },
    { name: 'Analytics', path: '/analytics' },
    { name: 'Profile', path: '/profile' },
  ];

  const viewports = [
    { name: 'Desktop', width: 1280, height: 800 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Mobile', width: 375, height: 667 },
  ];

  for (const pageInfo of adminPages.slice(0, 4)) {
    for (const vp of viewports) {
      test(`Admin ${pageInfo.name} renders cleanly on ${vp.name} (${vp.width}x${vp.height}) without horizontal overflow`, async ({ adminPage }) => {
        const { page } = adminPage;

        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(pageInfo.path);
        await page.waitForLoadState('networkidle');

        // Verify primary header is visible
        await expect(page.locator('.stitch-page-title, .header-page-title, h1').first()).toBeVisible();

        // Verify no horizontal overflow
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
      });
    }
  }

  test('Admin interactive dialogs and drawers follow standard accessibility patterns', async ({ adminPage }) => {
    const { page } = adminPage;

    await page.goto('/predictions');
    await page.waitForLoadState('networkidle');

    const firstRow = page.locator('tbody tr.prediction-row-interactive').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();

      const drawer = page.locator('[role="dialog"]');
      await expect(drawer).toBeVisible({ timeout: 5000 });
      await expect(drawer).toHaveAttribute('aria-modal', 'true');

      // Test Escape key closes dialog
      await page.keyboard.press('Escape');
      await expect(drawer).not.toBeVisible({ timeout: 5000 });
    }
  });
});
