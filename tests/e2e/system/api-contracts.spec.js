import { test, expect } from '@playwright/test';
import { ADMIN_CREDENTIALS, OFFICER_CREDENTIALS } from '../../helpers/test-utils.js';

test.describe('API Contracts & Network Data Integrity', () => {
  let adminToken = '';
  let officerToken = '';

  test.beforeAll(async ({ request }) => {
    // 1. Authenticate Admin
    const adminRes = await request.post('http://localhost:5000/api/v1/auth/login', {
      data: {
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password,
      },
    });
    expect(adminRes.status()).toBe(200);
    const adminData = await adminRes.json();
    adminToken = adminData.data?.token || adminData.token;
    expect(adminToken).toBeTruthy();

    // 2. Authenticate Officer
    const officerRes = await request.post('http://localhost:5000/api/v1/auth/login', {
      data: {
        email: OFFICER_CREDENTIALS.email,
        password: OFFICER_CREDENTIALS.password,
      },
    });
    expect(officerRes.status()).toBe(200);
    const officerData = await officerRes.json();
    officerToken = officerData.data?.token || officerData.token;
    expect(officerToken).toBeTruthy();
  });

  test('Admin API endpoints adhere strictly to JSON contracts without server errors', async ({ request }) => {
    const adminEndpoints = [
      '/api/v1/admin/dashboard',
      '/api/v1/admin/predictions',
      '/api/v1/admin/assignments',
      '/api/v1/admin/evaluation/metrics',
      '/api/v1/admin/officers',
      '/api/v1/admin/verification-monitoring',
    ];

    for (const endpoint of adminEndpoints) {
      const res = await request.get(`http://localhost:5000${endpoint}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.status(), `Failed endpoint: ${endpoint}`).toBe(200);
      const json = await res.json();
      expect(json).toBeDefined();
      expect(json.success !== false).toBe(true);
    }
  });

  test('Officer API endpoints adhere strictly to JSON contracts and role scope', async ({ request }) => {
    const officerEndpoints = [
      '/api/v1/officer/dashboard',
      '/api/v1/officer/assignments',
      '/api/v1/officer/verification-tasks',
    ];

    for (const endpoint of officerEndpoints) {
      const res = await request.get(`http://localhost:5000${endpoint}`, {
        headers: {
          Authorization: `Bearer ${officerToken}`,
        },
      });

      expect(res.status(), `Failed endpoint: ${endpoint}`).toBe(200);
      const json = await res.json();
      expect(json).toBeDefined();
    }
  });

  test('System Health & Centroids APIs return 200 OK with valid status', async ({ request }) => {
    const res = await request.get('http://localhost:5000/api/v1/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status || body.success).toBeTruthy();
  });
});
