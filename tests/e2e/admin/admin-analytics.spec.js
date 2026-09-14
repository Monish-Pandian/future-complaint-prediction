import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Admin Civic Operations Analytics E2E User Journey', () => {
  test('Admin can analyze civic trends, operational throughput, and 90/10 policy telemetry', async ({ adminPage }) => {
    const { page, monitor } = adminPage;

    // 1. Navigate to Analytics
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/analytics/);

    // 2. Verify Page Header & Command Bar
    await expect(page.locator('.stitch-page-title, .header-page-title, h1').first()).toBeVisible();
    await expect(page.getByText(/Civic Operations Analytics/i).first()).toBeVisible();
    await expect(page.getByText(/xgb-test-v1/i).first()).toBeVisible();

    // 3. Verify Analytics KPI Summary Row
    await expect(page.locator('.analytics-kpis-grid, .analytics-kpi-card, .metric-card').first()).toBeVisible();

    // 4. Verify Operational Funnel & Risk Distribution Cards
    await expect(page.getByText(/Operational Workflow Progression|CLOSED-LOOP GOVERNANCE/i).first()).toBeVisible();
    await expect(page.getByText(/Forecasted Risk Distribution|RISK STRATIFICATION/i).first()).toBeVisible();

    // 5. Verify Complaint Type & Spatial Hotspot Cards
    await expect(page.getByText(/Complaint Type Analysis|SR CATEGORY PATTERNS/i).first()).toBeVisible();

    // 6. Verify 90/10 Exploration Strategy Card
    await expect(page.getByText(/Operational Selection Strategy|DUAL-MODE CAPACITY ALLOCATION/i).first()).toBeVisible();
    await expect(page.getByText(/90% EXPLOITATION/i).first()).toBeVisible();
    await expect(page.getByText(/10% EXPLORATION/i).first()).toBeVisible();

    // 7. Verify Model Health Summary Card
    await expect(page.getByText(/AI Engine Performance Summary|MODEL GOVERNANCE/i).first()).toBeVisible();

    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });
});
