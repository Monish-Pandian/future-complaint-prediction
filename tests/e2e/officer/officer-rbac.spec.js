import { test, expect } from '../../fixtures/auth.fixture.js';
import { OFFICER_CREDENTIALS } from '../../helpers/test-utils.js';

test.describe('Field Officer RBAC & Data Isolation Verification', () => {
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

  for (const adminRoute of adminRoutes) {
    test(`Officer is prevented from accessing Admin UI route: ${adminRoute}`, async ({ officerPage }) => {
      const { page } = officerPage;

      await page.goto(adminRoute);
      await page.waitForLoadState('networkidle');

      // The officer must not see the admin page; they should be redirected to /officer or /login
      const currentURL = page.url();
      const isBlockedOrRedirected =
        currentURL.includes('/officer') ||
        currentURL.includes('/login') ||
        !currentURL.includes(adminRoute);

      expect(isBlockedOrRedirected).toBe(true);
    });
  }

  test('Officer token is rejected with HTTP 403 on Admin API endpoints', async ({ page }) => {
    // 1. Authenticate as Officer via API to obtain JWT token
    const authRes = await page.request.post('http://localhost:5000/api/v1/auth/login', {
      data: {
        email: OFFICER_CREDENTIALS.email,
        password: OFFICER_CREDENTIALS.password,
      },
    });

    expect(authRes.status()).toBe(200);
    const authData = await authRes.json();
    const token = authData.data?.token || authData.token;
    expect(token).toBeTruthy();

    // 2. Attempt requesting sensitive Admin-only API endpoints with Officer token
    const adminEndpoints = [
      '/api/v1/admin/dashboard',
      '/api/v1/admin/officers',
      '/api/v1/admin/evaluation/metrics',
      '/api/v1/admin/model/retraining-config',
    ];

    for (const endpoint of adminEndpoints) {
      const apiRes = await page.request.get(`http://localhost:5000${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // RBAC must reject with HTTP 403 Forbidden
      expect(apiRes.status()).toBe(403);
    }
  });
});
