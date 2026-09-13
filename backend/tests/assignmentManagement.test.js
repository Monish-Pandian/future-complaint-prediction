const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/database');
const { User, ROLES } = require('../src/models/User');
const { Officer } = require('../src/models/Officer');
const { Prediction, RISK_LEVELS, VERIFICATION_STATUS } = require('../src/models/Prediction');
const { Assignment, ASSIGNMENT_STATUS } = require('../src/models/Assignment');
const { assignPrediction } = require('../src/services/assignmentService');

describe('Officer Assignment Architecture Module Tests', () => {
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

  let testPredictionA;
  let testPredictionB;

  before(async () => {
    await connectDB();

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api/v1`;
        resolve();
      });
    });

    // Cleanup previous test artifacts
    await User.deleteMany({ email: /@testasgn\.civic$/ });
    await Officer.deleteMany({ employeeCode: /^TEST-ASGN-EMP-/ });
    await Prediction.deleteMany({ predictionId: /^TEST-ASGN-PRED-/ });
    await Assignment.deleteMany({ assignmentId: /^ASGN-/ });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('TestPass@123', salt);

    // 1. Admin
    adminUser = await User.create({
      name: 'Assignment Admin',
      email: 'admin@testasgn.civic',
      passwordHash,
      role: ROLES.ADMIN,
      isActive: true,
    });
    adminToken = jwt.sign(
      { userId: adminUser._id.toString(), role: ROLES.ADMIN },
      secret,
      { expiresIn: '1h' }
    );

    // 2. Officer A (Streets & Sanitation)
    officerAUser = await User.create({
      name: 'Officer Sanitation Expert',
      email: 'sanitation@testasgn.civic',
      passwordHash,
      role: ROLES.OFFICER,
      officerId: 'TEST-ASGN-OFF-A',
      department: 'Streets & Sanitation',
      isActive: true,
    });
    officerADoc = await Officer.create({
      officerId: 'TEST-ASGN-OFF-A',
      userId: officerAUser._id,
      employeeCode: 'TEST-ASGN-EMP-A',
      name: 'Officer Sanitation Expert',
      department: 'Streets & Sanitation',
      location: { type: 'Point', coordinates: [77.594, 12.971] },
      availability: 'AVAILABLE',
      currentWorkload: 0,
      active: true,
    });
    officerAToken = jwt.sign(
      { userId: officerAUser._id.toString(), role: ROLES.OFFICER, officerId: 'TEST-ASGN-OFF-A' },
      secret,
      { expiresIn: '1h' }
    );

    // 3. Officer B (Water)
    officerBUser = await User.create({
      name: 'Officer Water Specialist',
      email: 'water@testasgn.civic',
      passwordHash,
      role: ROLES.OFFICER,
      officerId: 'TEST-ASGN-OFF-B',
      department: 'Water',
      isActive: true,
    });
    officerBDoc = await Officer.create({
      officerId: 'TEST-ASGN-OFF-B',
      userId: officerBUser._id,
      employeeCode: 'TEST-ASGN-EMP-B',
      name: 'Officer Water Specialist',
      department: 'Water',
      location: { type: 'Point', coordinates: [77.58, 12.99] },
      availability: 'AVAILABLE',
      currentWorkload: 0,
      active: true,
    });
    officerBToken = jwt.sign(
      { userId: officerBUser._id.toString(), role: ROLES.OFFICER, officerId: 'TEST-ASGN-OFF-B' },
      secret,
      { expiresIn: '1h' }
    );

    // 4. Test predictions
    testPredictionA = await Prediction.create({
      predictionId: 'TEST-ASGN-PRED-001',
      complaintType: 'Road Damage & Pothole Wave',
      department: 'Streets & Sanitation',
      communityArea: 'Downtown Central',
      ward: 'Ward 1',
      location: { type: 'Point', coordinates: [77.595, 12.972] },
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      probability: 0.91,
      riskScore: 88.0,
      riskLevel: RISK_LEVELS.HIGH,
      verificationStatus: VERIFICATION_STATUS.UNASSIGNED,
    });

    testPredictionB = await Prediction.create({
      predictionId: 'TEST-ASGN-PRED-002',
      complaintType: 'Mainline Pipeline Burst Risk',
      department: 'Water',
      communityArea: 'North Hills',
      ward: 'Ward 5',
      location: { type: 'Point', coordinates: [77.581, 12.991] },
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      probability: 0.86,
      riskScore: 84.0,
      riskLevel: RISK_LEVELS.HIGH,
      verificationStatus: VERIFICATION_STATUS.UNASSIGNED,
    });
  });

  after(async () => {
    await User.deleteMany({ email: /@testasgn\.civic$/ });
    await Officer.deleteMany({ employeeCode: /^TEST-ASGN-EMP-/ });
    await Prediction.deleteMany({ predictionId: /^TEST-ASGN-PRED-/ });
    await Assignment.deleteMany({ assignmentId: /^ASGN-/ });
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  });

  // ----------------------------------------------------
  // AUTOMATED ASSIGNMENT SERVICE TESTS
  // ----------------------------------------------------
  it('assignPrediction should automatically match optimal officer by department, distance, and workload', async () => {
    const assignment = await assignPrediction(testPredictionA._id);

    assert.ok(assignment);
    assert.strictEqual(assignment.status, ASSIGNMENT_STATUS.AI_ASSIGNED);
    assert.strictEqual(assignment.department, 'Streets & Sanitation');
    assert.strictEqual(assignment.departmentMatch, true);
    assert.strictEqual(typeof assignment.distanceKm, 'number');
    assert.strictEqual(typeof assignment.estimatedTravelMinutes, 'number');
    assert.strictEqual(typeof assignment.assignmentScore, 'number');
    assert.ok(assignment.reasoning.includes('DEMO/MOCK DECISION ENGINE'));
    assert.ok(assignment.officerId);
    assert.strictEqual(assignment.officerId.department, 'Streets & Sanitation');

    // Verify Prediction record update
    const updatedPrediction = await Prediction.findById(testPredictionA._id);
    assert.strictEqual(updatedPrediction.verificationStatus, VERIFICATION_STATUS.ASSIGNED);
    assert.ok(updatedPrediction.assignedOfficer);

    // Verify Officer workload increment on assigned officer
    const officerIdToFind = assignment.officerId?._id || assignment.officerId?.id || assignment.officerId;
    const assignedOfficerDoc = await Officer.findById(officerIdToFind);
    assert.ok(assignedOfficerDoc);
    assert.strictEqual(typeof assignedOfficerDoc.currentWorkload, 'number');
  });

  // ----------------------------------------------------
  // ADMIN API TESTS
  // ----------------------------------------------------
  it('Admin can monitor all AI-generated assignments with pagination & filters', async () => {
    const res = await fetch(`${baseUrl}/admin/assignments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data.assignments));
    assert.ok(data.data.pagination);
    assert.strictEqual(data.data.pagination.page, 1);
  });

  it('Admin can trigger automated assignment on an unassigned predicted problem', async () => {
    const res = await fetch(
      `${baseUrl}/admin/assignments/auto-assign/${testPredictionB._id}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.assignment.department, 'Water');

    const officerId =
      data.data.assignment.officerId?.id ||
      data.data.assignment.officerId?._id ||
      data.data.assignment.officerId;
    assert.strictEqual(officerId.toString(), officerBDoc._id.toString());
    assert.strictEqual(data.data.assignment.status, ASSIGNMENT_STATUS.AI_ASSIGNED);
  });

  it('Admin can retrieve single assignment by ID', async () => {
    const activeAssignment = await Assignment.findOne({ predictionId: testPredictionA._id });

    const res = await fetch(`${baseUrl}/admin/assignments/${activeAssignment._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.assignment.department, 'Streets & Sanitation');
    assert.ok(data.data.assignment.officerId.name);
  });

  // ----------------------------------------------------
  // OFFICER ISOLATION & ACCESS TESTS
  // ----------------------------------------------------
  it('Officer A receives ONLY their assignments', async () => {
    const res = await fetch(`${baseUrl}/officer/assignments`, {
      headers: { Authorization: `Bearer ${officerAToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    for (const asgn of data.data.assignments) {
      const officerId = asgn.officerId?.id || asgn.officerId?._id || asgn.officerId;
      assert.strictEqual(officerId.toString(), officerADoc._id.toString());
    }
  });

  it('Officer B receives ONLY their assignments', async () => {
    const res = await fetch(`${baseUrl}/officer/assignments`, {
      headers: { Authorization: `Bearer ${officerBToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    for (const asgn of data.data.assignments) {
      const officerId = asgn.officerId?.id || asgn.officerId?._id || asgn.officerId;
      assert.strictEqual(officerId.toString(), officerBDoc._id.toString());
    }
  });

  it('Officer A accessing Officer B assignment by ID receives 403 Forbidden', async () => {
    const assignmentB = await Assignment.findOne({ predictionId: testPredictionB._id });

    const res = await fetch(`${baseUrl}/officer/assignments/${assignmentB._id}`, {
      headers: { Authorization: `Bearer ${officerAToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('not authorized to view another officer'));
  });

  // ----------------------------------------------------
  // SECURITY & RBAC TESTS
  // ----------------------------------------------------
  it('Officer accessing Admin Assignments endpoint receives 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/admin/assignments`, {
      headers: { Authorization: `Bearer ${officerAToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('not authorized'));
  });

  it('Unauthenticated request receives 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/admin/assignments`);
    const data = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
  });
});
