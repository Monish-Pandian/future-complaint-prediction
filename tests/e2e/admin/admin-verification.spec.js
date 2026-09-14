import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Admin Verification Operations E2E User Journey', () => {
  test('Admin can monitor verification candidate pipeline, inspect ground truth outcomes, and verify before/after comparisons', async ({ adminPage }) => {
    const { page, monitor } = adminPage;

    // 1. Navigate to Verification
    await page.goto('/verification');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/verification/);

    // 2. Verify Page Header & Telemetry
    await expect(page.locator('.verification-header-wrapper, h1').first()).toBeVisible();
    await expect(page.getByText(/VERIFICATION OPERATIONS/i).first()).toBeVisible();
    await expect(page.getByText(/xgb-test-v1/i).first()).toBeVisible();

    // 3. Verify Verification Summary KPI Cards
    await expect(page.locator('.verification-kpis-grid, .verif-summary-grid, .metric-card').first()).toBeVisible();

    // 4. Verify Interactive Verification Pipeline Stages
    const pipeline = page.locator('.verification-pipeline-card, .verif-pipeline-grid, [aria-label*="Verification Workflow Stages"]');
    await expect(pipeline.first()).toBeVisible();

    // 5. Verify Verification Records Table
    const table = page.locator('table.verification-table, table.verif-table, table.table').first();
    await expect(table).toBeVisible();

    // 6. Test Pipeline Stage Click Filter
    const stageItems = page.locator('.verif-pipeline-stage-btn, .pipeline-step');
    if (await stageItems.count() > 1) {
      await stageItems.nth(1).click();
      await page.waitForLoadState('networkidle');
    }

    // 7. Test Verification Detail Drawer
    const inspectBtns = page.locator('.btn-verif-inspect, button:has-text("Inspect")');
    if (await inspectBtns.count() > 0) {
      await inspectBtns.first().click();

      const drawer = page.locator('.verif-drawer-panel, [role="dialog"]');
      await expect(drawer).toBeVisible({ timeout: 5000 });

      // Verify Before / After Comparison Section
      await expect(drawer.getByText(/Prediction vs Field Ground Truth/i)).toBeVisible();
      await expect(drawer.getByText(/AI PREDICTION/i)).toBeVisible();
      await expect(drawer.getByText(/FIELD OUTCOME/i)).toBeVisible();

      // Test Close Drawer via Close Button
      const closeBtn = drawer.locator('.verif-drawer-close, [aria-label*="Close"]');
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
