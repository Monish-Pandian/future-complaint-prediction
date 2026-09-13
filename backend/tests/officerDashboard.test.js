const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/database');
const { User, ROLES } = require('../src/models/User');
const { Officer, AVAILABILITY_STATUS } = require('../src/models/Officer');
const { Prediction, RISK_LEVELS, VERIFICATION_STATUS } = require('../src/models/Prediction');
const { Assignment, ASSIGNMENT_STATUS } = require('../src/models/Assignment');

describe('Officer Dashboard API Module Tests', () => {
  let server;
  let baseUrl;
  const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_civic_forecasting_2026_secure';

  let officerAUser;
  let officerADoc;
  let officerAToken;

  let officerBUser;
  let officerBDoc;
  let officerBToken;

  let predA1;
  let predA2;
  let predA3;
  let predB1;

  let asgnA1;
  let asgnA2;
  let asgnA3;
  let asgnB1;

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
    await User.deleteMany({ email: /@testdash\.civic$/ });
    await Officer.deleteMany({ employeeCode: /^TEST-DASH-EMP-/ });
    await Prediction.deleteMany({ predictionId: /^TEST-DASH-PRED-/ });
    await Assignment.deleteMany({ assignmentId: /^ASGN-DASH-/ });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('TestPass@123', salt);

    // 1. Officer A (Streets & Sanitation)
    officerAUser = await User.create({
      name: 'Officer Sanitation Lead',
      email: 'sanitation.lead@testdash.civic',
      passwordHash,
      role: ROLES.OFFICER,
      officerId: 'TEST-DASH-OFF-A',
      department: 'Streets & Sanitation',
      isActive: true,
    });
    officerADoc = await Officer.create({
      officerId: 'TEST-DASH-OFF-A',
      userId: officerAUser._id,
      employeeCode: 'TEST-DASH-EMP-A',
      name: 'Officer Sanitation Lead',
      department: 'Streets & Sanitation',
      location: { type: 'Point', coordinates: [77.594, 12.971] },
      availability: AVAILABILITY_STATUS.AVAILABLE,
      currentWorkload: 2,
      active: true,
    });
    officerAToken = jwt.sign(
      { userId: officerAUser._id.toString(), role: ROLES.OFFICER, officerId: 'TEST-DASH-OFF-A' },
      secret,
      { expiresIn: '1h' }
    );

    // 2. Officer B (Water & Drainage)
    officerBUser = await User.create({
      name: 'Officer Water Lead',
      email: 'water.lead@testdash.civic',
      passwordHash,
      role: ROLES.OFFICER,
      officerId: 'TEST-DASH-OFF-B',
      department: 'Water & Drainage',
      isActive: true,
    });
    officerBDoc = await Officer.create({
      officerId: 'TEST-DASH-OFF-B',
      userId: officerBUser._id,
      employeeCode: 'TEST-DASH-EMP-B',
      name: 'Officer Water Lead',
      department: 'Water & Drainage',
      location: { type: 'Point', coordinates: [77.58, 12.99] },
      availability: AVAILABILITY_STATUS.AVAILABLE,
      currentWorkload: 1,
      active: true,
    });
    officerBToken = jwt.sign(
      { userId: officerBUser._id.toString(), role: ROLES.OFFICER, officerId: 'TEST-DASH-OFF-B' },
      secret,
      { expiresIn: '1h' }
    );

    // 3. Officer A's Predictions
    // Pred A1: HIGH risk, Pending verification (AI_ASSIGNED)
    predA1 = await Prediction.create({
      predictionId: 'TEST-DASH-PRED-A1',
      complaintType: 'Major Road Pothole Surge',
      department: 'Streets & Sanitation',
      communityArea: 'Downtown Central',
      ward: 'Ward 1',
      location: { type: 'Point', coordinates: [77.595, 12.972] },
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      probability: 0.94,
      riskScore: 92.0,
      riskLevel: RISK_LEVELS.HIGH,
      verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      assignedOfficer: officerADoc._id,
    });
    asgnA1 = await Assignment.create({
      assignmentId: 'ASGN-DASH-A1',
      predictionId: predA1._id,
      officerId: officerADoc._id,
      department: 'Streets & Sanitation',
      distanceKm: 1.2,
      estimatedTravelMinutes: 8,
      status: ASSIGNMENT_STATUS.AI_ASSIGNED,
      reasoning: 'Automated test decision assignment for Pred A1',
      assignedAt: new Date(),
    });

    // Pred A2: CRITICAL risk, Confirmed today (COMPLETED)
    predA2 = await Prediction.create({
      predictionId: 'TEST-DASH-PRED-A2',
      complaintType: 'Garbage Dump Overflow',
      department: 'Streets & Sanitation',
      communityArea: 'North District',
      ward: 'Ward 4',
      location: { type: 'Point', coordinates: [77.596, 12.975] },
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      probability: 0.98,
      riskScore: 96.0,
      riskLevel: RISK_LEVELS.CRITICAL,
      verificationStatus: VERIFICATION_STATUS.VERIFIED_TRUE,
      assignedOfficer: officerADoc._id,
    });
    asgnA2 = await Assignment.create({
      assignmentId: 'ASGN-DASH-A2',
      predictionId: predA2._id,
      officerId: officerADoc._id,
      department: 'Streets & Sanitation',
      distanceKm: 2.1,
      estimatedTravelMinutes: 12,
      status: ASSIGNMENT_STATUS.COMPLETED,
      reasoning: 'Automated test decision assignment for Pred A2',
      assignedAt: new Date(Date.now() - 3600000),
      completedAt: new Date(),
    });

    // Pred A3: MEDIUM risk, Not Found (REJECTED / VERIFIED_FALSE)
    predA3 = await Prediction.create({
      predictionId: 'TEST-DASH-PRED-A3',
      complaintType: 'Sidewalk Obstruction',
      department: 'Streets & Sanitation',
      communityArea: 'South District',
      ward: 'Ward 7',
      location: { type: 'Point', coordinates: [77.591, 12.968] },
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      probability: 0.65,
      riskScore: 60.0,
      riskLevel: RISK_LEVELS.MEDIUM,
      verificationStatus: VERIFICATION_STATUS.VERIFIED_FALSE,
      assignedOfficer: officerADoc._id,
    });
    asgnA3 = await Assignment.create({
      assignmentId: 'ASGN-DASH-A3',
      predictionId: predA3._id,
      officerId: officerADoc._id,
      department: 'Streets & Sanitation',
      distanceKm: 3.5,
      estimatedTravelMinutes: 18,
      status: ASSIGNMENT_STATUS.REJECTED,
      reasoning: 'Automated test decision assignment for Pred A3',
      assignedAt: new Date(Date.now() - 7200000),
    });

    // 4. Officer B's Prediction (Water & Drainage)
    predB1 = await Prediction.create({
      predictionId: 'TEST-DASH-PRED-B1',
      complaintType: 'Mainline Pipeline Fracture',
      department: 'Water & Drainage',
      communityArea: 'Lakeside Sector',
      ward: 'Ward 9',
      location: { type: 'Point', coordinates: [77.581, 12.992] },
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      probability: 0.88,
      riskScore: 85.0,
      riskLevel: RISK_LEVELS.HIGH,
      verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      assignedOfficer: officerBDoc._id,
    });
    asgnB1 = await Assignment.create({
      assignmentId: 'ASGN-DASH-B1',
      predictionId: predB1._id,
      officerId: officerBDoc._id,
      department: 'Water & Drainage',
      distanceKm: 1.8,
      estimatedTravelMinutes: 10,
      status: ASSIGNMENT_STATUS.AI_ASSIGNED,
      reasoning: 'Automated test decision assignment for Pred B1',
      assignedAt: new Date(),
    });
  });

  after(async () => {
    await User.deleteMany({ email: /@testdash\.civic$/ });
    await Officer.deleteMany({ employeeCode: /^TEST-DASH-EMP-/ });
    await Prediction.deleteMany({ predictionId: /^TEST-DASH-PRED-/ });
    await Assignment.deleteMany({ assignmentId: /^ASGN-DASH-/ });
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  });

  // ----------------------------------------------------
  // AUTHENTICATION & ACCESS
  // ----------------------------------------------------
  it('GET /api/v1/officer/dashboard requires authentication (401 Unauthorized)', async () => {
    const res = await fetch(`${baseUrl}/officer/dashboard`);
    const data = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
  });

  // ----------------------------------------------------
  // DEPARTMENT ISOLATION & DETERMINATION
  // ----------------------------------------------------
  it('Officer dashboard department is determined strictly from authenticated officer profile', async () => {
    // Attempting to forge department in query parameter must be ignored
    const res = await fetch(`${baseUrl}/officer/dashboard?department=Water%20%26%20Drainage`, {
      headers: { Authorization: `Bearer ${officerAToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.department, 'Streets & Sanitation');
    assert.strictEqual(data.data.officer.department, 'Streets & Sanitation');
    assert.strictEqual(data.data.officer.employeeCode, 'TEST-DASH-EMP-A');
  });

  // ----------------------------------------------------
  // METRICS COMPUTATION
  // ----------------------------------------------------
  it('Officer A dashboard returns accurate isolated metrics', async () => {
    const res = await fetch(`${baseUrl}/officer/dashboard`, {
      headers: { Authorization: `Bearer ${officerAToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);

    const metrics = data.data.metrics;
    assert.ok(metrics);
    assert.strictEqual(metrics.assignedPredictions, 3);
    assert.strictEqual(metrics.pendingVerification, 1); // asgnA1 (AI_ASSIGNED)
    assert.strictEqual(metrics.verifiedToday, 2); // asgnA2 (COMPLETED) + asgnA3 (VERIFIED_FALSE)
    assert.strictEqual(metrics.highRiskPredictions, 2); // predA1 (HIGH) + predA2 (CRITICAL)
    assert.strictEqual(metrics.confirmedProblems, 1); // predA2 (VERIFIED_TRUE / COMPLETED)
    assert.strictEqual(metrics.notFoundProblems, 1); // predA3 (VERIFIED_FALSE / REJECTED)
  });

  it('Officer B dashboard returns accurate isolated metrics for Water & Drainage', async () => {
    const res = await fetch(`${baseUrl}/officer/dashboard`, {
      headers: { Authorization: `Bearer ${officerBToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.department, 'Water & Drainage');

    const metrics = data.data.metrics;
    assert.ok(metrics);
    assert.strictEqual(metrics.assignedPredictions, 1);
    assert.strictEqual(metrics.pendingVerification, 1); // asgnB1 (AI_ASSIGNED)
    assert.strictEqual(metrics.verifiedToday, 0);
    assert.strictEqual(metrics.highRiskPredictions, 1); // predB1 (HIGH)
    assert.strictEqual(metrics.confirmedProblems, 0);
    assert.strictEqual(metrics.notFoundProblems, 0);
  });

  // ----------------------------------------------------
  // MY ASSIGNMENTS FORMAT & ISOLATION
  // ----------------------------------------------------
  it('Officer A dashboard returns only Officer A assignments with required schema fields', async () => {
    const res = await fetch(`${baseUrl}/officer/dashboard`, {
      headers: { Authorization: `Bearer ${officerAToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);

    const myAssignments = data.data.myAssignments;
    assert.ok(Array.isArray(myAssignments));
    assert.strictEqual(myAssignments.length, 3);

    const predIds = myAssignments.map((a) => a.predictionId);
    assert.ok(predIds.includes('TEST-DASH-PRED-A1'));
    assert.ok(predIds.includes('TEST-DASH-PRED-A2'));
    assert.ok(predIds.includes('TEST-DASH-PRED-A3'));
    assert.ok(!predIds.includes('TEST-DASH-PRED-B1')); // Officer B prediction excluded

    // Verify schema fields for each item
    for (const item of myAssignments) {
      assert.ok(item.predictionId);
      assert.ok(item.complaintType);
      assert.ok(item.communityArea);
      assert.ok(item.ward);
      assert.strictEqual(typeof item.riskScore, 'number');
      assert.ok(item.riskLevel);
      assert.strictEqual(typeof item.distanceKm, 'number');
      assert.ok(item.status);
      assert.ok(item.predictionWindow);
      assert.ok(item.predictionWindow.start);
      assert.ok(item.location);
      assert.strictEqual(item.location.type, 'Point');
      assert.ok(Array.isArray(item.location.coordinates));
    }
  });

  it('Officer B dashboard returns only Officer B assignments', async () => {
    const res = await fetch(`${baseUrl}/officer/dashboard`, {
      headers: { Authorization: `Bearer ${officerBToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);

    const myAssignments = data.data.myAssignments;
    assert.ok(Array.isArray(myAssignments));
    assert.strictEqual(myAssignments.length, 1);
    assert.strictEqual(myAssignments[0].predictionId, 'TEST-DASH-PRED-B1');
    assert.strictEqual(myAssignments[0].complaintType, 'Mainline Pipeline Fracture');
  });
});
