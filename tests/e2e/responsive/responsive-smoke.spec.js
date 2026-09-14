import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Responsive Layout & Touch Target Smoke Tests', () => {
  const viewports = [
    { name: 'Desktop', width: 1280, height: 800 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Mobile', width: 375, height: 667 },
  ];

  for (const vp of viewports) {
    test.describe(`${vp.name} Viewport (${vp.width}x${vp.height})`, () => {
      test(`Admin Dashboard renders cleanly without horizontal overflow`, async ({ adminPage }) => {
        const { page } = adminPage;
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('.stitch-page-title, .header-page-title, h1').first()).toBeVisible();

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
      });

      test(`Admin Predictions renders cleanly without horizontal overflow`, async ({ adminPage }) => {
        const { page } = adminPage;
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('/predictions');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('.stitch-page-title, .header-page-title, h1').first()).toBeVisible();

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
      });

      test(`Admin Assignments renders cleanly without horizontal overflow`, async ({ adminPage }) => {
        const { page } = adminPage;
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('/assignments');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('.stitch-page-title, .header-page-title, h1').first()).toBeVisible();

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
      });

      test(`Admin Verification renders cleanly without horizontal overflow`, async ({ adminPage }) => {
        const { page } = adminPage;
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('/verification');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('.stitch-page-title, .header-page-title, h1').first()).toBeVisible();

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
      });

      test(`Officer Dashboard renders cleanly without horizontal overflow`, async ({ officerPage }) => {
        const { page } = officerPage;
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('/officer');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('.stitch-page-title, .header-page-title, h1').first()).toBeVisible();

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
      });
    });
  }
});
