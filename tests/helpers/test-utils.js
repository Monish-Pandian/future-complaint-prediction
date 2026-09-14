/**
 * Test Utilities and Console/Network Monitoring Helpers
 * For Playwright E2E Test Suite
 */

export const ADMIN_CREDENTIALS = {
  email: 'monish@gmail.com',
  password: 'Monish',
  name: 'Monish',
  role: 'ADMIN',
};

export const OFFICER_CREDENTIALS = {
  email: 'off-00001@civic.gov',
  password: 'OfficerPass@123',
  name: 'Anthony Mendoza',
  role: 'OFFICER',
};

/**
 * Setup console and network error listeners on a page
 * @param {import('@playwright/test').Page} page
 */
export function setupErrorMonitor(page) {
  const errors = [];
  const networkErrors = [];

  page.on('pageerror', (err) => {
    errors.push({ type: 'pageerror', text: err.message });
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore non-fatal third-party or leaflet tile network blips
      if (!text.includes('favicon.ico') && !text.includes('tile.openstreetmap.org')) {
        errors.push({ type: 'console-error', text });
      }
    }
  });

  page.on('response', (response) => {
    if (response.status() >= 500) {
      networkErrors.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
      });
    }
  });

  return {
    getErrors: () => errors,
    getNetworkErrors: () => networkErrors,
    hasCriticalErrors: () => networkErrors.length > 0,
  };
}

/**
 * Helper to log in via UI
 * @param {import('@playwright/test').Page} page
 * @param {'ADMIN'|'OFFICER'} role
 */
export async function loginViaUI(page, role = 'ADMIN') {
  const credentials = role === 'ADMIN' ? ADMIN_CREDENTIALS : OFFICER_CREDENTIALS;
  const targetPattern = role === 'ADMIN' ? /\/dashboard/ : /\/officer/;
  
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Fill credentials cleanly
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  const submitBtn = page.locator('button[type="submit"]').first();

  await emailInput.fill(credentials.email);
  await passwordInput.fill(credentials.password);
  
  // Submit and wait for React Router transition
  await submitBtn.click();
  await page.waitForURL(targetPattern, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}
