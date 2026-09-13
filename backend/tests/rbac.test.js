const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/database');
const { User, ROLES } = require('../src/models/User');

describe('Role-Based Access Control (RBAC) & Authorization Tests', () => {
  let server;
  let baseUrl;
  const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_civic_forecasting_2026_secure';

  let adminUser;
  let adminToken;

  let officerA;
  let officerAToken;

  let officerB;
  let officerBToken;

  before(async () => {
    await connectDB();

    // Start server on random open port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api/v1`;
        resolve();
      });
    });

    // Clean up any previous test accounts
    await User.deleteMany({ email: /@testrbac\.civic$/ });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('TestPass@123', salt);

    // 1. Provision Admin
    adminUser = await User.create({
      name: 'Super Admin',
      email: 'admin@testrbac.civic',
      passwordHash,
      role: ROLES.ADMIN,
      isActive: true,
    });
    adminToken = jwt.sign(
      { userId: adminUser._id.toString(), role: ROLES.ADMIN },
      secret,
      { expiresIn: '1h' }
    );

    // 2. Provision Officer A (Streets & Sanitation)
    officerA = await User.create({
      name: 'Officer Alice',
      email: 'alice@testrbac.civic',
      passwordHash,
      role: ROLES.OFFICER,
      officerId: 'OFF-ALICE-100',
      department: 'Streets & Sanitation',
      isActive: true,
    });
    officerAToken = jwt.sign(
      { userId: officerA._id.toString(), role: ROLES.OFFICER, officerId: 'OFF-ALICE-100' },
      secret,
      { expiresIn: '1h' }
    );

    // 3. Provision Officer B (Water & Drainage)
    officerB = await User.create({
      name: 'Officer Bob',
      email: 'bob@testrbac.civic',
      passwordHash,
      role: ROLES.OFFICER,
      officerId: 'OFF-BOB-200',
      department: 'Water & Drainage',
      isActive: true,
    });
    officerBToken = jwt.sign(
      { userId: officerB._id.toString(), role: ROLES.OFFICER, officerId: 'OFF-BOB-200' },
      secret,
      { expiresIn: '1h' }
    );
  });

  after(async () => {
    await User.deleteMany({ email: /@testrbac\.civic$/ });
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  });

  // ----------------------------------------------------
  // ADMIN ROUTES PERMISSIONS
  // ----------------------------------------------------
  it('Admin → Admin routes should be ALLOWED (200 OK)', async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.scope, 'GLOBAL_ADMIN');
  });

  it('Officer → Admin routes should be FORBIDDEN (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${officerAToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('not authorized'));
  });

  it('Unauthenticated request to Admin routes should return UNAUTHORIZED (401)', async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`);
    const data = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
  });

  // ----------------------------------------------------
  // OFFICER OWN DASHBOARD & ASSIGNMENTS
  // ----------------------------------------------------
  it('Officer → own dashboard and assignments should be ALLOWED (200 OK)', async () => {
    const res = await fetch(`${baseUrl}/officer/dashboard`, {
      headers: { Authorization: `Bearer ${officerAToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.department, 'Streets & Sanitation');
  });

  it('Officer A → own resource by ID should be ALLOWED (200 OK)', async () => {
    const res = await fetch(`${baseUrl}/officer/assignments/${officerA.officerId}`, {
      headers: { Authorization: `Bearer ${officerAToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.targetOfficerId, 'OFF-ALICE-100');
  });

  it('Officer A → Officer B resources should be FORBIDDEN (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/officer/assignments/${officerB.officerId}`, {
      headers: { Authorization: `Bearer ${officerAToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('not authorized to view or modify another officer'));
  });

  it('Officer A → modifying Officer B verification task should be FORBIDDEN (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/officer/verification/${officerB.officerId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${officerAToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'RESOLVED' }),
    });
    const data = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('not authorized to view or modify another officer'));
  });

  // ----------------------------------------------------
  // DEPARTMENT DATA ISOLATION
  // ----------------------------------------------------
  it('Officer A → own department heatmap should be ALLOWED (200 OK)', async () => {
    const res = await fetch(`${baseUrl}/officer/heatmap`, {
      headers: { Authorization: `Bearer ${officerAToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.department, 'Streets & Sanitation');
  });

  it('Officer A → requesting another department heatmap should be FORBIDDEN (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/officer/heatmap?department=Water%20%26%20Drainage`, {
      headers: { Authorization: `Bearer ${officerAToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('Access restricted to your department'));
  });

  // ----------------------------------------------------
  // ADMIN GLOBAL ACCESS
  // ----------------------------------------------------
  it('Admin → any officer assignment or verification should be ALLOWED (200 OK)', async () => {
    const res = await fetch(`${baseUrl}/officer/assignments/${officerA.officerId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
  });

  it('Admin → any department heatmap should be ALLOWED (200 OK)', async () => {
    const res = await fetch(`${baseUrl}/officer/heatmap?department=Water%20%26%20Drainage`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.department, 'Water & Drainage');
  });
});
