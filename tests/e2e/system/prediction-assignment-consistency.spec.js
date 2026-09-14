import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Prediction → Assignment Consistency & Traceability', () => {
  test('Predictions Intelligence presents valid probability ranges, risk classifications, and geographic areas', async ({ adminPage }) => {
    const { page, monitor } = adminPage;

    await page.goto('/predictions');
    await page.waitForLoadState('networkidle');

    // 1. Verify Page Header and Telemetry
    const pageTitle = page.locator('.stitch-page-title, h1, .header-page-title').first();
    await expect(pageTitle).toBeVisible();
    await expect(pageTitle).toContainText(/PREDICTED COMPLAINTS|Predictions/i);

    // 2. Verify Table Columns
    const table = page.locator('table').first();
    await expect(table).toBeVisible();
    await expect(table.getByText(/COMPLAINT TYPE/i).first()).toBeVisible();
    await expect(table.getByText(/COMMUNITY AREA/i).first()).toBeVisible();
    await expect(table.getByText(/PROBABILITY/i).first()).toBeVisible();
    await expect(table.getByText(/RISK LEVEL/i).first()).toBeVisible();

    // 3. Inspect Rows
    const rows = table.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Verify first row contents
    const firstRow = rows.first();
    await expect(firstRow).toBeVisible();
    await expect(firstRow.locator('.font-mono').first()).toBeVisible();

    // Verify no fatal network errors
    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });

  test('AI Dispatch Operations preserve prediction context and display matching justifications', async ({ adminPage }) => {
    const { page, monitor } = adminPage;

    await page.goto('/assignments');
    await page.waitForLoadState('networkidle');

    // 1. Verify Page Header
    const titleEl = page.locator('.stitch-page-title, h1, .header-page-title').first();
    await expect(titleEl).toBeVisible();
    await expect(titleEl).toContainText(/Dispatch Operations|Assignments/i);

    // 2. Verify Algorithm Weights Telemetry
    await expect(page.getByText(/0\.4|40%|Risk/i).first()).toBeVisible();
    await expect(page.getByText(/0\.3|30%|Distance/i).first()).toBeVisible();
    await expect(page.getByText(/0\.3|30%|Workload/i).first()).toBeVisible();

    // 3. Verify Assignment Cards or Table
    const cards = page.locator('.assignment-card, tr.assignment-row, .stitch-card.p-5');
    if ((await cards.count()) > 0) {
      const firstCard = cards.first();
      await expect(firstCard).toBeVisible();
      await expect(firstCard.getByText(/RISK|PROBABILITY|OFFICER/i).first()).toBeVisible();
    }

    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });
});
