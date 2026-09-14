import { test, expect } from '@playwright/test';
import { loginViaUI, setupErrorMonitor, OFFICER_CREDENTIALS } from '../../helpers/test-utils.js';

test.describe('System-Wide Security, RBAC & Protection Boundaries', () => {
  const adminRoutes = [
    '/dashboard',
    '/predictions',
    '/risk-map',
    '/assignments',
    '/evaluations',
    '/officers',
    '/analytics',
    '/system',
  ];

  test('Field Officer is strictly blocked from all Admin routes and retained in Officer workspace', async ({ page }) => {
    const monitor = setupErrorMonitor(page);
    await loginViaUI(page, 'OFFICER');

    for (const route of adminRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      const url = page.url();
      const isProtected = url.includes('/officer') || url.includes('/login') || !url.includes(route);
      expect(isProtected, `Officer should not have access to ${route}`).toBe(true);
    }

    expect(monitor.hasCriticalErrors()).toBeFalsy();
  });

  test('Backend RBAC rejects Officer JWT tokens on Admin API endpoints with HTTP 403 Forbidden', async ({ request }) => {
    // 1. Obtain Officer Token
    const authRes = await request.post('http://localhost:5000/api/v1/auth/login', {
      data: {
        email: OFFICER_CREDENTIALS.email,
        password: OFFICER_CREDENTIALS.password,
      },
    });
    expect(authRes.status()).toBe(200);
    const authData = await authRes.json();
    const token = authData.data?.token || authData.token;

    // 2. Sensitive Admin Endpoints
    const endpoints = [
      '/api/v1/admin/dashboard',
      '/api/v1/admin/predictions',
      '/api/v1/admin/officers',
      '/api/v1/admin/evaluation/metrics',
      '/api/v1/admin/model/retraining-config',
    ];

    for (const ep of endpoints) {
      const res = await request.get(`http://localhost:5000${ep}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      expect(res.status(), `Endpoint ${ep} should return 403`).toBe(403);
    }
  });

  test('Unauthenticated requests to protected UI routes redirect to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/officer');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);
  });
});
