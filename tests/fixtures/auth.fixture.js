import { test as base, expect } from '@playwright/test';
import { loginViaUI, setupErrorMonitor, ADMIN_CREDENTIALS, OFFICER_CREDENTIALS } from '../helpers/test-utils.js';

/**
 * Extended Playwright Test Fixtures with authenticated Admin and Officer pages
 */
export const test = base.extend({
  // Pre-authenticated Admin Page
  adminPage: async ({ page }, use) => {
    const monitor = setupErrorMonitor(page);
    await loginViaUI(page, 'ADMIN');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await use({ page, monitor });
  },

  // Pre-authenticated Officer Page
  officerPage: async ({ page }, use) => {
    const monitor = setupErrorMonitor(page);
    await loginViaUI(page, 'OFFICER');
    await expect(page).toHaveURL(/\/officer/, { timeout: 10000 });
    await use({ page, monitor });
  },
});

export { expect };
