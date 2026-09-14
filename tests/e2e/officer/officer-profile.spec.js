import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Field Officer Profile & Operational Identity E2E User Journey', () => {
  test('Officer can view operational identity, session security, authorized modules, and protocols', async ({ officerPage }) => {
    const { page, monitor } = officerPage;

    // 1. Navigate to Officer Profile
    await page.goto('/officer/profile');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/officer\/profile/);

    // 2. Verify Command Bar & Telemetry
    const titleEl = page.locator('.stitch-page-title').first();
    await expect(titleEl).toBeVisible();
    await expect(titleEl).toContainText(/Field Officer Profile/i);
    await expect(page.getByText('OPERATOR / PROFILE').first()).toBeVisible();

    // 3. Verify Identity Card Specifications
    const identityCard = page.locator('.profile-identity-card');
    await expect(identityCard).toBeVisible();
    await expect(identityCard.getByText('PERSONNEL IDENTITY')).toBeVisible();
    await expect(identityCard.getByText('FIELD INSPECTOR')).toBeVisible();
    await expect(identityCard.getByText('EMAIL ADDRESS')).toBeVisible();
    await expect(identityCard.getByText('AUTHORITY SCOPE')).toBeVisible();
    await expect(identityCard.getByText(/Field Inspection & Verification/i)).toBeVisible();
    await expect(identityCard.getByText('DEPARTMENT')).toBeVisible();
    await expect(identityCard.getByText('JURISDICTION')).toBeVisible();

    // 4. Verify Security & Session Card
    const securityCard = page.locator('.profile-security-card');
    await expect(securityCard).toBeVisible();
    await expect(securityCard.getByText('SECURITY & SESSION')).toBeVisible();
    await expect(securityCard.getByText('Encrypted Token Authentication')).toBeVisible();
    await expect(securityCard.getByText('Role-Based Access Control')).toBeVisible();
    await expect(securityCard.locator('.btn-profile-logout')).toBeVisible();

    // 5. Verify Operational Access / Authorized Modules Matrix
    const capCard = page.locator('.profile-capabilities-card');
    await expect(capCard).toBeVisible();
    await expect(capCard.getByText(/Field Operations & Authorized Tasks/i)).toBeVisible();
    await expect(capCard.getByText('Field Operations Dashboard')).toBeVisible();
    await expect(capCard.getByText('My Assigned Dispatches')).toBeVisible();
    await expect(capCard.getByText('Field Verification Tasks')).toBeVisible();
    await expect(capCard.getByText('Operational History')).toBeVisible();

    // 6. Verify Field Inspection Protocols Callout
    const protocolsBox = page.locator('.profile-invariants-box');
    await expect(protocolsBox).toBeVisible();
    await expect(protocolsBox.getByText(/FIELD INSPECTION PROTOCOLS/i)).toBeVisible();
    await expect(protocolsBox.getByText('GPS AUDIT:')).toBeVisible();
    await expect(protocolsBox.getByText('5 Standard Codes')).toBeVisible();

    // Verify no fatal network errors
    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });
});
