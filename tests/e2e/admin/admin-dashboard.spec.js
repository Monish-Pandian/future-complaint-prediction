import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Admin Dashboard E2E User Journey', () => {
  test('Admin Dashboard loads all telemetry, KPIs, and operational sections from real APIs', async ({ adminPage }) => {
    const { page, monitor } = adminPage;

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard/);

    // 1. Verify Page Title & Telemetry Header
    await expect(page.locator('.stitch-page-title, .header-page-title, h1').first()).toBeVisible();
    await expect(page.getByText(/Predictive Urban Governance|Predictive Operations Dashboard/i).first()).toBeVisible();

    // 2. Verify Model & Cutoff Telemetry in header
    await expect(page.getByText(/xgb-test-v1/i).first()).toBeVisible();
    await expect(page.getByText(/SYSTEM OPERATIONAL/i).first()).toBeVisible();

    // 3. Verify Top KPI Metric Cards exist and have values
    const kpiGrid = page.locator('.dashboard-kpi-grid');
    await expect(kpiGrid).toBeVisible();
    await expect(kpiGrid.getByText(/Total Predictions/i)).toBeVisible();
    await expect(kpiGrid.getByText(/High Risk/i)).toBeVisible();
    await expect(kpiGrid.getByText(/Pending Verification/i)).toBeVisible();
    await expect(kpiGrid.getByText(/Active Assignments/i)).toBeVisible();

    // 4. Verify Prediction Cycle Summary, Risk Distribution, and Operational Sections
    await expect(page.getByText(/PREDICTION CYCLE/i).first()).toBeVisible();
    await expect(page.getByText(/Prediction Risk Distribution|RISK DISTRIBUTION/i).first()).toBeVisible();
    await expect(page.getByText(/Prediction-to-Action Pipeline|OPERATIONAL PIPELINE/i).first()).toBeVisible();

    // 5. Verify Top Risk Community Areas section
    await expect(page.getByText(/TOP RISK COMMUNITY AREAS|Top Risk Areas/i).first()).toBeVisible();

    // 6. Verify Model Health & Governance section
    await expect(page.getByText(/Active AI Forecasting Engine|MODEL HEALTH/i).first()).toBeVisible();

    // Verify no critical network/server errors
    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });

  test('Admin can click KPI cards on Dashboard to navigate to detailed workspaces', async ({ adminPage }) => {
    const { page } = adminPage;

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Click Total Predictions card -> navigates to /predictions
    const totalPredsCard = page.locator('.dashboard-kpi-grid .kpi-card-clickable').filter({ hasText: /Total Predictions/i });
    await totalPredsCard.click();
    await page.waitForURL(/\/predictions/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/predictions/);

    // Return to dashboard and click High Risk card -> navigates to /risk-map
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const highRiskCard = page.locator('.dashboard-kpi-grid .kpi-card-clickable').filter({ hasText: /High Risk/i });
    await highRiskCard.click();
    await page.waitForURL(/\/risk-map/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/risk-map/);

    // Return to dashboard and click Pending Verification card -> navigates to /verification
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const verifCard = page.locator('.dashboard-kpi-grid .kpi-card-clickable').filter({ hasText: /Pending Verification/i });
    await verifCard.click();
    await page.waitForURL(/\/verification/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/verification/);
  });
});
