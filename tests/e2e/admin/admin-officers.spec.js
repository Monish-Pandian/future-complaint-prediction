import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Admin Field Officers Operations E2E User Journey', () => {
  test('Admin can view workforce roster, search officers, inspect capacity and workload details', async ({ adminPage }) => {
    const { page, monitor } = adminPage;

    // 1. Navigate to Officers
    await page.goto('/officers');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/officers/);

    // 2. Verify Page Header & Telemetry
    await expect(page.locator('.stitch-page-title, .header-page-title, h1').first()).toBeVisible();
    await expect(page.getByText(/Field Officer Operations|FIELD FLEET DISPATCH/i).first()).toBeVisible();

    // 3. Verify Officer Summary KPIs & Capacity Panel
    await expect(page.locator('.officers-kpis-grid, .officers-summary-grid, .officer-kpi-card, .metric-card').first()).toBeVisible();
    await expect(page.getByText(/WORKFORCE CAPACITY/i).first()).toBeVisible();

    // 4. Verify Officers Table renders real data
    const table = page.locator('table.officers-table, table.table');
    await expect(table).toBeVisible();

    // 5. Test Officer Search
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Officer');
      await page.waitForLoadState('networkidle');
      await searchInput.fill('');
      await page.waitForLoadState('networkidle');
    }

    // 6. Test Officer Detail Drawer (Inspect Action)
    const inspectBtns = page.locator('.btn-officer-inspect, button:has-text("Inspect")');
    if (await inspectBtns.count() > 0) {
      await inspectBtns.first().click();

      const drawer = page.locator('.officer-drawer-backdrop[role="dialog"]');
      await expect(drawer).toBeVisible({ timeout: 5000 });

      // Verify officer context fields
      await expect(drawer.getByText(/FIELD WORKFORCE INTELLIGENCE|Operational Overview/i).first()).toBeVisible();

      // Ensure no raw passwords or sensitive credentials exist in drawer
      await expect(drawer.getByText(/password/i)).not.toBeVisible();

      // Test Close Drawer via Close Button
      const closeBtn = drawer.locator('.drawer-close-btn, [aria-label*="Close"]');
      await closeBtn.click();
      await expect(drawer).not.toBeVisible({ timeout: 5000 });

      // Test Close Drawer via Escape Key
      await inspectBtns.first().click();
      await expect(drawer).toBeVisible({ timeout: 5000 });
      await page.keyboard.press('Escape');
      await expect(drawer).not.toBeVisible({ timeout: 5000 });
    }

    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });
});
