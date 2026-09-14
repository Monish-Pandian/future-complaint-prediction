import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Field Officer My Assignments E2E User Journey', () => {
  test('Officer can view assigned tasks queue, filter by status, search, and inspect task details', async ({ officerPage }) => {
    const { page, monitor } = officerPage;

    // 1. Navigate to My Assignments page
    await page.goto('/officer/assignments');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/officer\/assignments/);

    // 2. Verify Page Header & Telemetry
    const headerTitle = page.locator('h1, .header-page-title').first();
    await expect(headerTitle).toBeVisible();
    await expect(headerTitle).toContainText(/MY ASSIGNMENTS|Field Inspection/i);
    await expect(page.getByText('FIELD OPERATIONAL DEPLOYMENT').first()).toBeVisible();

    // 3. Verify Filter Tabs Strip
    const allTab = page.getByRole('button', { name: /All Tasks/i }).first();
    const pendingTab = page.getByRole('button', { name: /Pending Acceptance/i }).first();
    const acceptedTab = page.getByRole('button', { name: /Accepted/i }).first();
    const inProgressTab = page.getByRole('button', { name: /In Progress/i }).first();
    const completedTab = page.getByRole('button', { name: /Completed/i }).first();
    const candidatesTab = page.getByRole('button', { name: /Verification Candidates/i }).first();

    await expect(allTab).toBeVisible();
    await expect(pendingTab).toBeVisible();
    await expect(acceptedTab).toBeVisible();
    await expect(inProgressTab).toBeVisible();
    await expect(completedTab).toBeVisible();
    await expect(candidatesTab).toBeVisible();

    // 4. Test Search Bar
    const searchInput = page.locator('.verification-search-input, input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Sanitation');
    await page.waitForTimeout(300);
    await searchInput.fill('');
    await page.waitForTimeout(300);

    // 5. Switch to Verification Candidates tab and verify candidate state
    await candidatesTab.click();
    await page.waitForTimeout(500);

    // Switch back to All Tasks
    await allTab.click();
    await page.waitForTimeout(300);

    // 6. Inspect Task Card attributes (human-readable, non-technical)
    const cards = page.locator('.stitch-card.p-5');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const firstCard = cards.first();
      await expect(firstCard).toBeVisible();

      // Check essential field inspection data elements
      await expect(firstCard.locator('.font-mono').first()).toBeVisible(); // Task / Assignment ID
      await expect(firstCard.getByText(/LOCATION|TARGET GEOMETRY/i).first()).toBeVisible();
      await expect(firstCard.getByText(/WARD \/ SECTOR/i).first()).toBeVisible();
      await expect(firstCard.getByText(/RISK/i).first()).toBeVisible();
    }

    // Verify no fatal network errors
    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });
});
