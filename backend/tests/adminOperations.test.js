const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/database');
const {
  User,
  ROLES,
  Officer,
  Prediction,
  Assignment,
  Verification,
  Evaluation,
  Feedback,
  PredictionCycle,
} = require('../src/models');
const seedDatabase = require('../seed');

describe('Module 12: Complete Admin Operational APIs Integration Tests', () => {
  let server;
  let baseUrl;
  const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_civic_forecasting_2026_secure';

  let adminToken;
  let officerToken;
  let samplePrediction;
  let sampleOfficer;
  let sampleAssignment;
  let sampleVerification;

  before(async () => {
    await connectDB();
    await seedDatabase();

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
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

    const officerUser = await User.findOne({ email: 'marcus.vance@civic.gov' });
    officerToken = jwt.sign(
      { userId: officerUser._id.toString(), role: ROLES.OFFICER, officerId: 'OFF-1001' },
      secret,
      { expiresIn: '1h' }
    );

    samplePrediction = await Prediction.findOne({ predictionId: 'PRED-2026-0001' });
    sampleOfficer = await Officer.findOne({ employeeCode: 'EMP-301' });
    sampleAssignment = await Assignment.findOne({ assignmentId: 'ASGN-2026-0001' });
    sampleVerification = await Verification.findOne({ verificationId: 'VERIF-2026-0001' });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  });

  // ----------------------------------------------------
  // ROLE-BASED ACCESS CONTROL (RBAC)
  // ----------------------------------------------------
  it('Admin routes allow ADMIN and reject OFFICER with 403 Forbidden', async () => {
    const endpoints = [
      '/admin/dashboard',
      '/admin/predictions',
      `/admin/predictions/${samplePrediction._id}`,
      '/admin/heatmap',
      '/admin/officers',
      `/admin/officers/${sampleOfficer._id}`,
      `/admin/officers/${sampleOfficer._id}/workload`,
      '/admin/assignments',
      `/admin/assignments/${sampleAssignment._id}`,
      '/admin/verifications',
      `/admin/verifications/${sampleVerification._id}`,
    ];

    for (const ep of endpoints) {
      // 1. Allowed for Admin
      const resAdmin = await fetch(`${baseUrl}${ep}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resAdmin.status, 200, `Admin should access ${ep}`);

      // 2. Forbidden for Officer
      const resOfficer = await fetch(`${baseUrl}${ep}`, {
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      assert.strictEqual(resOfficer.status, 403, `Officer should be forbidden from ${ep}`);

      // 3. Unauthorized without token
      const resAnon = await fetch(`${baseUrl}${ep}`);
      assert.strictEqual(resAnon.status, 401, `Unauthenticated request should be rejected for ${ep}`);
    }
  });

  // ----------------------------------------------------
  // 1. ADMIN DASHBOARD
  // ----------------------------------------------------
  it('GET /api/v1/admin/dashboard returns live operational metrics and distributions', async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);

    const metrics = data.data.metrics;
    assert.ok(metrics.totalPredictions >= 5);
    assert.ok(metrics.activeOfficers >= 5);
    assert.ok(Array.isArray(metrics.departmentDistribution));
    assert.ok(metrics.riskDistribution);
    assert.ok(metrics.verificationStatusDistribution);
    assert.ok(metrics.assignmentStatusDistribution);
    assert.ok(Array.isArray(data.data.recentPredictions));
    assert.ok(Array.isArray(data.data.recentAssignments));
    assert.ok(Array.isArray(data.data.recentVerifications));
  });

  // ----------------------------------------------------
  // 2. ADMIN PREDICTIONS (LIST, FILTER, PAGINATION, DETAILS)
  // ----------------------------------------------------
  it('GET /api/v1/admin/predictions supports pagination and department filtering', async () => {
    const res = await fetch(
      `${baseUrl}/admin/predictions?page=1&limit=2&department=Streets%20%26%20Sanitation`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data.predictions));
    assert.strictEqual(data.data.predictions.length, 2);
    assert.strictEqual(data.data.pagination.page, 1);
    assert.strictEqual(data.data.pagination.limit, 2);
    assert.ok(data.data.pagination.total >= 2);
    assert.ok(data.data.pagination.totalPages >= 1);

    for (const pred of data.data.predictions) {
      assert.strictEqual(pred.department, 'Streets & Sanitation');
    }
  });

  it('GET /api/v1/admin/predictions validates date range (startDate > endDate throws 400)', async () => {
    const res = await fetch(
      `${baseUrl}/admin/predictions?startDate=2026-09-01&endDate=2026-08-01`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('startDate') && data.message.includes('cannot be after endDate'));
  });

  it('GET /api/v1/admin/predictions/:id returns complete operational lifecycle graph', async () => {
    const res = await fetch(`${baseUrl}/admin/predictions/${samplePrediction.predictionId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);

    const body = data.data;
    assert.ok(body.prediction);
    assert.strictEqual(body.prediction.predictionId, 'PRED-2026-0001');

    // Verified lifecycle graph components
    assert.ok(body.predictionCycle, 'Should contain prediction cycle');
    assert.strictEqual(body.predictionCycle.cycleId, 'CYCLE-2026-001');

    assert.ok(body.assignedOfficer, 'Should contain assigned officer');
    assert.strictEqual(body.assignedOfficer.employeeCode, 'EMP-301');

    assert.ok(body.assignment, 'Should contain assignment record');
    assert.strictEqual(body.assignment.assignmentId, 'ASGN-2026-0001');

    assert.ok(body.verification, 'Should contain verification record');
    assert.strictEqual(body.verification.verificationId, 'VERIF-2026-0001');

    assert.ok(body.evaluation, 'Should contain evaluation record');
    assert.strictEqual(body.evaluation.classification, 'TRUE_POSITIVE');

    assert.ok(body.feedback, 'Should contain feedback record');
    assert.strictEqual(body.feedback.feedbackType, 'VERIFIED_OBSERVATION');

    // Security check: ensure no passwordHash or auth secrets are exposed
    const stringified = JSON.stringify(body);
    assert.strictEqual(stringified.includes('passwordHash'), false);
    assert.strictEqual(stringified.includes('super_secret'), false);
  });

  // ----------------------------------------------------
  // 3. GLOBAL HEATMAP
  // ----------------------------------------------------
  it('GET /api/v1/admin/heatmap returns GeoJSON FeatureCollection with [lon, lat] coordinates', async () => {
    const res = await fetch(`${baseUrl}/admin/heatmap?riskLevel=HIGH`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.type, 'FeatureCollection');
    assert.ok(Array.isArray(data.data.features));

    for (const f of data.data.features) {
      assert.strictEqual(f.type, 'Feature');
      assert.strictEqual(f.geometry.type, 'Point');
      assert.strictEqual(f.geometry.coordinates.length, 2);
      // GeoJSON standard: [longitude (-180..180), latitude (-90..90)]
      assert.ok(f.geometry.coordinates[0] >= -180 && f.geometry.coordinates[0] <= 180);
      assert.ok(f.geometry.coordinates[1] >= -90 && f.geometry.coordinates[1] <= 90);
      assert.strictEqual(f.properties.riskLevel, 'HIGH');
    }
  });

  // ----------------------------------------------------
  // 4. OFFICER MANAGEMENT & WORKLOAD
  // ----------------------------------------------------
  it('GET /api/v1/admin/officers/:id returns officer with assignment and verification summaries', async () => {
    const res = await fetch(`${baseUrl}/admin/officers/${sampleOfficer.officerId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.officer);
    assert.strictEqual(data.data.officer.officerId, 'OFF-1001');
    assert.ok(data.data.officer.assignmentSummary);
    assert.ok(data.data.officer.verificationSummary);
  });

  it('GET /api/v1/admin/officers/:id/workload returns workload and active assignment breakdown', async () => {
    const res = await fetch(`${baseUrl}/admin/officers/${sampleOfficer._id}/workload`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.officerId, 'OFF-1001');
    assert.strictEqual(typeof data.data.currentWorkload, 'number');
    assert.strictEqual(typeof data.data.activeAssignments, 'number');
    assert.strictEqual(typeof data.data.pendingVerifications, 'number');
    assert.strictEqual(typeof data.data.completedVerifications, 'number');
  });

  // ----------------------------------------------------
  // 5. ASSIGNMENTS
  // ----------------------------------------------------
  it('GET /api/v1/admin/assignments/:id returns assignment with reasoning, officer, and attribution', async () => {
    const res = await fetch(`${baseUrl}/admin/assignments/${sampleAssignment.assignmentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.assignment);
    assert.strictEqual(data.data.assignment.assignmentId, 'ASGN-2026-0001');
    assert.ok(data.data.officer);
    assert.ok(data.data.prediction);
    assert.strictEqual(data.data.engineSource, 'DEMO ASSIGNMENT LOGIC');
    assert.strictEqual(typeof data.data.isAdminOverride, 'boolean');
  });

  // ----------------------------------------------------
  // 6. VERIFICATION MONITORING
  // ----------------------------------------------------
  it('GET /api/v1/admin/verifications/:id returns verification observation with evaluation comparison', async () => {
    const res = await fetch(`${baseUrl}/admin/verifications/${sampleVerification.verificationId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.verification);
    assert.strictEqual(data.data.verification.outcome, 'PROBLEM_CONFIRMED');
    assert.ok(data.data.prediction);
    assert.ok(data.data.officer);
    assert.ok(data.data.evaluation);
    assert.strictEqual(data.data.evaluation.classification, 'TRUE_POSITIVE');
  });
});
