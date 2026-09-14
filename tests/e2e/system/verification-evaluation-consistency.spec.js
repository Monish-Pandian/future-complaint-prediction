import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Verification → Evaluation → Closed-Loop Feedback Consistency', () => {
  test('Verification outcome types strictly adhere to the canonical 5-state contract', async ({ officerPage }) => {
    const { page, monitor } = officerPage;

    await page.goto('/officer/verification');
    await page.waitForLoadState('networkidle');

    // Check status dropdown filter options
    const statusSelect = page.locator('select').first();
    await expect(statusSelect).toBeVisible();
    await expect(statusSelect.locator('option[value="ACTIVE"]')).toHaveCount(1);
    await expect(statusSelect.locator('option[value="COMPLETED"]')).toHaveCount(1);
    await expect(statusSelect.locator('option[value="ALL"]')).toHaveCount(1);

    // If verification button is present, verify standard outcome codes
    const verifyButtons = page.locator('button:has-text("Verify Ground Truth")');
    if ((await verifyButtons.count()) > 0) {
      await verifyButtons.first().click();

      const modal = page.locator('[role="dialog"], .officer-modal-backdrop');
      await expect(modal).toBeVisible();

      const outcomeSelect = modal.locator('select.officer-form-input').first();
      await expect(outcomeSelect).toBeVisible();

      const canonicalOutcomes = [
        'PROBLEM_CONFIRMED',
        'PROBLEM_NOT_FOUND',
        'DIFFERENT_PROBLEM',
        'DUPLICATE',
        'UNABLE_TO_VERIFY',
      ];

      for (const val of canonicalOutcomes) {
        await expect(outcomeSelect.locator(`option[value="${val}"]`)).toHaveCount(1);
      }

      // Close modal safely
      const closeBtn = modal.locator('button:has-text("Cancel"), .verif-drawer-close').first();
      await closeBtn.click();
      await expect(modal).not.toBeVisible({ timeout: 5000 });
    }

    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });

  test('Admin Evaluations governance workspace validates closed-loop evaluation and feedback records', async ({ adminPage }) => {
    const { page, monitor } = adminPage;

    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    // 1. Verify Page Header
    const titleEl = page.locator('.stitch-page-title, h1, .evaluation-header-wrapper').first();
    await expect(titleEl).toBeVisible();
    await expect(titleEl).toContainText(/AI MODEL EVALUATION|EVALUATION/i);

    // 2. Verify Evaluation Telemetry and Confusion Matrix
    await expect(page.getByText(/Confusion Matrix/i).first()).toBeVisible();
    await expect(page.getByText(/Evaluation Records|Recent Evaluations/i).first()).toBeVisible();

    // 3. Verify Feedback signals section
    await expect(page.getByText(/Model Feedback|Performance Summary|Closed-Loop/i).first()).toBeVisible();

    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });
});
