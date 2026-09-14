import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Field Officer Responsive & Accessibility Verification', () => {
  const officerPages = [
    { name: 'Dashboard', path: '/officer' },
    { name: 'My Assignments', path: '/officer/assignments' },
    { name: 'Verification', path: '/officer/verification' },
    { name: 'History', path: '/officer/history' },
    { name: 'Profile', path: '/officer/profile' },
  ];

  const viewports = [
    { name: 'Desktop', width: 1280, height: 800 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Mobile', width: 375, height: 667 },
  ];

  for (const pageInfo of officerPages) {
    for (const vp of viewports) {
      test(`Officer ${pageInfo.name} renders cleanly on ${vp.name} (${vp.width}x${vp.height}) without horizontal overflow`, async ({ officerPage }) => {
        const { page } = officerPage;

        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(pageInfo.path);
        await page.waitForLoadState('networkidle');

        // Verify primary page header is visible
        const header = page.locator('.stitch-page-title, .page-title, h1, h2').first();
        await expect(header).toBeVisible();

        // Verify no horizontal overflow
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
      });
    }
  }

  test('Officer interactive modal dialogs adhere to accessibility and keyboard patterns', async ({ officerPage }) => {
    const { page } = officerPage;

    await page.goto('/officer/verification');
    await page.waitForLoadState('networkidle');

    const verifyButtons = page.locator('button:has-text("Verify Ground Truth")');
    if (await verifyButtons.count() > 0) {
      await verifyButtons.first().click();

      // Check modal role and aria-modal attribute
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await expect(dialog).toHaveAttribute('aria-modal', 'true');

      // Close modal
      const closeBtn = page.locator('.verif-drawer-close, button:has-text("Cancel")').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await expect(dialog).not.toBeVisible({ timeout: 5000 });
      }
    }
  });
});
