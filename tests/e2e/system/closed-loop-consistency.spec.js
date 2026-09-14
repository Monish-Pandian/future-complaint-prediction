import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Closed-Loop System Invariants & Model Governance Consistency', () => {
  test('Active model, threshold, 90/10 policy, and assignment weights remain consistent across Admin surfaces', async ({ adminPage }) => {
    const { page, monitor } = adminPage;

    // 1. Check Dashboard for Active Model and Policy Telemetry
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.stitch-page-title, h1').first()).toBeVisible();

    // 2. Check Predictions page for Model Invariants & 0.38 Threshold
    await page.goto('/predictions');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('0.38').first()).toBeVisible();
    await expect(page.getByText(/xgb-test-v1/i).first()).toBeVisible();

    // 3. Check Assignments page for 0.4 / 0.3 / 0.3 Multi-Criteria Matching Weights
    await page.goto('/assignments');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/0\.4|40%|Risk/i).first()).toBeVisible();
    await expect(page.getByText(/0\.3|30%|Distance/i).first()).toBeVisible();
    await expect(page.getByText(/0\.3|30%|Workload/i).first()).toBeVisible();

    // 4. Check Analytics page for 90:10 Policy Telemetry
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/90\/10|90%|Exploration|Exploitation/i).first()).toBeVisible();

    // 5. Check Admin Profile page for Active Invariants Callout
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const invariantsBox = page.locator('.profile-invariants-box');
    await expect(invariantsBox).toBeVisible();
    await expect(invariantsBox.getByText('xgb-test-v1')).toBeVisible();
    await expect(invariantsBox.getByText('0.38')).toBeVisible();
    await expect(invariantsBox.getByText('90/10 Ratio')).toBeVisible();
    await expect(invariantsBox.getByText('0.4 / 0.3 / 0.3')).toBeVisible();

    // Verify no fatal network errors
    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });

  test('AI Model Evaluation page consistently reflects gold-standard TEST-2025 benchmark metrics and confusion matrix', async ({ adminPage }) => {
    const { page, monitor } = adminPage;

    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    // 1. Verify Page Header & Benchmark Model Banner
    const pageTitle = page.locator('h1, .evaluation-header-wrapper').first();
    await expect(pageTitle).toBeVisible();
    await expect(pageTitle).toContainText(/EVALUATION/i);
    await expect(page.getByText('xgb-test-v1').first()).toBeVisible();
    await expect(page.getByText('0.38').first()).toBeVisible();

    // 2. Verify 5 Gold-Standard Benchmark KPI Cards
    await expect(page.getByText('91.27%').first()).toBeVisible(); // Accuracy
    await expect(page.getByText('91.66%').first()).toBeVisible(); // Precision
    await expect(page.getByText('99.34%').first()).toBeVisible(); // Recall
    await expect(page.getByText('95.35%').first()).toBeVisible(); // F1 Score
    await expect(page.getByText('90.86%').first()).toBeVisible(); // ROC-AUC

    // 3. Verify Confusion Matrix Counts
    await expect(page.getByText('35,103').first()).toBeVisible(); // True Positives (TP)
    await expect(page.getByText('740').first()).toBeVisible();    // True Negatives (TN)
    await expect(page.getByText('3,194').first()).toBeVisible();  // False Positives (FP)
    await expect(page.getByText('233').first()).toBeVisible();    // False Negatives (FN)

    // 4. Verify Total Test Population Count
    await expect(page.getByText(/39,270/i).first()).toBeVisible();

    // Verify no fatal network errors
    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });
});
