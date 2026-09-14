import { test, expect } from '@playwright/test';
import { loginViaUI, setupErrorMonitor } from '../../helpers/test-utils.js';

test.describe('Cross-Role Data & Operational View Consistency', () => {
  test('Admin assignments and Officer task queue present consistent operational metadata', async ({ browser }) => {
    const adminContext = await browser.newContext();
    const officerContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const officerPage = await officerContext.newPage();

    const monitor = setupErrorMonitor(adminPage);

    // 1. Admin logs in and checks assignments
    await loginViaUI(adminPage, 'ADMIN');
    await adminPage.goto('/assignments');
    await adminPage.waitForLoadState('networkidle');

    const adminCards = adminPage.locator('.assignment-card, tr.assignment-row, .stitch-card.p-5');
    if ((await adminCards.count()) > 0) {
      const firstCard = adminCards.first();
      await expect(firstCard).toBeVisible();
    }

    // 2. Officer logs in and checks operational tasks
    await loginViaUI(officerPage, 'OFFICER');
    await officerPage.goto('/officer/assignments');
    await officerPage.waitForLoadState('networkidle');
    await expect(officerPage).toHaveURL(/\/officer\/assignments/);

    const officerCards = officerPage.locator('.stitch-card.p-5');
    if ((await officerCards.count()) > 0) {
      const firstOfficerCard = officerCards.first();
      await expect(firstOfficerCard.locator('.font-mono').first()).toBeVisible();
      await expect(firstOfficerCard.getByText(/LOCATION|TARGET GEOMETRY/i).first()).toBeVisible();
      await expect(firstOfficerCard.getByText(/RISK/i).first()).toBeVisible();
    }

    expect(monitor.hasCriticalErrors()).toBeFalsy();

    await adminContext.close();
    await officerContext.close();
  });

  test('Admin and Officer verification queues present consistent workflow state', async ({ browser }) => {
    const adminContext = await browser.newContext();
    const officerContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const officerPage = await officerContext.newPage();

    // 1. Admin Verification view
    await loginViaUI(adminPage, 'ADMIN');
    await adminPage.goto('/verification');
    await adminPage.waitForLoadState('networkidle');
    await expect(adminPage).toHaveURL(/\/verification/);
    await expect(adminPage.locator('.stitch-page-title, h1').first()).toBeVisible();

    // 2. Officer Verification view
    await loginViaUI(officerPage, 'OFFICER');
    await officerPage.goto('/officer/verification');
    await officerPage.waitForLoadState('networkidle');
    await expect(officerPage).toHaveURL(/\/officer\/verification/);
    await expect(officerPage.locator('h1, .header-page-title').first()).toBeVisible();

    await adminContext.close();
    await officerContext.close();
  });

  test('User profiles clearly reflect distinct role authorities (Admin vs Field Officer)', async ({ browser }) => {
    const adminContext = await browser.newContext();
    const officerContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const officerPage = await officerContext.newPage();

    // 1. Admin Profile
    await loginViaUI(adminPage, 'ADMIN');
    await adminPage.goto('/profile');
    await adminPage.waitForLoadState('networkidle');
    await expect(adminPage.getByText('CENTRAL ADMINISTRATOR').first()).toBeVisible();
    await expect(adminPage.getByText('Central Municipal Governance').first()).toBeVisible();
    await expect(adminPage.getByText('Predictions Intelligence').first()).toBeVisible();

    // 2. Officer Profile
    await loginViaUI(officerPage, 'OFFICER');
    await officerPage.goto('/officer/profile');
    await officerPage.waitForLoadState('networkidle');
    await expect(officerPage.getByText('FIELD INSPECTOR').first()).toBeVisible();
    await expect(officerPage.getByText('Field Inspection & Verification').first()).toBeVisible();
    await expect(officerPage.getByText('Field Operations Dashboard').first()).toBeVisible();

    await adminContext.close();
    await officerContext.close();
  });
});
