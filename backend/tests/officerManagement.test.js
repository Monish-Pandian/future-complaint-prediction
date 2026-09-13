const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/database');
const { User, ROLES } = require('../src/models/User');
const { Officer, AVAILABILITY_STATUS } = require('../src/models/Officer');

describe('Admin Officer Management Module Tests', () => {
  let server;
  let baseUrl;
  const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_civic_forecasting_2026_secure';

  let adminUser;
  let adminToken;
  let regularOfficer;
  let officerToken;

  before(async () => {
    await connectDB();

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api/v1`;
        resolve();
      });
    });

    // Clean up test data
    await User.deleteMany({ email: /@testmgmt\.civic$/ });
    await Officer.deleteMany({ employeeCode: /^TEST-EMP-/ });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('AdminPass@123', salt);

    // Create Admin user
    adminUser = await User.create({
      name: 'Mgmt Admin',
      email: 'admin@testmgmt.civic',
      passwordHash,
      role: ROLES.ADMIN,
      isActive: true,
    });
    adminToken = jwt.sign(
      { userId: adminUser._id.toString(), role: ROLES.ADMIN },
      secret,
      { expiresIn: '1h' }
    );

    // Create Regular Officer user
    regularOfficer = await User.create({
      name: 'Regular Officer',
      email: 'officer@testmgmt.civic',
      passwordHash,
      role: ROLES.OFFICER,
      officerId: 'TEST-OFF-REG',
      department: 'Traffic',
      isActive: true,
    });
    officerToken = jwt.sign(
      { userId: regularOfficer._id.toString(), role: ROLES.OFFICER },
      secret,
      { expiresIn: '1h' }
    );
  });

  after(async () => {
    await User.deleteMany({ email: /@testmgmt\.civic$/ });
    await Officer.deleteMany({ employeeCode: /^TEST-EMP-/ });
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  });

  beforeEach(async () => {
    await Officer.deleteMany({ employeeCode: /^TEST-EMP-/ });
  });

  // ----------------------------------------------------
  // CREATE OFFICER TESTS
  // ----------------------------------------------------
  it('Admin should successfully create a new officer with GeoJSON location [lng, lat]', async () => {
    const payload = {
      officerId: 'TEST-OFF-101',
      employeeCode: 'TEST-EMP-101',
      name: 'Officer Michael Scott',
      department: 'Streets & Sanitation',
      phone: '+1-555-0199',
      skills: ['Pothole Repair', 'Asphalt Laying'],
      availability: 'AVAILABLE',
      currentWorkload: 2,
      location: {
        type: 'Point',
        coordinates: [77.5946, 12.9716], // [longitude, latitude]
      },
    };

    const res = await fetch(`${baseUrl}/admin/officers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.officer.name, 'Officer Michael Scott');
    assert.strictEqual(data.data.officer.department, 'Streets & Sanitation');
    assert.strictEqual(data.data.officer.currentWorkload, 2);
    assert.deepStrictEqual(data.data.officer.location.coordinates, [77.5946, 12.9716]);
    assert.strictEqual(data.data.officer.active, true);
  });

  it('Admin should fail to create officer with duplicate employee code', async () => {
    const payload = {
      officerId: 'TEST-OFF-102',
      employeeCode: 'TEST-EMP-102',
      name: 'Officer Pam Beesly',
      department: 'Municipal',
    };

    // First creation
    await fetch(`${baseUrl}/admin/officers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Duplicate creation attempt
    const res = await fetch(`${baseUrl}/admin/officers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        officerId: 'TEST-OFF-102-DIFF',
      }),
    });

    const data = await res.json();

    assert.ok(res.status === 400 || res.status === 409);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('already registered'));
  });

  it('Admin should fail to create officer with invalid GeoJSON coordinates', async () => {
    const res = await fetch(`${baseUrl}/admin/officers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        officerId: 'TEST-OFF-103',
        employeeCode: 'TEST-EMP-103',
        name: 'Officer Jim Halpert',
        department: 'Electricity',
        location: {
          type: 'Point',
          coordinates: [200, 95], // Invalid: lng > 180, lat > 90
        },
      }),
    });

    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
  });

  // ----------------------------------------------------
  // LIST & FILTER TESTS
  // ----------------------------------------------------
  it('Admin should list officers with filtering, search and pagination', async () => {
    // Clean prior test officers
    await Officer.deleteMany({ employeeCode: /^TEST-EMP-/ });

    // Seed 3 test officers
    await Officer.create([
      {
        officerId: 'TEST-OFF-A',
        employeeCode: 'TEST-EMP-A',
        name: 'Alice Johnson',
        department: 'Water',
        availability: 'AVAILABLE',
        active: true,
        currentWorkload: 1,
      },
      {
        officerId: 'TEST-OFF-B',
        employeeCode: 'TEST-EMP-B',
        name: 'Bob Smith',
        department: 'Electricity',
        availability: 'BUSY',
        active: true,
        currentWorkload: 5,
      },
      {
        officerId: 'TEST-OFF-C',
        employeeCode: 'TEST-EMP-C',
        name: 'Charlie Davis',
        department: 'Water',
        availability: 'OFF_DUTY',
        active: false,
        currentWorkload: 0,
      },
    ]);

    // Test 1: Department filter
    const deptRes = await fetch(`${baseUrl}/admin/officers?department=Water`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deptData = await deptRes.json();
    assert.strictEqual(deptRes.status, 200);
    assert.strictEqual(deptData.data.officers.length, 2);

    // Test 2: Availability filter
    const availRes = await fetch(`${baseUrl}/admin/officers?availability=BUSY`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const availData = await availRes.json();
    assert.strictEqual(availRes.status, 200);
    assert.strictEqual(availData.data.officers.length, 1);
    assert.strictEqual(availData.data.officers[0].employeeCode, 'TEST-EMP-B');

    // Test 3: Search filter
    const searchRes = await fetch(`${baseUrl}/admin/officers?search=Alice`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const searchData = await searchRes.json();
    assert.strictEqual(searchRes.status, 200);
    assert.strictEqual(searchData.data.officers.length, 1);
    assert.strictEqual(searchData.data.officers[0].name, 'Alice Johnson');

    // Test 4: Pagination metadata
    assert.ok(deptData.data.pagination);
    assert.strictEqual(typeof deptData.data.pagination.total, 'number');
    assert.strictEqual(deptData.data.pagination.page, 1);
  });

  // ----------------------------------------------------
  // GET BY ID & UPDATE TESTS
  // ----------------------------------------------------
  it('Admin should get officer by ID and update details', async () => {
    const officer = await Officer.create({
      officerId: 'TEST-OFF-UP',
      employeeCode: 'TEST-EMP-UP',
      name: 'Dwight Schrute',
      department: 'Streets & Sanitation',
      phone: '+1-555-0999',
      currentWorkload: 3,
    });

    // 1. Get by ID
    const getRes = await fetch(`${baseUrl}/admin/officers/${officer._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getData = await getRes.json();
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getData.data.officer.name, 'Dwight Schrute');

    // 2. Patch details
    const patchRes = await fetch(`${baseUrl}/admin/officers/${officer._id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        department: 'Police',
        phone: '+1-555-8888',
        currentWorkload: 1,
        skills: ['Crisis Management'],
      }),
    });
    const patchData = await patchRes.json();

    assert.strictEqual(patchRes.status, 200);
    assert.strictEqual(patchData.data.officer.department, 'Police');
    assert.strictEqual(patchData.data.officer.phone, '+1-555-8888');
    assert.strictEqual(patchData.data.officer.currentWorkload, 1);
    assert.deepStrictEqual(patchData.data.officer.skills, ['Crisis Management']);
  });

  // ----------------------------------------------------
  // STATUS & SOFT DEACTIVATION TESTS
  // ----------------------------------------------------
  it('Admin should deactivate (soft delete) and reactivate an officer', async () => {
    const officer = await Officer.create({
      officerId: 'TEST-OFF-STATUS',
      employeeCode: 'TEST-EMP-STATUS',
      name: 'Stanley Hudson',
      department: 'Traffic',
      active: true,
      availability: 'AVAILABLE',
    });

    // 1. Status update to deactivated
    const deactRes = await fetch(`${baseUrl}/admin/officers/${officer._id}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        active: false,
        availability: 'OFF_DUTY',
      }),
    });
    const deactData = await deactRes.json();

    assert.strictEqual(deactRes.status, 200);
    assert.strictEqual(deactData.data.officer.active, false);
    assert.strictEqual(deactData.data.officer.availability, 'OFF_DUTY');

    // 2. Reactivate
    const reactRes = await fetch(`${baseUrl}/admin/officers/${officer._id}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        active: true,
        availability: 'AVAILABLE',
      }),
    });
    const reactData = await reactRes.json();

    assert.strictEqual(reactRes.status, 200);
    assert.strictEqual(reactData.data.officer.active, true);
    assert.strictEqual(reactData.data.officer.availability, 'AVAILABLE');

    // 3. DELETE endpoint soft deactivation
    const delRes = await fetch(`${baseUrl}/admin/officers/${officer._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const delData = await delRes.json();

    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delData.data.officer.active, false);
    assert.strictEqual(delData.data.deleted, false); // soft delete
  });

  // ----------------------------------------------------
  // SECURITY & RBAC TESTS
  // ----------------------------------------------------
  it('Regular OFFICER should receive 403 Forbidden on officer management routes', async () => {
    const res = await fetch(`${baseUrl}/admin/officers`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('not authorized'));
  });

  it('Unauthenticated request should receive 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/admin/officers`);
    const data = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
  });
});
