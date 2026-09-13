const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/database');
const { User, ROLES, Officer, PredictionCycle } = require('../src/models');
const seedDatabase = require('../seed');

describe('Module 15: Validation, Error Handling & API Hardening Tests', () => {
  let server;
  let baseUrl;
  let rawBaseUrl;
  const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_civic_forecasting_2026_secure';

  let adminToken;
  let officerToken;
  let officerUser;
  let officerDoc;

  before(async () => {
    await connectDB();
    await seedDatabase();

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        rawBaseUrl = `http://127.0.0.1:${port}`;
        baseUrl = `http://127.0.0.1:${port}/api/v1`;
        resolve();
      });
    });

    const adminUser = await User.findOne({ email: 'admin@civic.gov' });
    adminToken = jwt.sign(
      { userId: adminUser._id.toString(), role: ROLES.ADMIN },
      secret,
      { expiresIn: '1h' }
    );

    officerUser = await User.findOne({ email: 'marcus.vance@civic.gov' });
    officerDoc = await Officer.findOne({ userId: officerUser._id });
    officerToken = jwt.sign(
      {
        userId: officerUser._id.toString(),
        role: ROLES.OFFICER,
        officerId: officerDoc.officerId,
        department: officerDoc.department,
      },
      secret,
      { expiresIn: '1h' }
    );
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  });

  // ----------------------------------------------------
  // 1. HEALTH CHECK & SECURITY HEADERS
  // ----------------------------------------------------
  it('GET /api/health returns 200 with standard health check structure', async () => {
    const res = await fetch(`${rawBaseUrl}/api/health`);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.status, 'healthy');
    assert.strictEqual(data.data.database, 'connected');
    // Helmet security headers
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
  });

  it('Unknown route returns standard 404 JSON response', async () => {
    const res = await fetch(`${baseUrl}/non-existent-endpoint`);
    const data = await res.json();

    assert.strictEqual(res.status, 404);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('Route not found'));
    assert.ok(Array.isArray(data.errors));
  });

  // ----------------------------------------------------
  // 2. AUTHENTICATION HARDENING
  // ----------------------------------------------------
  it('Missing Bearer token returns 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`);
    const data = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('Authentication required'));
  });

  it('Malformed/Invalid token returns 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: 'Bearer invalid.token.payload' },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('Invalid authentication token'));
  });

  it('Expired token returns 401 Unauthorized', async () => {
    const expiredToken = jwt.sign(
      { userId: officerUser._id.toString(), role: ROLES.OFFICER },
      secret,
      { expiresIn: '-1s' }
    );
    const res = await fetch(`${baseUrl}/officer/dashboard`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('expired'));
  });

  // ----------------------------------------------------
  // 3. AUTHORIZATION (RBAC) HARDENING
  // ----------------------------------------------------
  it('Officer token attempting to access Admin API returns 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/admin/predictions`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('Access forbidden'));
  });

  // ----------------------------------------------------
  // 4. PAGINATION & SORTING HARDENING
  // ----------------------------------------------------
  it('Invalid pagination parameters (?page=0 or ?limit=500) return 400 Bad Request', async () => {
    const resPageZero = await fetch(`${baseUrl}/admin/predictions?page=0`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataPage = await resPageZero.json();
    assert.strictEqual(resPageZero.status, 400);
    assert.strictEqual(dataPage.success, false);
    assert.ok(dataPage.message.includes('page parameter'));

    const resLimitHigh = await fetch(`${baseUrl}/admin/predictions?limit=500`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataLimit = await resLimitHigh.json();
    assert.strictEqual(resLimitHigh.status, 400);
    assert.strictEqual(dataLimit.success, false);
    assert.ok(dataLimit.message.includes('limit parameter'));
  });

  it('Unsupported/Arbitrary sort field (?sortBy=passwordHash) returns 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/admin/predictions?sortBy=passwordHash`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('Invalid sort field'));
  });

  // ----------------------------------------------------
  // 5. DATE RANGE VALIDATION
  // ----------------------------------------------------
  it('Invalid date range (startDate > endDate) returns 400 Bad Request', async () => {
    const res = await fetch(
      `${baseUrl}/admin/predictions?startDate=2026-10-01&endDate=2026-09-01`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('cannot be after endDate'));
  });

  // ----------------------------------------------------
  // 6. MONGOOSE SCHEMA VALIDATION (BOUNDS & COORDINATES)
  // ----------------------------------------------------
  it('Creating Prediction with invalid probability (> 1) returns 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/admin/predictions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        predictionId: 'PRED-INVALID-PROB-001',
        complaintType: 'Pothole Wave',
        department: 'Streets & Sanitation',
        communityArea: 'The Loop',
        ward: 'Ward 42',
        probability: 1.85, // Invalid: > 1
        riskScore: 75,
        riskLevel: 'HIGH',
      }),
    });
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('Probability cannot exceed 1') || data.message.includes('Validation'));
  });

  it('Creating Prediction with invalid coordinates ([200, 100]) returns 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/admin/predictions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        predictionId: 'PRED-INVALID-COORDS-001',
        complaintType: 'Pothole Wave',
        department: 'Streets & Sanitation',
        communityArea: 'The Loop',
        ward: 'Ward 42',
        location: { type: 'Point', coordinates: [200, 100] }, // Invalid coordinates
        probability: 0.85,
        riskScore: 75,
        riskLevel: 'HIGH',
      }),
    });
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('Coordinates must be GeoJSON') || data.message.includes('Validation'));
  });

  // ----------------------------------------------------
  // 7. DUPLICATE RESOURCE CONFLICT (409 CONFLICT)
  // ----------------------------------------------------
  it('Registering User with duplicate email returns 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Officer',
        email: 'marcus.vance@civic.gov', // Existing email
        password: 'Password123!',
        role: 'OFFICER',
        department: 'Streets & Sanitation',
      }),
    });
    const data = await res.json();

    assert.strictEqual(res.status, 409);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('already registered') || data.message.includes('Duplicate'));
  });

  it('Creating Officer with duplicate employeeCode returns 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/admin/officers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        employeeCode: officerDoc.employeeCode, // Existing employeeCode from seed
        officerId: 'OFF-NEW-UNIQUE-999',
        name: 'New Test Officer',
        department: 'Streets & Sanitation',
      }),
    });
    const data = await res.json();

    assert.strictEqual(res.status, 409);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('already registered') || data.message.includes('Duplicate'));
  });

  // ----------------------------------------------------
  // 8. MALFORMED JSON BODY HANDLING
  // ----------------------------------------------------
  it('Malformed JSON in request body returns clean 400 Bad Request without leaking stack traces', async () => {
    const res = await fetch(`${baseUrl}/admin/predictions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: '{"predictionId": "PRED-123", "broken_json": ', // Malformed JSON string
    });
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('Malformed JSON'));
    assert.ok(Array.isArray(data.errors));
  });
});
