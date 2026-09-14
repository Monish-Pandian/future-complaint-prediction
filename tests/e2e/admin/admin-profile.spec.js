import { test, expect } from '../../fixtures/auth.fixture.js';
import { ADMIN_CREDENTIALS } from '../../helpers/test-utils.js';

test.describe('Admin Profile & Operational Governance E2E User Journey', () => {
  test('Admin can view identity specifications, security policies, authorized subsystems, and sign out', async ({ adminPage }) => {
    const { page, monitor } = adminPage;

    // 1. Navigate to Profile
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/profile/);

    // 2. Verify Page Header
    await expect(page.locator('.stitch-page-title, .header-page-title, h1').first()).toBeVisible();
    await expect(page.getByText(/Administrator Profile/i)).toBeVisible();

    // 3. Verify Admin Profile Identity Card
    await expect(page.locator('.profile-role-badge')).toHaveText(/CENTRAL ADMINISTRATOR/i);
    await expect(page.getByText(ADMIN_CREDENTIALS.email)).toBeVisible();
    await expect(page.getByText(/Chicago Metropolitan Area/i)).toBeVisible();

    // 4. Verify Security & Session Card
    await expect(page.getByText(/SECURITY & SESSION/i)).toBeVisible();
    await expect(page.getByText(/Encrypted Token Authentication/i)).toBeVisible();
    await expect(page.getByText(/Role-Based Access Control/i)).toBeVisible();

    // 5. Verify Operational Access & Capabilities Matrix
    await expect(page.getByText(/Administrative Capabilities & Subsystems/i)).toBeVisible();
    await expect(page.getByText(/Predictions Intelligence/i)).toBeVisible();
    await expect(page.getByText(/Spatial Risk Heatmap/i)).toBeVisible();
    await expect(page.getByText(/AI Dispatch Operations/i)).toBeVisible();
    await expect(page.getByText(/Field Verification Logs/i)).toBeVisible();
    await expect(page.getByText(/AI Model Governance/i)).toBeVisible();

    // 6. Verify Sign Out Button
    const logoutBtn = page.locator('.btn-profile-logout, [aria-label*="Sign out"]').first();
    await expect(logoutBtn).toBeVisible();

    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });
});
