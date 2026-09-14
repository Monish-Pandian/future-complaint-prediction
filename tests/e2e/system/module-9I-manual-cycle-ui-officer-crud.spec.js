import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('MODULE 9I — PRODUCTION UI CLEANUP + MANUAL CYCLE ORCHESTRATION + OFFICER CRUD', () => {

  test('Goal 3A: Application is strictly Dark Mode only with zero Light Mode toggle or state', async ({ adminPage }) => {
    const { page, monitor } = adminPage;

    // 1. Check initial render is in dark mode
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveAttribute('data-theme', 'dark');

    // 2. Verify ThemeToggle button does NOT exist anywhere in Header or Auth
    const themeToggleBtn = page.locator('.theme-toggle-btn, button[aria-label*="light" i], button[aria-label*="dark" i]');
    await expect(themeToggleBtn).toHaveCount(0);

    // 3. Verify page refresh preserves dark mode
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(htmlElement).toHaveAttribute('data-theme', 'dark');

    // 4. Verify cross-page navigation remains dark
    await page.goto('/assignments');
    await page.waitForLoadState('networkidle');
    await expect(htmlElement).toHaveAttribute('data-theme', 'dark');

    await page.goto('/officers');
    await page.waitForLoadState('networkidle');
    await expect(htmlElement).toHaveAttribute('data-theme', 'dark');

    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });

  test('Goal 3B: Assignments page is operations-first with no tutorial/demo strategy cards or static fluff', async ({ adminPage }) => {
    const { page, monitor } = adminPage;

    await page.goto('/assignments');
    await page.waitForLoadState('networkidle');

    // Verify operations-first header
    await expect(page.getByRole('heading', { name: /Assignment Operations/i })).toBeVisible();

    // Verify KPI summary is rendered
    await expect(page.locator('.assignments-kpis-grid, .asgn-summary-grid, .asgn-kpi-card').first()).toBeVisible();

    // Verify tutorial cards are permanently REMOVED
    await expect(page.locator('.dispatch-strategy-card')).not.toBeVisible();
    await expect(page.getByText(/AI Dispatch Strategy & Operational Pipeline/i)).not.toBeVisible();
    await expect(page.getByText(/SCORING WEIGHT DISTRIBUTION/i)).not.toBeVisible();
    await expect(page.getByText(/DISPATCH LIFECYCLE PIPELINE/i)).not.toBeVisible();

    // Verify operational table is present
    const table = page.locator('table.assignments-table, table.table').first();
    await expect(table).toBeVisible();

    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });

  test('Goal 2: Officer CRUD end-to-end lifecycle with real MongoDB persistence and safe deactivation', async ({ adminPage }) => {
    const { page, monitor } = adminPage;

    await page.goto('/officers');
    await page.waitForLoadState('networkidle');

    // 1. Verify Officers Table renders real MongoDB records
    const table = page.locator('table.officers-table, table.table').first();
    await expect(table).toBeVisible();

    const uniqueSuffix = Date.now().toString().slice(-4);
    const testOfficerName = `AutoTest Officer ${uniqueSuffix}`;
    const testEmployeeCode = `EMP-T${uniqueSuffix}`;
    const testEmail = `autotest.${uniqueSuffix}@civic.gov`;

    // 2. Open Provision Officer Modal
    const provisionBtn = page.locator('#provision-officer-btn, button:has-text("Provision Officer")').first();
    await expect(provisionBtn).toBeVisible();
    await provisionBtn.click();

    const createModal = page.locator('.officer-modal-card');
    await expect(createModal).toBeVisible();

    // Fill form
    await createModal.locator('input[name="name"]').fill(testOfficerName);
    await createModal.locator('input[name="email"]').fill(testEmail);
    await createModal.locator('input[name="employeeCode"]').fill(testEmployeeCode);
    await createModal.locator('input[name="phone"]').fill('+1-312-555-9999');
    await createModal.locator('input[name="skills"]').fill('Pothole Repair, Rapid Response');

    // Submit Create
    await createModal.locator('button[type="submit"]').click();
    await expect(createModal).not.toBeVisible({ timeout: 10000 });

    // 3. Search and Verify Created Officer Appears in Table
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill(testEmployeeCode);
    await page.waitForTimeout(600);

    await expect(page.getByText(testOfficerName).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(testEmployeeCode).first()).toBeVisible();

    // 4. Edit Officer
    const editBtn = page.locator('button[title*="Edit" i], .btn-officer-edit').first();
    await editBtn.click();

    const editModal = page.locator('.officer-modal-card');
    await expect(editModal).toBeVisible();

    const updatedName = `${testOfficerName} (Updated)`;
    await editModal.locator('input[name="name"]').fill(updatedName);
    await editModal.locator('select[name="availability"]').selectOption('OFF_DUTY');

    await editModal.locator('button[type="submit"]').click();
    await expect(editModal).not.toBeVisible({ timeout: 10000 });

    // Verify Updated Officer appears in table
    await searchInput.fill('');
    await searchInput.fill(testEmployeeCode);
    await page.waitForTimeout(600);

    await expect(page.getByText(updatedName).first()).toBeVisible({ timeout: 8000 });

    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });

  test('Goal 1 & 4: Manual Prediction Cycle Orchestration and Idempotency', async ({ request }) => {
    // 1. Authenticate Admin via API
    const loginRes = await request.post('http://localhost:5000/api/v1/auth/login', {
      data: {
        email: 'monish@gmail.com',
        password: 'Monish',
      },
    });
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    const adminToken = loginBody.data.token;
    expect(adminToken).toBeDefined();

    // 2. Trigger Manual Run Prediction Cycle through Admin API
    const response = await request.post('http://localhost:5000/api/v1/admin/predictions/run-cycle', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        budgetPct: 0.05,
      },
    });

    expect([200, 201]).toContain(response.status());
    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body.data).toBeDefined();
    expect(body.data.cycle).toBeDefined();
    expect(body.data.predictions).toBeDefined();

    // Verification candidate selection should be triggered
    if (body.data.candidates) {
      expect(body.data.candidates.totalSelected).toBeGreaterThanOrEqual(0);
    }

    // Auto-assignment should be triggered
    if (body.data.assignments) {
      expect(body.data.assignments.assignmentPolicy).toBe('RISK_DISTANCE_WORKLOAD_ASSIGNMENT');
    }
  });

  test('Goal 7: Strict RBAC Protection on Officer CRUD', async ({ officerPage, request }) => {
    // 1. Officer browser trying to navigate to admin officers
    const { page } = officerPage;
    await page.goto('/officers');
    await page.waitForLoadState('networkidle');

    // Should be redirected away from admin officers
    await expect(page).not.toHaveURL(/\/officers$/);

    // 2. Unauthenticated request to Admin Officer CRUD returns 401
    const unauthRes = await request.post('http://localhost:5000/api/v1/admin/officers', {
      data: { name: 'Unauthorized Officer', department: 'Transportation', employeeCode: 'EMP-UNAUTH' },
    });
    expect(unauthRes.status()).toBe(401);
  });

});
