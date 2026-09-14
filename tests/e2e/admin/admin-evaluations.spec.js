import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Admin AI Evaluation & Governance E2E User Journey', () => {
  test('Admin can audit model benchmark metrics, confusion matrix, and operational field evaluations', async ({ adminPage }) => {
    const { page, monitor } = adminPage;

    // 1. Navigate to Evaluations
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/evaluations/);

    // 2. Verify Page Header & Governance Telemetry
    await expect(page.locator('.eval-header-wrapper, h1').first()).toBeVisible();
    await expect(page.getByText(/AI MODEL EVALUATION/i).first()).toBeVisible();
    await expect(page.getByText(/xgb-test-v1/i).first()).toBeVisible();

    // 3. Verify Section A: Model Test Performance Benchmarks
    await expect(page.getByText(/MODEL TEST PERFORMANCE/i).first()).toBeVisible();
    await expect(page.getByText(/TEST-2025 GOLD STANDARD/i).first()).toBeVisible();

    // Verify 5 Authoritative Benchmark Metrics
    const metricsGrid = page.locator('.evaluation-kpis-grid, .evaluation-test-metrics-section');
    await expect(metricsGrid.locator('.metric-card-label').filter({ hasText: /^ACCURACY$/i })).toBeVisible();
    await expect(metricsGrid.getByText(/91\.27%/i)).toBeVisible();

    await expect(metricsGrid.locator('.metric-card-label').filter({ hasText: /^PRECISION$/i })).toBeVisible();
    await expect(metricsGrid.getByText(/91\.66%/i)).toBeVisible();

    await expect(metricsGrid.locator('.metric-card-label').filter({ hasText: /^RECALL$/i })).toBeVisible();
    await expect(metricsGrid.getByText(/99\.34%/i)).toBeVisible();

    await expect(metricsGrid.locator('.metric-card-label').filter({ hasText: /^F1 SCORE$/i })).toBeVisible();
    await expect(metricsGrid.getByText(/95\.35%/i)).toBeVisible();

    await expect(metricsGrid.locator('.metric-card-label').filter({ hasText: /^ROC-AUC$/i })).toBeVisible();
    await expect(metricsGrid.getByText(/90\.86%/i)).toBeVisible();

    // 4. Verify Confusion Matrix Card
    await expect(page.getByText(/CONFUSION MATRIX/i).first()).toBeVisible();

    // 5. Verify Closed-Loop Feedback Flow & Field Evaluation Distinction
    await expect(page.getByText(/Closed-Loop AI Governance Architecture|CLOSED-LOOP/i).first()).toBeVisible();

    // 6. Verify Evaluation Records Table
    const table = page.locator('table.evaluation-table, .evaluation-table-card, table.table').first();
    await expect(table).toBeVisible();

    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });
});
