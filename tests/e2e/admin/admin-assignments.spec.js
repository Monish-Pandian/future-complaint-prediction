import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Admin Assignment Operations E2E User Journey', () => {
  test('Admin can view AI dispatch operations, inspect algorithmic justifications ("Why This Officer?"), and monitor capacity', async ({ adminPage }) => {
    const { page, monitor } = adminPage;

    // 1. Navigate to Assignments
    await page.goto('/assignments');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/assignments/);

    // 2. Verify Page Header & Command Bar
    await expect(page.locator('.stitch-page-title, .header-page-title, h1').first()).toBeVisible();
    await expect(page.getByText(/Assignment Operations/i).first()).toBeVisible();

    // 3. Verify Top KPI Summary Cards & Ensure No Tutorial Strategy Card Exists
    await expect(page.locator('.assignments-kpis-grid, .asgn-summary-grid, .asgn-kpi-card, .kpi-card-inner').first()).toBeVisible();
    await expect(page.locator('.dispatch-strategy-card')).not.toBeVisible();

    // 4. Verify Officer Capacity Panel and Status Chart
    await expect(page.getByText(/OFFICER CAPACITY/i).first()).toBeVisible();

    // 5. Verify Assignment Table renders real records
    const table = page.locator('table.assignments-table, table.table').first();
    await expect(table).toBeVisible();

    const inspectBtns = page.locator('.btn-asgn-inspect, button:has-text("Inspect")');
    const inspectCount = await inspectBtns.count();

    if (inspectCount > 0) {
      // 6. Click Inspect on the first assignment record
      await inspectBtns.first().click();

      // 7. Verify Assignment Detail Drawer opens
      const drawer = page.locator('.asgn-drawer-panel');
      await expect(drawer).toBeVisible({ timeout: 5000 });

      // 8. Verify Prediction Intelligence Section
      await expect(drawer.getByText(/1\. Prediction Intelligence/i)).toBeVisible();

      // 9. Verify "Why This Officer?" Algorithmic Justification Section
      await expect(drawer.getByText(/2\. Why This Officer\?/i)).toBeVisible();
      await expect(drawer.getByText(/Risk Priority \(40%\)/i)).toBeVisible();
      await expect(drawer.getByText(/Distance \(30%\)/i)).toBeVisible();
      await expect(drawer.getByText(/Workload \(30%\)/i)).toBeVisible();
      await expect(drawer.getByText(/Dept Compatibility/i)).toBeVisible();
      await expect(drawer.getByText(/Algorithmic Justification:/i)).toBeVisible();

      // 10. Verify Assigned Officer Context Section
      await expect(drawer.getByText(/3\. Assigned Officer Context/i)).toBeVisible();

      // 11. Test Close Drawer via Close Button
      const closeBtn = drawer.locator('.asgn-drawer-close, [aria-label="Close detail drawer"]');
      await closeBtn.click();
      await expect(drawer).not.toBeVisible({ timeout: 5000 });

      // 12. Test Close Drawer via Escape Key
      await inspectBtns.first().click();
      await expect(drawer).toBeVisible({ timeout: 5000 });
      await page.keyboard.press('Escape');
      await expect(drawer).not.toBeVisible({ timeout: 5000 });
    }

    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });
});
