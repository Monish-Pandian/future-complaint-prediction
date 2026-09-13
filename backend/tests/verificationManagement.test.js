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
const {
  Verification,
  VERIFICATION_OUTCOMES,
  VERIFICATION_SEVERITY,
} = require('../src/models/Verification');

describe('Field Verification (Prediction vs Actual Observation) Module Tests', () => {
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

  let predA;
  let asgnA;

  let predB;
  let asgnB;

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
    await User.deleteMany({ email: /@testverif\.civic$/ });
    await Officer.deleteMany({ employeeCode: /^TEST-VERIF-EMP-/ });
    await Prediction.deleteMany({ predictionId: /^TEST-VERIF-PRED-/ });
    await Assignment.deleteMany({ assignmentId: /^ASGN-VERIF-/ });
    await Verification.deleteMany({ verificationId: /^VERIF-/ });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('TestPass@123', salt);

    // 1. Admin
    adminUser = await User.create({
      name: 'Verification Admin',
      email: 'admin@testverif.civic',
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
      name: 'Officer Alice Field',
      email: 'alice@testverif.civic',
      passwordHash,
      role: ROLES.OFFICER,
      officerId: 'TEST-VERIF-OFF-A',
      department: 'Streets & Sanitation',
      isActive: true,
    });
    officerADoc = await Officer.create({
      officerId: 'TEST-VERIF-OFF-A',
      userId: officerAUser._id,
      employeeCode: 'TEST-VERIF-EMP-A',
      name: 'Officer Alice Field',
      department: 'Streets & Sanitation',
      location: { type: 'Point', coordinates: [77.594, 12.971] },
      availability: AVAILABILITY_STATUS.AVAILABLE,
      currentWorkload: 1,
      active: true,
    });
    officerAToken = jwt.sign(
      { userId: officerAUser._id.toString(), role: ROLES.OFFICER, officerId: 'TEST-VERIF-OFF-A' },
      secret,
      { expiresIn: '1h' }
    );

    // 3. Officer B (Water & Drainage)
    officerBUser = await User.create({
      name: 'Officer Bob Field',
      email: 'bob@testverif.civic',
      passwordHash,
      role: ROLES.OFFICER,
      officerId: 'TEST-VERIF-OFF-B',
      department: 'Water & Drainage',
      isActive: true,
    });
    officerBDoc = await Officer.create({
      officerId: 'TEST-VERIF-OFF-B',
      userId: officerBUser._id,
      employeeCode: 'TEST-VERIF-EMP-B',
      name: 'Officer Bob Field',
      department: 'Water & Drainage',
      location: { type: 'Point', coordinates: [77.58, 12.99] },
      availability: AVAILABILITY_STATUS.AVAILABLE,
      currentWorkload: 1,
      active: true,
    });
    officerBToken = jwt.sign(
      { userId: officerBUser._id.toString(), role: ROLES.OFFICER, officerId: 'TEST-VERIF-OFF-B' },
      secret,
      { expiresIn: '1h' }
    );

    // 4. Officer A's Prediction & Assignment
    predA = await Prediction.create({
      predictionId: 'TEST-VERIF-PRED-A',
      complaintType: 'Pothole Wave on Main Street',
      department: 'Streets & Sanitation',
      communityArea: 'Downtown Central',
      ward: 'Ward 1',
      location: { type: 'Point', coordinates: [77.595, 12.972] },
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      probability: 0.92,
      riskScore: 89.0,
      riskLevel: RISK_LEVELS.HIGH,
      verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      assignedOfficer: officerADoc._id,
    });
    asgnA = await Assignment.create({
      assignmentId: 'ASGN-VERIF-A',
      predictionId: predA._id,
      officerId: officerADoc._id,
      department: 'Streets & Sanitation',
      distanceKm: 1.2,
      estimatedTravelMinutes: 8,
      status: ASSIGNMENT_STATUS.AI_ASSIGNED,
      reasoning: 'Automated test assignment for Pred A',
      assignedAt: new Date(),
    });

    // 5. Officer B's Prediction & Assignment
    predB = await Prediction.create({
      predictionId: 'TEST-VERIF-PRED-B',
      complaintType: 'Drainage Clog & Flooding',
      department: 'Water & Drainage',
      communityArea: 'North District',
      ward: 'Ward 5',
      location: { type: 'Point', coordinates: [77.581, 12.991] },
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      probability: 0.88,
      riskScore: 84.0,
      riskLevel: RISK_LEVELS.HIGH,
      verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      assignedOfficer: officerBDoc._id,
    });
    asgnB = await Assignment.create({
      assignmentId: 'ASGN-VERIF-B',
      predictionId: predB._id,
      officerId: officerBDoc._id,
      department: 'Water & Drainage',
      distanceKm: 1.6,
      estimatedTravelMinutes: 11,
      status: ASSIGNMENT_STATUS.AI_ASSIGNED,
      reasoning: 'Automated test assignment for Pred B',
      assignedAt: new Date(),
    });

    // 6. Officer A's 2nd Prediction & Assignment for forgery test
    const predC = await Prediction.create({
      predictionId: 'TEST-VERIF-PRED-C',
      complaintType: 'Streetlight Pole Damage',
      department: 'Streets & Sanitation',
      communityArea: 'Downtown Central',
      ward: 'Ward 1',
      location: { type: 'Point', coordinates: [77.596, 12.973] },
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      probability: 0.85,
      riskScore: 82.0,
      riskLevel: RISK_LEVELS.HIGH,
      verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      assignedOfficer: officerADoc._id,
    });
    await Assignment.create({
      assignmentId: 'ASGN-VERIF-C',
      predictionId: predC._id,
      officerId: officerADoc._id,
      department: 'Streets & Sanitation',
      distanceKm: 1.0,
      estimatedTravelMinutes: 6,
      status: ASSIGNMENT_STATUS.AI_ASSIGNED,
      reasoning: 'Automated test assignment for Pred C',
      assignedAt: new Date(),
    });
  });

  after(async () => {
    await User.deleteMany({ email: /@testverif\.civic$/ });
    await Officer.deleteMany({ employeeCode: /^TEST-VERIF-EMP-/ });
    await Prediction.deleteMany({ predictionId: /^TEST-VERIF-PRED-/ });
    await Assignment.deleteMany({ assignmentId: /^ASGN-VERIF-/ });
    await Verification.deleteMany({ verificationId: /^VERIF-/ });
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  });

  // ----------------------------------------------------
  // VERIFICATION SUBMISSION & STATUS TRANSITIONS
  // ----------------------------------------------------
  let createdVerificationId;

  it('Officer A submits verification with PROBLEM_CONFIRMED and optional GPS', async () => {
    const res = await fetch(`${baseUrl}/officer/verifications`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${officerAToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        predictionId: predA.predictionId,
        outcome: VERIFICATION_OUTCOMES.PROBLEM_CONFIRMED,
        severity: VERIFICATION_SEVERITY.HIGH,
        notes: 'Observed 2 large potholes near downtown intersection. Requires patching.',
        evidenceUrl: 'https://storage.civic.gov/evidence/pot_2026.jpg',
        latitude: 12.972,
        longitude: 77.595,
        gpsAvailable: true,
      }),
    });
    const data = await res.json();

    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.verification);
    assert.ok(data.data.verification.verificationId);
    assert.strictEqual(data.data.verification.outcome, VERIFICATION_OUTCOMES.PROBLEM_CONFIRMED);
    assert.strictEqual(data.data.verification.severity, VERIFICATION_SEVERITY.HIGH);
    assert.strictEqual(data.data.verification.gpsAvailable, true);
    assert.strictEqual(data.data.verification.location.coordinates[0], 77.595);
    assert.strictEqual(data.data.verification.location.coordinates[1], 12.972);

    createdVerificationId = data.data.verification.id || data.data.verification.verificationId;

    // Verify Prediction record status update -> VERIFIED_TRUE
    const updatedPrediction = await Prediction.findById(predA._id);
    assert.strictEqual(updatedPrediction.verificationStatus, VERIFICATION_STATUS.VERIFIED_TRUE);

    // Verify Assignment record status update -> COMPLETED
    const updatedAssignment = await Assignment.findById(asgnA._id);
    assert.strictEqual(updatedAssignment.status, ASSIGNMENT_STATUS.COMPLETED);
    assert.ok(updatedAssignment.completedAt);
  });

  it('Officer B submits verification with PROBLEM_NOT_FOUND without GPS (no fabrication)', async () => {
    const res = await fetch(`${baseUrl}/officer/verifications`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${officerBToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        predictionId: predB._id.toString(),
        outcome: VERIFICATION_OUTCOMES.PROBLEM_NOT_FOUND,
        severity: VERIFICATION_SEVERITY.LOW,
        notes: 'Area inspected; drainage is clear with normal water flow. False alarm.',
      }),
    });
    const data = await res.json();

    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.verification.outcome, VERIFICATION_OUTCOMES.PROBLEM_NOT_FOUND);
    assert.strictEqual(data.data.verification.gpsAvailable, false);
    assert.strictEqual(data.data.verification.location.coordinates[0], 0);
    assert.strictEqual(data.data.verification.location.coordinates[1], 0);

    // Verify Prediction record status update -> VERIFIED_FALSE
    const updatedPrediction = await Prediction.findById(predB._id);
    assert.strictEqual(updatedPrediction.verificationStatus, VERIFICATION_STATUS.VERIFIED_FALSE);
  });

  // ----------------------------------------------------
  // SECURITY & OWNERSHIP ENFORCEMENT
  // ----------------------------------------------------
  it('Officer A cannot verify a prediction assigned to Officer B (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/officer/verifications`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${officerAToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        predictionId: predB.predictionId,
        outcome: VERIFICATION_OUTCOMES.PROBLEM_CONFIRMED,
        notes: 'Trying to verify another officer task',
      }),
    });
    const data = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('not authorized to submit verification for a prediction not assigned to you'));
  });

  it('Officer cannot forge officerId in request body (overridden with JWT identity)', async () => {
    const res = await fetch(`${baseUrl}/officer/verifications`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${officerAToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        predictionId: 'TEST-VERIF-PRED-C',
        officerId: officerBDoc._id.toString(), // Forged officer ID
        outcome: VERIFICATION_OUTCOMES.PROBLEM_CONFIRMED,
        notes: 'Testing officerId override',
      }),
    });
    const data = await res.json();

    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    // Officer ID must remain Officer A
    const actualOfficerId =
      data.data.verification.officerId._id || data.data.verification.officerId.id || data.data.verification.officerId;
    assert.strictEqual(actualOfficerId.toString(), officerADoc._id.toString());
  });

  // ----------------------------------------------------
  // RETRIEVAL & ISOLATION
  // ----------------------------------------------------
  it('Officer A receives only Officer A verification records', async () => {
    const res = await fetch(`${baseUrl}/officer/verifications`, {
      headers: { Authorization: `Bearer ${officerAToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    for (const v of data.data.verifications) {
      const vOffId = v.officerId._id || v.officerId.id || v.officerId;
      assert.strictEqual(vOffId.toString(), officerADoc._id.toString());
    }
  });

  it('Officer A cannot view Officer B single verification record (403 Forbidden)', async () => {
    // Locate Officer B's verification record
    const verifB = await Verification.findOne({ officerId: officerBDoc._id });

    const res = await fetch(`${baseUrl}/officer/verifications/${verifB._id}`, {
      headers: { Authorization: `Bearer ${officerAToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.success, false);
  });

  it('Admin can view all verification records across all officers', async () => {
    const res = await fetch(`${baseUrl}/admin/verifications`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data.verifications));
    assert.ok(data.data.verifications.length >= 2);
  });

  it('Admin can view single verification by ID', async () => {
    const res = await fetch(`${baseUrl}/admin/verifications/${createdVerificationId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.verification);
    assert.strictEqual(data.data.verification.outcome, VERIFICATION_OUTCOMES.PROBLEM_CONFIRMED);
  });

  // ----------------------------------------------------
  // UPDATE VERIFICATION
  // ----------------------------------------------------
  it('Officer A can update notes and evidence on their own verification', async () => {
    const res = await fetch(`${baseUrl}/officer/verifications/${createdVerificationId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${officerAToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notes: 'Updated observation: Road crew dispatched for repair.',
        evidenceUrl: 'https://storage.civic.gov/evidence/pot_repaired.jpg',
      }),
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(
      data.data.verification.notes,
      'Updated observation: Road crew dispatched for repair.'
    );
    assert.strictEqual(
      data.data.verification.evidenceUrl,
      'https://storage.civic.gov/evidence/pot_repaired.jpg'
    );
  });
});
