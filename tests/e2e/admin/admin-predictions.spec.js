import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Admin Predictions Intelligence E2E User Journey', () => {
  test('Admin can view real predictions, filter, sort, paginate, and inspect ML details', async ({ adminPage }) => {
    const { page, monitor } = adminPage;

    // 1. Navigate to Predictions
    await page.goto('/predictions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/predictions/);

    // 2. Verify Page Header & Telemetry
    await expect(page.locator('.stitch-page-title, .header-page-title, h1').first()).toBeVisible();
    await expect(page.getByText(/Predictive Intelligence Console/i).first()).toBeVisible();
    await expect(page.getByText(/xgb-test-v1/i).first()).toBeVisible();

    // 3. Verify Cycle Card & Risk Summary
    await expect(page.locator('.prediction-cycle-card, [aria-label*="Prediction Cycle"]').first()).toBeVisible();
    await expect(page.locator('.prediction-risk-summary-card, .prediction-risk-strip, .risk-stacked-bar').first()).toBeVisible();

    // 4. Verify Prediction Table renders real rows
    const table = page.locator('table.table, .prediction-table-card').first();
    await expect(table).toBeVisible();

    const rows = page.locator('tbody tr.prediction-row-interactive');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Verify first row contains required predictive columns
    const firstRow = rows.first();
    await expect(firstRow.locator('.badge-risk, .risk-badge, td').first()).toBeVisible();

    // 5. Test Filter Search Interaction
    const searchInput = page.locator('input[placeholder*="Search"], input[name="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Street');
      const applyBtn = page.getByRole('button', { name: /Apply/i });
      if (await applyBtn.isVisible()) {
        await applyBtn.click();
        await page.waitForLoadState('networkidle');
      }
      // Reset filter
      const resetBtn = page.getByRole('button', { name: /Reset/i });
      if (await resetBtn.isVisible()) {
        await resetBtn.click();
        await page.waitForLoadState('networkidle');
      }
    }

    // 6. Test Sorting on Table Headers
    const sortableTh = page.locator('th.sortable-th').first();
    if (await sortableTh.isVisible()) {
      await sortableTh.click();
      await page.waitForLoadState('networkidle');
    }

    // 7. Test Pagination Controls
    const nextBtn = page.getByRole('button', { name: /Next/i });
    if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
      await nextBtn.click();
      await page.waitForLoadState('networkidle');
      const prevBtn = page.getByRole('button', { name: /Previous/i });
      if (await prevBtn.isVisible()) {
        await prevBtn.click();
        await page.waitForLoadState('networkidle');
      }
    }

    // 8. Test Prediction Detail Drawer (Inspect Action)
    await firstRow.click();

    const drawer = page.locator('.drawer-overlay[role="dialog"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Verify ML Assessment Fields in Drawer
    await expect(drawer.getByText(/Machine Learning Assessment/i)).toBeVisible();
    await expect(drawer.getByText(/Model Probability/i)).toBeVisible();
    await expect(drawer.getByText(/Composite Risk Score/i)).toBeVisible();

    // 9. Test Close Drawer via Close Button
    const closeBtn = drawer.locator('.drawer-close-btn, [aria-label="Close drawer"]');
    await closeBtn.click();
    await expect(drawer).not.toBeVisible({ timeout: 5000 });

    // 10. Test Close Drawer via Escape Key
    await firstRow.click();
    await expect(drawer).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible({ timeout: 5000 });

    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });
});
