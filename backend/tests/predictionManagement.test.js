const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/database');
const { User, ROLES } = require('../src/models/User');
const { Officer } = require('../src/models/Officer');
const { Prediction, RISK_LEVELS, VERIFICATION_STATUS } = require('../src/models/Prediction');

describe('Prediction Management Module Tests (Predicted Problems)', () => {
  let server;
  let baseUrl;
  const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_civic_forecasting_2026_secure';

  let adminUser;
  let adminToken;

  let officerAUser;
  let officerADoc;
  let officerAToken;

  let officerBUser;
  let officerBDoc;
  let officerBToken;

  let predAssignedToA;
  let predAssignedToB;
  let predUnassigned;

  before(async () => {
    await connectDB();

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api/v1`;
        resolve();
      });
    });

    // Cleanup previous test data
    await User.deleteMany({ email: /@testpred\.civic$/ });
    await Officer.deleteMany({ employeeCode: /^TEST-PRED-EMP-/ });
    await Prediction.deleteMany({ predictionId: /^TEST-PRED-/ });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('TestPass@123', salt);

    // 1. Admin
    adminUser = await User.create({
      name: 'Prediction Admin',
      email: 'admin@testpred.civic',
      passwordHash,
      role: ROLES.ADMIN,
      isActive: true,
    });
    adminToken = jwt.sign(
      { userId: adminUser._id.toString(), role: ROLES.ADMIN },
      secret,
      { expiresIn: '1h' }
    );

    // 2. Officer A
    officerAUser = await User.create({
      name: 'Officer Alpha',
      email: 'alpha@testpred.civic',
      passwordHash,
      role: ROLES.OFFICER,
      officerId: 'TEST-PRED-OFF-A',
      department: 'Streets & Sanitation',
      isActive: true,
    });
    officerADoc = await Officer.create({
      officerId: 'TEST-PRED-OFF-A',
      userId: officerAUser._id,
      employeeCode: 'TEST-PRED-EMP-A',
      name: 'Officer Alpha',
      department: 'Streets & Sanitation',
    });
    officerAToken = jwt.sign(
      { userId: officerAUser._id.toString(), role: ROLES.OFFICER, officerId: 'TEST-PRED-OFF-A' },
      secret,
      { expiresIn: '1h' }
    );

    // 3. Officer B
    officerBUser = await User.create({
      name: 'Officer Beta',
      email: 'beta@testpred.civic',
      passwordHash,
      role: ROLES.OFFICER,
      officerId: 'TEST-PRED-OFF-B',
      department: 'Water',
      isActive: true,
    });
    officerBDoc = await Officer.create({
      officerId: 'TEST-PRED-OFF-B',
      userId: officerBUser._id,
      employeeCode: 'TEST-PRED-EMP-B',
      name: 'Officer Beta',
      department: 'Water',
    });
    officerBToken = jwt.sign(
      { userId: officerBUser._id.toString(), role: ROLES.OFFICER, officerId: 'TEST-PRED-OFF-B' },
      secret,
      { expiresIn: '1h' }
    );

    // 4. Seed test predicted problems
    predAssignedToA = await Prediction.create({
      predictionId: 'TEST-PRED-001',
      complaintType: 'Pothole Cluster',
      department: 'Streets & Sanitation',
      communityArea: 'Downtown',
      ward: 'Ward 1',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] },
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      probability: 0.95,
      riskScore: 92.5,
      riskLevel: RISK_LEVELS.CRITICAL,
      verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      assignedOfficer: officerADoc._id,
    });

    predAssignedToB = await Prediction.create({
      predictionId: 'TEST-PRED-002',
      complaintType: 'Water Leakage Risk',
      department: 'Water',
      communityArea: 'North Bay',
      ward: 'Ward 3',
      location: { type: 'Point', coordinates: [77.58, 12.99] },
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      probability: 0.78,
      riskScore: 75.0,
      riskLevel: RISK_LEVELS.HIGH,
      verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      assignedOfficer: officerBDoc._id,
    });

    predUnassigned = await Prediction.create({
      predictionId: 'TEST-PRED-003',
      complaintType: 'Streetlight Outage',
      department: 'Electricity',
      communityArea: 'Westside',
      ward: 'Ward 9',
      location: { type: 'Point', coordinates: [77.55, 12.96] },
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      probability: 0.45,
      riskScore: 40.0,
      riskLevel: RISK_LEVELS.LOW,
      verificationStatus: VERIFICATION_STATUS.UNASSIGNED,
      assignedOfficer: null,
    });
  });

  after(async () => {
    await User.deleteMany({ email: /@testpred\.civic$/ });
    await Officer.deleteMany({ employeeCode: /^TEST-PRED-EMP-/ });
    await Prediction.deleteMany({ predictionId: /^TEST-PRED-/ });
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  });

  // ----------------------------------------------------
  // ADMIN API TESTS
  // ----------------------------------------------------
  it('Admin can view ALL predicted problems with pagination metadata', async () => {
    const res = await fetch(`${baseUrl}/admin/predictions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.predictions.length >= 3);
    assert.ok(data.data.pagination);
    assert.strictEqual(data.data.pagination.page, 1);
  });

  it('Admin can filter predicted problems by department and riskLevel', async () => {
    const res = await fetch(
      `${baseUrl}/admin/predictions?department=Streets%20%26%20Sanitation&riskLevel=CRITICAL`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.predictions.length >= 1);
    // All returned items must match the filtered criteria
    for (const pred of data.data.predictions) {
      assert.strictEqual(pred.department, 'Streets & Sanitation');
      assert.strictEqual(pred.riskLevel, 'CRITICAL');
    }
    assert.ok(
      data.data.predictions.some((p) => p.predictionId === 'TEST-PRED-001'),
      'Should contain TEST-PRED-001'
    );
  });

  it('Admin can filter by verificationStatus, communityArea, and ward', async () => {
    const res = await fetch(
      `${baseUrl}/admin/predictions?verificationStatus=UNASSIGNED&ward=Ward%209`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.predictions.length, 1);
    assert.strictEqual(data.data.predictions[0].predictionId, 'TEST-PRED-003');
  });

  it('Admin can get single predicted problem by ID with populated assigned officer', async () => {
    const res = await fetch(`${baseUrl}/admin/predictions/${predAssignedToA._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.prediction.predictionId, 'TEST-PRED-001');
    assert.strictEqual(data.data.prediction.assignedOfficer.name, 'Officer Alpha');
    assert.strictEqual(data.data.prediction.probability, 0.95);
    assert.strictEqual(data.data.prediction.riskScore, 92.5);
  });

  it('Admin can create/ingest a new predicted problem', async () => {
    const res = await fetch(`${baseUrl}/admin/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        predictionId: 'TEST-PRED-004',
        complaintType: 'Traffic Bottleneck Spike',
        department: 'Traffic',
        communityArea: 'South Square',
        ward: 'Ward 11',
        location: { type: 'Point', coordinates: [77.6, 12.92] },
        predictionWindowStart: new Date(),
        predictionWindowEnd: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        probability: 0.84,
        riskScore: 80.0,
        riskLevel: 'HIGH',
      }),
    });
    const data = await res.json();

    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.prediction.predictionId, 'TEST-PRED-004');
    assert.strictEqual(data.data.prediction.riskLevel, 'HIGH');
  });

  // ----------------------------------------------------
  // OFFICER ISOLATION & ACCESS TESTS
  // ----------------------------------------------------
  it('Officer Alpha can see ONLY predicted problems assigned to Officer Alpha', async () => {
    const res = await fetch(`${baseUrl}/officer/predictions`, {
      headers: { Authorization: `Bearer ${officerAToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    // Officer Alpha has exactly 1 test prediction assigned
    assert.strictEqual(data.data.predictions.length, 1);
    assert.strictEqual(data.data.predictions[0].predictionId, 'TEST-PRED-001');
    assert.strictEqual(data.data.predictions[0].complaintType, 'Pothole Cluster');
  });

  it('Officer Beta can see ONLY predicted problems assigned to Officer Beta', async () => {
    const res = await fetch(`${baseUrl}/officer/predictions`, {
      headers: { Authorization: `Bearer ${officerBToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.predictions.length, 1);
    assert.strictEqual(data.data.predictions[0].predictionId, 'TEST-PRED-002');
    assert.strictEqual(data.data.predictions[0].complaintType, 'Water Leakage Risk');
  });

  it('Officer Alpha can view single assigned predicted problem by ID', async () => {
    const res = await fetch(`${baseUrl}/officer/predictions/${predAssignedToA._id}`, {
      headers: { Authorization: `Bearer ${officerAToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.prediction.predictionId, 'TEST-PRED-001');
  });

  it('Officer Alpha accessing Officer Beta predicted problem is FORBIDDEN (403)', async () => {
    const res = await fetch(`${baseUrl}/officer/predictions/${predAssignedToB._id}`, {
      headers: { Authorization: `Bearer ${officerAToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('only authorized to view predicted problems assigned to you'));
  });

  // ----------------------------------------------------
  // SECURITY & RBAC TESTS
  // ----------------------------------------------------
  it('Officer accessing Admin Predictions endpoint receives 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/admin/predictions`, {
      headers: { Authorization: `Bearer ${officerAToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('not authorized'));
  });

  it('Unauthenticated request to predictions receives 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/admin/predictions`);
    const data = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
  });
});
