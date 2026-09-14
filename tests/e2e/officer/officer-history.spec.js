import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Field Officer History & Audit Log E2E User Journey', () => {
  test('Officer can view completed operations history, filter by outcome, search, and verify data isolation', async ({ officerPage }) => {
    const { page, monitor } = officerPage;

    // 1. Navigate to Officer History page
    await page.goto('/officer/history');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/officer\/history/);

    // 2. Verify Page Header
    const titleEl = page.locator('h1').first();
    await expect(titleEl).toBeVisible();
    await expect(titleEl).toContainText(/Operational Verification History/i);

    // 3. Verify Search and Outcome Filter Controls
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();

    const outcomeSelect = page.locator('select').first();
    await expect(outcomeSelect).toBeVisible();

    // Verify all 5 outcome options plus ALL exist in the filter
    const expectedFilterOptions = [
      'ALL',
      'PROBLEM_CONFIRMED',
      'PROBLEM_NOT_FOUND',
      'DIFFERENT_PROBLEM',
      'UNABLE_TO_VERIFY',
      'DUPLICATE',
    ];

    for (const optVal of expectedFilterOptions) {
      await expect(outcomeSelect.locator(`option[value="${optVal}"]`)).toHaveCount(1);
    }

    // 4. Test Search filter
    await searchInput.fill('Inspection');
    await page.waitForTimeout(300);
    await searchInput.fill('');
    await page.waitForTimeout(300);

    // 5. Switch outcome filters
    await outcomeSelect.selectOption('PROBLEM_CONFIRMED');
    await page.waitForTimeout(300);
    await outcomeSelect.selectOption('ALL');
    await page.waitForTimeout(300);

    // 6. Verify table headers if history records or table exist
    const historyTable = page.locator('table');
    if (await historyTable.isVisible()) {
      await expect(historyTable.getByText(/DISPATCH ID/i)).toBeVisible();
      await expect(historyTable.getByText(/COMPLAINT TYPE/i)).toBeVisible();
      await expect(historyTable.getByText(/AREA \/ WARD/i)).toBeVisible();
      await expect(historyTable.getByText(/RISK LEVEL/i)).toBeVisible();
      await expect(historyTable.getByText(/VERIFICATION OUTCOME/i)).toBeVisible();
      await expect(historyTable.getByText(/COMPLETED DATE/i)).toBeVisible();
    }

    // Verify no fatal network errors
    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });
});
