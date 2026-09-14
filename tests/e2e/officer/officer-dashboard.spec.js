import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Field Officer Dashboard E2E User Journey', () => {
  test('Officer Dashboard loads telemetry, identity, capacity, KPIs, and operational pipeline from real APIs', async ({ officerPage }) => {
    const { page, monitor } = officerPage;

    // 1. Verify URL and Command Action Bar
    await expect(page).toHaveURL(/\/officer/);
    const titleEl = page.locator('.stitch-page-title').first();
    await expect(titleEl).toBeVisible();
    await expect(titleEl).toContainText(/Welcome back/i);

    // 2. Verify Duty Status & Department Telemetry
    await expect(page.getByText('ON DUTY').first()).toBeVisible();
    await expect(page.locator('.stitch-page-desc').first()).toBeVisible();
    await expect(page.locator('.stitch-page-desc').first()).toContainText(/Badge:|Department:|Workload:/i);

    // 3. Verify Operational KPIs Grid
    const kpiSection = page.locator('.officer-kpis-grid');
    await expect(kpiSection).toBeVisible();
    await expect(kpiSection.getByText(/ACTIVE ASSIGNMENTS/i).first()).toBeVisible();
    await expect(kpiSection.getByText(/PENDING ACCEPTANCE/i).first()).toBeVisible();
    await expect(kpiSection.getByText(/IN PROGRESS/i).first()).toBeVisible();
    await expect(kpiSection.getByText(/VERIFICATION PENDING/i).first()).toBeVisible();
    await expect(kpiSection.getByText(/VERIFIED \/ COMPLETED/i).first()).toBeVisible();

    // 4. Verify Workload & Capacity Card
    const capacityCard = page.locator('.officer-capacity-card');
    await expect(capacityCard).toBeVisible();
    await expect(capacityCard.getByText(/WORKLOAD & CAPACITY/i).first()).toBeVisible();
    await expect(capacityCard.getByText(/tasks|SLOTS OPEN|CAPACITY FULL/i).first()).toBeVisible();

    // 5. Verify Dispatch-to-Verification Lifecycle Banner
    const pipelineBanner = page.locator('.officer-pipeline-banner');
    await expect(pipelineBanner).toBeVisible();
    await expect(pipelineBanner.getByText(/1\. Assigned/i).first()).toBeVisible();
    await expect(pipelineBanner.getByText(/2\. Accepted/i).first()).toBeVisible();
    await expect(pipelineBanner.getByText(/3\. In Progress/i).first()).toBeVisible();
    await expect(pipelineBanner.getByText(/4\. Submitted/i).first()).toBeVisible();
    await expect(pipelineBanner.getByText(/5\. Completed/i).first()).toBeVisible();

    // 6. Verify Priority Field Assignments Section
    const taskSection = page.locator('.officer-card-section').first();
    await expect(taskSection).toBeVisible();
    await expect(taskSection.getByText(/Priority Field Assignments/i).first()).toBeVisible();

    // 7. Verify Right Column Widgets
    await expect(page.getByText(/Tasks Requiring Verification/i).first()).toBeVisible();
    await expect(page.getByText(/Recent Completed Work/i).first()).toBeVisible();

    // 8. Test Refresh Queue action
    const refreshBtn = page.getByRole('button', { name: /Refresh Queue/i }).first();
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await page.waitForLoadState('networkidle');
    await expect(titleEl).toBeVisible();

    // Verify no fatal network errors occurred
    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });

  test('Officer can filter, search, and inspect priority assignments on Dashboard', async ({ officerPage }) => {
    const { page } = officerPage;

    // 1. Verify tab filter controls
    const allTab = page.locator('button[role="tab"]:has-text("All")').first();
    const pendingTab = page.locator('button[role="tab"]:has-text("Pending Action")').first();
    const inProgTab = page.locator('button[role="tab"]:has-text("In Progress")').first();
    const completedTab = page.locator('button[role="tab"]:has-text("Completed")').first();

    await expect(allTab).toBeVisible();
    await expect(pendingTab).toBeVisible();
    await expect(inProgTab).toBeVisible();
    await expect(completedTab).toBeVisible();

    // Switch between tabs safely
    await pendingTab.click();
    await expect(pendingTab).toHaveAttribute('aria-selected', 'true');

    await inProgTab.click();
    await expect(inProgTab).toHaveAttribute('aria-selected', 'true');

    await completedTab.click();
    await expect(completedTab).toHaveAttribute('aria-selected', 'true');

    await allTab.click();
    await expect(allTab).toHaveAttribute('aria-selected', 'true');

    // 2. Test search filter
    const searchInput = page.locator('.officer-search-box, input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Street');
    await page.waitForTimeout(300);

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(300);

    // 3. Verify task card structure if tasks are present
    const taskCards = page.locator('.officer-task-card');
    const taskCount = await taskCards.count();
    if (taskCount > 0) {
      const firstCard = taskCards.first();
      await expect(firstCard.locator('.officer-task-id').first()).toBeVisible();
      await expect(firstCard.locator('.officer-task-title').first()).toBeVisible();
      await expect(firstCard.locator('.officer-why-pill').first()).toBeVisible();
      await expect(firstCard.locator('.officer-why-tag').first()).toContainText('DISPATCH REASON:');
    }
  });
});
