import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Field Officer Verification & Ground Truth E2E User Journey', () => {
  test('Officer can view verification queue, filter tasks, and interact with the standard 5-outcome verification modal', async ({ officerPage }) => {
    const { page, monitor } = officerPage;

    // 1. Navigate to Verification page
    await page.goto('/officer/verification');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/officer\/verification/);

    // 2. Verify Page Header
    const titleEl = page.locator('h1, .header-page-title').first();
    await expect(titleEl).toBeVisible();
    await expect(titleEl).toContainText(/Field Verification|VERIFICATION/i);

    // 3. Verify Filters
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();

    const statusSelect = page.locator('select').first();
    await expect(statusSelect).toBeVisible();

    // Check status filter options existence
    await expect(statusSelect.locator('option[value="ACTIVE"]')).toHaveCount(1);
    await expect(statusSelect.locator('option[value="COMPLETED"]')).toHaveCount(1);
    await expect(statusSelect.locator('option[value="ALL"]')).toHaveCount(1);

    // 4. Test Search filter
    await searchInput.fill('Street');
    await page.waitForTimeout(300);
    await searchInput.fill('');
    await page.waitForTimeout(300);

    // 5. Test Status dropdown filter change
    await statusSelect.selectOption('COMPLETED');
    await page.waitForTimeout(300);
    await statusSelect.selectOption('ACTIVE');
    await page.waitForTimeout(300);

    // 6. If verification tasks exist, test Ground Truth modal rendering & outcomes validation
    const verifyButtons = page.locator('button:has-text("Verify Ground Truth")');
    const btnCount = await verifyButtons.count();

    if (btnCount > 0) {
      // Open verification modal
      await verifyButtons.first().click();

      // Verify modal dialog opens
      const modal = page.locator('[role="dialog"], .officer-modal-backdrop');
      await expect(modal).toBeVisible();
      await expect(modal.getByText(/Submit Field Ground Truth Verification/i).first()).toBeVisible();

      // Verify the 5 standard verification outcome codes
      const outcomeSelect = modal.locator('select.officer-form-input').first();
      await expect(outcomeSelect).toBeVisible();

      const expectedOutcomes = [
        'PROBLEM_CONFIRMED',
        'PROBLEM_NOT_FOUND',
        'DIFFERENT_PROBLEM',
        'DUPLICATE',
        'UNABLE_TO_VERIFY',
      ];

      for (const val of expectedOutcomes) {
        const option = outcomeSelect.locator(`option[value="${val}"]`);
        await expect(option).toHaveCount(1);
      }

      // Verify severity dropdown
      const severitySelect = modal.locator('select.officer-form-input').nth(1);
      if (await severitySelect.isVisible()) {
        await expect(severitySelect.locator('option[value="LOW"]')).toHaveCount(1);
        await expect(severitySelect.locator('option[value="MEDIUM"]')).toHaveCount(1);
        await expect(severitySelect.locator('option[value="HIGH"]')).toHaveCount(1);
        await expect(severitySelect.locator('option[value="CRITICAL"]')).toHaveCount(1);
      }

      // Verify ground notes textarea
      const notesTextarea = modal.locator('textarea.officer-form-input');
      await expect(notesTextarea).toBeVisible();

      // Verify photo/evidence URL input
      const evidenceInput = modal.locator('input[type="text"].officer-form-input');
      await expect(evidenceInput).toBeVisible();

      // Verify GPS toggle
      const gpsToggle = modal.locator('#gps-verify-toggle');
      if (await gpsToggle.isVisible()) {
        await expect(gpsToggle).toBeChecked();
      }

      // Verify Submit and Cancel buttons
      const submitBtn = modal.locator('button[type="submit"]');
      const cancelBtn = modal.locator('button:has-text("Cancel"), .verif-drawer-close').first();
      await expect(submitBtn).toBeVisible();
      await expect(cancelBtn).toBeVisible();

      // Test non-destructive cancel / close
      await cancelBtn.click();
      await expect(modal).not.toBeVisible({ timeout: 5000 });
    }

    // Verify no fatal network errors
    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });
});
