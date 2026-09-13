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

describe('Admin Dashboard API Module Tests', () => {
  let server;
  let baseUrl;
  const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_civic_forecasting_2026_secure';

  let adminUser;
  let adminToken;

  let officerUser;
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

    // Clean up previous test records
    await User.deleteMany({ email: /@testadmindash\.civic$/ });
    await Officer.deleteMany({ employeeCode: /^TEST-ADM-EMP-/ });
    await Prediction.deleteMany({ predictionId: /^TEST-ADM-PRED-/ });
    await Assignment.deleteMany({ assignmentId: /^ASGN-ADM-/ });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('TestPass@123', salt);

    // 1. Provision Admin User
    adminUser = await User.create({
      name: 'System Admin Manager',
      email: 'admin@testadmindash.civic',
      passwordHash,
      role: ROLES.ADMIN,
      isActive: true,
    });
    adminToken = jwt.sign(
      { userId: adminUser._id.toString(), role: ROLES.ADMIN },
      secret,
      { expiresIn: '1h' }
    );

    // 2. Provision Officer User
    officerUser = await User.create({
      name: 'Field Officer',
      email: 'officer@testadmindash.civic',
      passwordHash,
      role: ROLES.OFFICER,
      officerId: 'TEST-ADM-OFF-1',
      department: 'Streets & Sanitation',
      isActive: true,
    });
    const officerDoc = await Officer.create({
      officerId: 'TEST-ADM-OFF-1',
      userId: officerUser._id,
      employeeCode: 'TEST-ADM-EMP-1',
      name: 'Field Officer',
      department: 'Streets & Sanitation',
      location: { type: 'Point', coordinates: [77.594, 12.971] },
      availability: AVAILABILITY_STATUS.AVAILABLE,
      currentWorkload: 1,
      active: true,
    });
    officerToken = jwt.sign(
      { userId: officerUser._id.toString(), role: ROLES.OFFICER, officerId: 'TEST-ADM-OFF-1' },
      secret,
      { expiresIn: '1h' }
    );

    // 3. Create Sample Predictions across departments & risk levels
    // Pred 1: HIGH risk, Streets & Sanitation, ASSIGNED
    const pred1 = await Prediction.create({
      predictionId: 'TEST-ADM-PRED-001',
      complaintType: 'Pothole & Asphalt Break',
      department: 'Streets & Sanitation',
      communityArea: 'Downtown Central',
      ward: 'Ward 1',
      location: { type: 'Point', coordinates: [77.595, 12.972] },
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      probability: 0.92,
      riskScore: 89.0,
      riskLevel: RISK_LEVELS.HIGH,
      verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      assignedOfficer: officerDoc._id,
    });

    // Pred 2: CRITICAL risk, Water, PENDING_VERIFICATION
    const pred2 = await Prediction.create({
      predictionId: 'TEST-ADM-PRED-002',
      complaintType: 'Pipeline Burst Risk',
      department: 'Water',
      communityArea: 'Lakeside',
      ward: 'Ward 3',
      location: { type: 'Point', coordinates: [77.581, 12.991] },
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      probability: 0.97,
      riskScore: 95.0,
      riskLevel: RISK_LEVELS.CRITICAL,
      verificationStatus: VERIFICATION_STATUS.PENDING_VERIFICATION,
    });

    // Pred 3: LOW risk, Electricity, UNASSIGNED
    await Prediction.create({
      predictionId: 'TEST-ADM-PRED-003',
      complaintType: 'Streetlight Flicker Spike',
      department: 'Electricity',
      communityArea: 'North District',
      ward: 'Ward 7',
      location: { type: 'Point', coordinates: [77.575, 12.985] },
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      probability: 0.45,
      riskScore: 42.0,
      riskLevel: RISK_LEVELS.LOW,
      verificationStatus: VERIFICATION_STATUS.UNASSIGNED,
    });

    // Pred 4: MEDIUM risk, Streets & Sanitation, VERIFIED_TRUE
    const pred4 = await Prediction.create({
      predictionId: 'TEST-ADM-PRED-004',
      complaintType: 'Illegal Waste Accumulation',
      department: 'Streets & Sanitation',
      communityArea: 'East Sector',
      ward: 'Ward 2',
      location: { type: 'Point', coordinates: [77.601, 12.979] },
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      probability: 0.76,
      riskScore: 71.0,
      riskLevel: RISK_LEVELS.MEDIUM,
      verificationStatus: VERIFICATION_STATUS.VERIFIED_TRUE,
      assignedOfficer: officerDoc._id,
    });

    // 4. Create Sample Assignments
    await Assignment.create({
      assignmentId: 'ASGN-ADM-001',
      predictionId: pred1._id,
      officerId: officerDoc._id,
      department: 'Streets & Sanitation',
      distanceKm: 1.5,
      estimatedTravelMinutes: 10,
      status: ASSIGNMENT_STATUS.AI_ASSIGNED,
      reasoning: 'Automated test decision assignment for Pred 1',
      assignedAt: new Date(),
    });

    await Assignment.create({
      assignmentId: 'ASGN-ADM-002',
      predictionId: pred4._id,
      officerId: officerDoc._id,
      department: 'Streets & Sanitation',
      distanceKm: 2.3,
      estimatedTravelMinutes: 14,
      status: ASSIGNMENT_STATUS.COMPLETED,
      reasoning: 'Automated test decision assignment for Pred 4',
      assignedAt: new Date(Date.now() - 7200000),
      completedAt: new Date(),
    });
  });

  after(async () => {
    await User.deleteMany({ email: /@testadmindash\.civic$/ });
    await Officer.deleteMany({ employeeCode: /^TEST-ADM-EMP-/ });
    await Prediction.deleteMany({ predictionId: /^TEST-ADM-PRED-/ });
    await Assignment.deleteMany({ assignmentId: /^ASGN-ADM-/ });
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  });

  // ----------------------------------------------------
  // ACCESS CONTROL
  // ----------------------------------------------------
  it('GET /api/v1/admin/dashboard allows ADMIN access (200 OK)', async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.scope, 'GLOBAL_ADMIN');
  });

  it('GET /api/v1/admin/dashboard blocks OFFICER access (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('not authorized'));
  });

  it('GET /api/v1/admin/dashboard blocks unauthenticated access (401 Unauthorized)', async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`);
    const data = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
  });

  // ----------------------------------------------------
  // OVERALL APPLICATION METRICS
  // ----------------------------------------------------
  it('Admin dashboard returns accurate live operational metrics from MongoDB', async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);

    const metrics = data.data.metrics;
    assert.ok(metrics);
    assert.strictEqual(typeof metrics.totalPredictions, 'number');
    assert.strictEqual(typeof metrics.highRiskPredictions, 'number');
    assert.strictEqual(typeof metrics.criticalPredictions, 'number');
    assert.strictEqual(typeof metrics.pendingVerification, 'number');
    assert.strictEqual(typeof metrics.verifiedPredictions, 'number');
    assert.strictEqual(typeof metrics.assignedPredictions, 'number');
    assert.strictEqual(typeof metrics.unassignedPredictions, 'number');
    assert.strictEqual(typeof metrics.activeOfficers, 'number');
    assert.strictEqual(typeof metrics.availableOfficers, 'number');

    // Values should be non-negative
    assert.ok(metrics.totalPredictions >= 4);
    assert.ok(metrics.highRiskPredictions >= 1);
    assert.ok(metrics.criticalPredictions >= 1);
    assert.ok(metrics.pendingVerification >= 2);
    assert.ok(metrics.verifiedPredictions >= 1);
    assert.ok(metrics.activeOfficers >= 1);
  });

  // ----------------------------------------------------
  // DISTRIBUTIONS
  // ----------------------------------------------------
  it('Admin dashboard returns department, risk, and status distributions', async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    const metrics = data.data.metrics;

    // Department Distribution
    assert.ok(Array.isArray(metrics.departmentDistribution));
    assert.ok(metrics.departmentDistribution.length > 0);
    for (const dept of metrics.departmentDistribution) {
      assert.ok(dept.department);
      assert.strictEqual(typeof dept.count, 'number');
      assert.strictEqual(typeof dept.highRiskCount, 'number');
    }

    // Risk Distribution
    assert.ok(metrics.riskDistribution);
    assert.strictEqual(typeof metrics.riskDistribution.LOW, 'number');
    assert.strictEqual(typeof metrics.riskDistribution.MEDIUM, 'number');
    assert.strictEqual(typeof metrics.riskDistribution.HIGH, 'number');
    assert.strictEqual(typeof metrics.riskDistribution.CRITICAL, 'number');

    // Verification Status Distribution
    assert.ok(metrics.verificationStatusDistribution);
    assert.strictEqual(typeof metrics.verificationStatusDistribution.UNASSIGNED, 'number');
    assert.strictEqual(typeof metrics.verificationStatusDistribution.ASSIGNED, 'number');
    assert.strictEqual(typeof metrics.verificationStatusDistribution.PENDING_VERIFICATION, 'number');
    assert.strictEqual(typeof metrics.verificationStatusDistribution.VERIFIED_TRUE, 'number');
  });

  // ----------------------------------------------------
  // RECENT ACTIVITY
  // ----------------------------------------------------
  it('Admin dashboard returns recent predictions, assignments, and verifications', async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    const recent = data.data.recentActivity;

    assert.ok(recent);
    assert.ok(Array.isArray(recent.predictions));
    assert.ok(Array.isArray(recent.assignments));
    assert.ok(Array.isArray(recent.verifications));

    // Verify recent predictions structure
    if (recent.predictions.length > 0) {
      const pred = recent.predictions[0];
      assert.ok(pred.predictionId);
      assert.ok(pred.complaintType);
      assert.ok(pred.department);
      assert.ok(pred.riskLevel);
    }

    // Verify recent assignments structure
    if (recent.assignments.length > 0) {
      const asgn = recent.assignments[0];
      assert.ok(asgn.assignmentId);
      assert.ok(asgn.officerId);
      assert.ok(asgn.predictionId);
    }
  });

  // ----------------------------------------------------
  // NO RESEARCH METRICS IN APPLICATION OPERATIONAL DASHBOARD
  // ----------------------------------------------------
  it('Operational dashboard does NOT include research/AI model evaluation metrics', async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    const responseKeys = Object.keys(data.data.metrics);

    const researchMetrics = ['precision', 'recall', 'f1', 'rmse', 'mae', 'exploration', 'bias'];
    for (const metric of researchMetrics) {
      assert.strictEqual(
        responseKeys.includes(metric),
        false,
        `Dashboard response must not expose research metric: ${metric}`
      );
    }
  });
});
