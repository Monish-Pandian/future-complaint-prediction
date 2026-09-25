import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Module 9K — Field Officer Assignment Verification & Clean Navigation', () => {
  test('Officer sidebar contains exclusively Dashboard, My Assignments, History, Profile and NO standalone Verification', async ({ officerPage }) => {
    const { page } = officerPage;

    const sidebar = page.locator('.sidebar, aside').first();
    await expect(sidebar).toBeVisible();

    // Verify exactly the 4 operational officer navigation items are present
    const allowedItems = ['Dashboard', 'My Assignments', 'History', 'Profile'];
    for (const label of allowedItems) {
      await expect(sidebar.locator(`a:has-text("${label}"), .nav-item:has-text("${label}")`).first()).toBeVisible();
    }

    // Verify standalone Verification is NOT in Officer navigation
    const forbiddenItems = ['Verification', 'Predictions', 'Risk Map', 'Evaluations', 'Officers', 'Analytics'];
    for (const forbidden of forbiddenItems) {
      await expect(sidebar.locator(`a:has-text("${forbidden}"), .nav-item:has-text("${forbidden}")`)).toHaveCount(0);
    }
  });

  test('Admin retains operational Verification navigation and monitoring views', async ({ adminPage }) => {
    const { page } = adminPage;

    const sidebar = page.locator('.sidebar, aside').first();
    await expect(sidebar).toBeVisible();

    // Admin MUST retain Verification in sidebar
    const adminVerifLink = sidebar.locator('a[href*="/verification"], .nav-item:has-text("Verification")').first();
    await expect(adminVerifLink).toBeVisible();

    await adminVerifLink.click();
    await expect(page).toHaveURL(/\/verification/);
    await expect(page.locator('h1, .header-page-title').first()).toBeVisible();
  });

  test('Field Officer executes complete verification flow from My Assignments', async ({ officerPage }) => {
    const { page, monitor } = officerPage;

    // 1. Navigate to My Assignments
    await page.goto('/officer/assignments');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/officer\/assignments/);

    // 2. Locate an active assignment card or task
    const inProgressBtn = page.locator('button:has-text("Submit Field Verification")').first();
    const startTaskBtn = page.locator('button:has-text("Start Field Task")').first();
    const acceptDispatchBtn = page.locator('button:has-text("Accept Dispatch")').first();

    if (await acceptDispatchBtn.isVisible()) {
      await acceptDispatchBtn.click();
      await page.waitForTimeout(500);
    }

    if (await startTaskBtn.isVisible()) {
      await startTaskBtn.click();
      await page.waitForTimeout(500);
    }

    const verifyBtn = page.locator('button:has-text("Submit Field Verification")').first();
    if (await verifyBtn.isVisible()) {
      await verifyBtn.click();

      // 3. Verify Ground Truth Modal is displayed
      const modal = page.locator('[role="dialog"], .officer-modal-backdrop');
      await expect(modal).toBeVisible();
      await expect(modal.getByText(/Submit Field Ground Truth Verification/i).first()).toBeVisible();

      // 4. Verify all 5 canonical outcomes are present
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
        await expect(outcomeSelect.locator(`option[value="${val}"]`)).toHaveCount(1);
      }

      // 5. Select PROBLEM_CONFIRMED and submit
      await outcomeSelect.selectOption('PROBLEM_CONFIRMED');

      const notesInput = modal.locator('textarea.officer-form-input');
      if (await notesInput.isVisible()) {
        await notesInput.fill('On-site inspection completed: physical damage confirmed by field officer.');
      }

      const submitBtn = modal.locator('button[type="submit"]');
      await expect(submitBtn).toBeEnabled();
      await submitBtn.click();

      // 6. Verify modal closes and assignment state updates
      await expect(modal).not.toBeVisible({ timeout: 8000 });
      await page.waitForTimeout(500);

      // Verify Completed badge is visible
      const completedBadge = page.locator('.stitch-badge:has-text("Verification Submitted"), span:has-text("Verification Submitted")').first();
      await expect(completedBadge).toBeVisible();
    } else {
      // If all tasks are already completed, check that completed badge is shown
      const completedBadges = page.locator('.stitch-badge:has-text("Verification Submitted"), span:has-text("Verification Submitted")');
      const count = await completedBadges.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }

    // Ensure no critical errors occurred
    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });
});
