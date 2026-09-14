import { test, expect } from '../../fixtures/auth.fixture.js';

test.describe('Role-Based Access Control (RBAC) Security Verification', () => {
  const protectedAdminRoutes = [
    '/dashboard',
    '/predictions',
    '/risk-map',
    '/assignments',
    '/evaluations',
    '/officers',
    '/analytics',
    '/system',
  ];

  for (const adminRoute of protectedAdminRoutes) {
    test(`Field Officer is blocked/redirected when accessing Admin route ${adminRoute}`, async ({ officerPage }) => {
      const { page } = officerPage;

      await page.goto(adminRoute);
      await page.waitForLoadState('networkidle');

      // The officer should be redirected to /officer or prevented from accessing admin route
      const currentURL = page.url();
      const isBlockedOrRedirected =
        currentURL.includes('/officer') ||
        currentURL.includes('/login') ||
        !currentURL.includes(adminRoute);

      expect(isBlockedOrRedirected).toBe(true);
    });
  }

  test('Unauthenticated user cannot access protected pages and is redirected to /login', async ({ page }) => {
    // Attempt accessing /dashboard without authentication
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);

    // Attempt accessing /officer without authentication
    await page.goto('/officer');
    await expect(page).toHaveURL(/\/login/);
  });
});
