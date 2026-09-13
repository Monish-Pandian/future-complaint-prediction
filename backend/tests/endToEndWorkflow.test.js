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
  AVAILABILITY_STATUS,
  HistoricalComplaint,
  PredictionCycle,
  CYCLE_STATUS,
  Prediction,
  RISK_LEVELS,
  VERIFICATION_STATUS,
  Assignment,
  ASSIGNMENT_STATUS,
  Verification,
  VERIFICATION_OUTCOMES,
  VERIFICATION_SEVERITY,
  Evaluation,
  EVALUATION_CLASSIFICATION,
  Feedback,
  FEEDBACK_TYPES,
  FEEDBACK_STATUS,
} = require('../src/models');
const { assignPrediction, updateAssignmentStatus } = require('../src/services/assignmentService');
const { getPredictionTrace } = require('../src/services/predictionService');
const { checkDatabaseConsistency } = require('../src/services/consistencyService');
const seedDatabase = require('../seed');

describe('Module 14: End-to-End Backend Workflow Integration Tests', () => {
  let server;
  let baseUrl;
  const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_civic_forecasting_2026_secure';

  let adminToken;
  let officerAToken;
  let officerBToken;
  let officerAUser;
  let officerBUser;
  let officerADoc;
  let officerBDoc;
  let cycleDoc;

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

    officerAUser = await User.findOne({ email: 'marcus.vance@civic.gov' });
    officerADoc = await Officer.findOne({ userId: officerAUser._id });
    officerAToken = jwt.sign(
      {
        userId: officerAUser._id.toString(),
        role: ROLES.OFFICER,
        officerId: officerADoc.officerId,
        department: officerADoc.department,
      },
      secret,
      { expiresIn: '1h' }
    );

    officerBUser = await User.findOne({ email: 'elena.rostova@civic.gov' });
    officerBDoc = await Officer.findOne({ userId: officerBUser._id });
    officerBToken = jwt.sign(
      {
        userId: officerBUser._id.toString(),
        role: ROLES.OFFICER,
        officerId: officerBDoc.officerId,
        department: officerBDoc.department,
      },
      secret,
      { expiresIn: '1h' }
    );

    cycleDoc = await PredictionCycle.findOne({ cycleId: 'CYCLE-2026-002' });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  });

  // ----------------------------------------------------
  // SECTION 19: COMPLETE END-TO-END SUCCESS SCENARIO
  // ----------------------------------------------------
  it('Complete End-to-End Success Scenario: Prediction -> AI Assignment -> Accept -> Start -> Verify (Confirmed) -> True Positive -> Feedback -> Workload', async () => {
    // 1. Initial Officer Workload
    const initialOfficer = await Officer.findById(officerADoc._id);
    const initialWorkload = initialOfficer.currentWorkload;

    // 2. STEP 1: Admin Creates Prediction (Pothole, Community Area: The Loop, Prob: 0.87, Risk: HIGH)
    const createPredRes = await fetch(`${baseUrl}/admin/predictions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        predictionId: 'PRED-E2E-SUCCESS-001',
        predictionCycleId: cycleDoc._id,
        complaintType: 'Pothole & Asphalt Break',
        department: 'Streets & Sanitation',
        communityArea: 'The Loop',
        ward: 'Ward 42',
        location: { type: 'Point', coordinates: [-87.6298, 41.8781] },
        probability: 0.87,
        riskScore: 88.0,
        riskLevel: 'HIGH',
        verificationStatus: 'PENDING_VERIFICATION',
      }),
    });
    const createPredData = await createPredRes.json();
    assert.strictEqual(createPredRes.status, 201);
    assert.strictEqual(createPredData.success, true);
    const predId = createPredData.data.prediction._id;

    // 3. STEP 2: Trigger AI Dispatch Assignment
    const assignRes = await fetch(
      `${baseUrl}/admin/assignments/auto-assign/PRED-E2E-SUCCESS-001`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    const assignData = await assignRes.json();
    assert.strictEqual(assignRes.status, 200);
    assert.strictEqual(assignData.success, true);
    const assignment = assignData.data.assignment;
    const assignedOfficerId =
      assignment.officerId?.id || assignment.officerId?._id || assignment.officerId;
    assert.strictEqual(assignedOfficerId.toString(), officerADoc._id.toString());
    assert.ok(assignment.assignmentScore > 0);

    // Workload incremented
    const afterAssignOfficer = await Officer.findById(officerADoc._id);
    assert.strictEqual(afterAssignOfficer.currentWorkload, initialWorkload + 1);

    // 4. STEP 3: Officer Accepts Assignment
    const acceptRes = await fetch(
      `${baseUrl}/officer/assignments/${assignment.assignmentId}/accept`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${officerAToken}` },
      }
    );
    const acceptData = await acceptRes.json();
    assert.strictEqual(acceptRes.status, 200);
    assert.strictEqual(acceptData.data.assignment.status, 'ACCEPTED');

    // 5. STEP 4: Officer Starts Assignment
    const startRes = await fetch(
      `${baseUrl}/officer/assignments/${assignment.assignmentId}/start`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${officerAToken}` },
      }
    );
    const startData = await startRes.json();
    assert.strictEqual(startRes.status, 200);
    assert.strictEqual(startData.data.assignment.status, 'IN_PROGRESS');

    // 6. STEP 5: Officer Submits Field Verification (PROBLEM_CONFIRMED)
    const verifRes = await fetch(`${baseUrl}/officer/verifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerAToken}`,
      },
      body: JSON.stringify({
        predictionId: 'PRED-E2E-SUCCESS-001',
        outcome: 'PROBLEM_CONFIRMED',
        severity: 'HIGH',
        notes: 'Large pothole observed with deep roadbed crack.',
        latitude: 41.8781,
        longitude: -87.6298,
        gpsAvailable: true,
        evidenceUrl: 'https://storage.civic.gov/evidence/e2e_pothole_001.jpg',
      }),
    });
    const verifData = await verifRes.json();
    assert.strictEqual(verifRes.status, 201);
    assert.strictEqual(verifData.success, true);
    assert.strictEqual(verifData.data.verification.outcome, 'PROBLEM_CONFIRMED');

    // 7. STEP 6 & 7: Verify Assignment COMPLETED and Officer Workload Decremented
    const completedAssignment = await Assignment.findOne({
      assignmentId: assignment.assignmentId,
    });
    assert.strictEqual(completedAssignment.status, 'COMPLETED');
    assert.ok(completedAssignment.completedAt);

    const finalOfficer = await Officer.findById(officerADoc._id);
    assert.strictEqual(finalOfficer.currentWorkload, initialWorkload);

    // 8. STEP 8: Verify Prediction is VERIFIED while preserving original parameters
    const updatedPrediction = await Prediction.findOne({
      predictionId: 'PRED-E2E-SUCCESS-001',
    });
    assert.ok(updatedPrediction);
    assert.ok(
      updatedPrediction.verificationStatus === 'VERIFIED_TRUE' ||
        updatedPrediction.verificationStatus === 'VERIFIED'
    );
    assert.strictEqual(updatedPrediction.probability, 0.87);
    assert.strictEqual(updatedPrediction.riskScore, 88.0);
    assert.strictEqual(updatedPrediction.riskLevel, 'HIGH');

    // 9. STEP 9: Verify Automated Evaluation (TRUE_POSITIVE)
    const evaluation = await Evaluation.findOne({
      predictionId: updatedPrediction._id,
    });
    assert.ok(evaluation, 'Evaluation record must be generated automatically');
    assert.strictEqual(evaluation.classification, 'TRUE_POSITIVE');
    assert.strictEqual(evaluation.actualOutcome, 'PROBLEM_CONFIRMED');

    // 10. STEP 10: Verify Automated Feedback (VERIFIED_OBSERVATION)
    const feedback = await Feedback.findOne({
      predictionId: updatedPrediction._id,
    });
    assert.ok(feedback, 'Feedback record must be generated automatically');
    assert.strictEqual(feedback.feedbackType, 'VERIFIED_OBSERVATION');
    assert.strictEqual(feedback.feedbackStatus, 'READY_FOR_MODEL_UPDATE');

    // 11. STEP 11: Admin Lifecycle Trace Verification
    const trace = await getPredictionTrace('PRED-E2E-SUCCESS-001');
    assert.ok(trace.prediction);
    assert.ok(trace.predictionCycle);
    assert.ok(trace.assignment);
    assert.ok(trace.officer);
    assert.ok(trace.verification);
    assert.ok(trace.evaluation);
    assert.ok(trace.feedback);
  });

  // ----------------------------------------------------
  // SECTION 20: FALSE POSITIVE SCENARIO
  // ----------------------------------------------------
  it('False Positive Scenario: Prediction -> Verified (Not Found) -> False Positive -> Feedback Signal', async () => {
    // 1. Create Prediction
    const pred = await Prediction.create({
      predictionId: 'PRED-E2E-FP-002',
      predictionCycleId: cycleDoc._id,
      complaintType: 'Solid Waste Accumulation',
      department: 'Streets & Sanitation',
      communityArea: 'The Loop',
      ward: 'Ward 42',
      location: { type: 'Point', coordinates: [-87.63, 41.88] },
      probability: 0.82,
      riskScore: 81.0,
      riskLevel: 'HIGH',
      verificationStatus: 'PENDING_VERIFICATION',
      assignedOfficer: officerADoc._id,
      assignedOfficerId: officerADoc._id,
    });

    // 2. Create Assignment
    const asgn = await Assignment.create({
      assignmentId: 'ASGN-E2E-FP-002',
      predictionId: pred._id,
      officerId: officerADoc._id,
      department: 'Streets & Sanitation',
      status: 'IN_PROGRESS',
      assignedAt: new Date(),
    });

    // 3. Officer submits Verification: PROBLEM_NOT_FOUND
    const verifRes = await fetch(`${baseUrl}/officer/verifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerAToken}`,
      },
      body: JSON.stringify({
        predictionId: 'PRED-E2E-FP-002',
        outcome: 'PROBLEM_NOT_FOUND',
        severity: 'LOW',
        notes: 'Area is completely clear. No garbage accumulation detected.',
        gpsAvailable: false,
      }),
    });
    assert.strictEqual(verifRes.status, 201);

    // 4. Verify Evaluation is FALSE_POSITIVE and Feedback is FALSE_POSITIVE_SIGNAL
    const evalDoc = await Evaluation.findOne({ predictionId: pred._id });
    assert.ok(evalDoc);
    assert.strictEqual(evalDoc.classification, 'FALSE_POSITIVE');

    const fbDoc = await Feedback.findOne({ predictionId: pred._id });
    assert.ok(fbDoc);
    assert.strictEqual(fbDoc.feedbackType, 'FALSE_POSITIVE_SIGNAL');
  });

  // ----------------------------------------------------
  // SECTION 21: UNABLE TO VERIFY SCENARIO
  // ----------------------------------------------------
  it('Unable to Verify Scenario: Prediction -> Verified (Unable) -> Undetermined -> Data Quality Issue', async () => {
    // 1. Create Prediction
    const pred = await Prediction.create({
      predictionId: 'PRED-E2E-UNABLE-003',
      predictionCycleId: cycleDoc._id,
      complaintType: 'Water Main Leak',
      department: 'Water & Drainage',
      communityArea: 'Near North Side',
      ward: 'Ward 43',
      location: { type: 'Point', coordinates: [-87.625, 41.895] },
      probability: 0.75,
      riskScore: 72.0,
      riskLevel: 'MEDIUM',
      verificationStatus: 'PENDING_VERIFICATION',
      assignedOfficer: officerBDoc._id,
      assignedOfficerId: officerBDoc._id,
    });

    // 2. Create Assignment
    await Assignment.create({
      assignmentId: 'ASGN-E2E-UNABLE-003',
      predictionId: pred._id,
      officerId: officerBDoc._id,
      department: 'Water & Drainage',
      status: 'IN_PROGRESS',
      assignedAt: new Date(),
    });

    // 3. Officer submits Verification: UNABLE_TO_VERIFY
    const verifRes = await fetch(`${baseUrl}/officer/verifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerBToken}`,
      },
      body: JSON.stringify({
        predictionId: 'PRED-E2E-UNABLE-003',
        outcome: 'UNABLE_TO_VERIFY',
        severity: 'LOW',
        notes: 'Gated construction site; entrance locked by contractors.',
        gpsAvailable: true,
      }),
    });
    assert.strictEqual(verifRes.status, 201);

    // 4. Verify Evaluation is UNDETERMINED (not False Positive) and Feedback is DATA_QUALITY_ISSUE
    const evalDoc = await Evaluation.findOne({ predictionId: pred._id });
    assert.ok(evalDoc);
    assert.strictEqual(evalDoc.classification, 'UNDETERMINED');

    const fbDoc = await Feedback.findOne({ predictionId: pred._id });
    assert.ok(fbDoc);
    assert.strictEqual(fbDoc.feedbackType, 'DATA_QUALITY_ISSUE');
  });

  // ----------------------------------------------------
  // SECTION 22: OFFICER ISOLATION SECURITY
  // ----------------------------------------------------
  it('Officer Isolation: Officer B cannot accept, start, or verify Officer A assignment', async () => {
    // 1. Create Prediction & Assignment for Officer A
    const pred = await Prediction.create({
      predictionId: 'PRED-E2E-ISOLATION-004',
      predictionCycleId: cycleDoc._id,
      complaintType: 'Pothole & Asphalt Break',
      department: 'Streets & Sanitation',
      communityArea: 'The Loop',
      ward: 'Ward 42',
      location: { type: 'Point', coordinates: [-87.6298, 41.8781] },
      probability: 0.85,
      riskScore: 84.0,
      riskLevel: 'HIGH',
      verificationStatus: 'ASSIGNED',
      assignedOfficer: officerADoc._id,
      assignedOfficerId: officerADoc._id,
    });

    const asgn = await Assignment.create({
      assignmentId: 'ASGN-E2E-ISOLATION-004',
      predictionId: pred._id,
      officerId: officerADoc._id,
      department: 'Streets & Sanitation',
      status: 'AI_ASSIGNED',
      assignedAt: new Date(),
    });

    // 2. Officer B attempts to accept Officer A assignment -> 403 Forbidden
    const acceptRes = await fetch(
      `${baseUrl}/officer/assignments/${asgn.assignmentId}/accept`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${officerBToken}` },
      }
    );
    assert.strictEqual(acceptRes.status, 403);

    // 3. Officer B attempts to submit verification for Officer A prediction -> 403 Forbidden
    const verifRes = await fetch(`${baseUrl}/officer/verifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerBToken}`,
      },
      body: JSON.stringify({
        predictionId: 'PRED-E2E-ISOLATION-004',
        outcome: 'PROBLEM_CONFIRMED',
      }),
    });
    assert.strictEqual(verifRes.status, 403);
  });

  // ----------------------------------------------------
  // SECTION 25: DUPLICATE VERIFICATION PROTECTION
  // ----------------------------------------------------
  it('Duplicate Verification Protection: Rejects 2nd verification submission with 409 Conflict', async () => {
    const pred = await Prediction.create({
      predictionId: 'PRED-E2E-DUP-005',
      predictionCycleId: cycleDoc._id,
      complaintType: 'Pothole & Asphalt Break',
      department: 'Streets & Sanitation',
      communityArea: 'The Loop',
      ward: 'Ward 42',
      location: { type: 'Point', coordinates: [-87.6298, 41.8781] },
      probability: 0.85,
      riskScore: 84.0,
      riskLevel: 'HIGH',
      verificationStatus: 'ASSIGNED',
      assignedOfficer: officerADoc._id,
      assignedOfficerId: officerADoc._id,
    });

    await Assignment.create({
      assignmentId: 'ASGN-E2E-DUP-005',
      predictionId: pred._id,
      officerId: officerADoc._id,
      department: 'Streets & Sanitation',
      status: 'IN_PROGRESS',
      assignedAt: new Date(),
    });

    // First verification -> 201 Created
    const firstVerif = await fetch(`${baseUrl}/officer/verifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerAToken}`,
      },
      body: JSON.stringify({
        predictionId: 'PRED-E2E-DUP-005',
        outcome: 'PROBLEM_CONFIRMED',
        notes: 'Initial observation.',
      }),
    });
    assert.strictEqual(firstVerif.status, 201);

    // Second verification attempt on same prediction -> 409 Conflict
    const secondVerif = await fetch(`${baseUrl}/officer/verifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerAToken}`,
      },
      body: JSON.stringify({
        predictionId: 'PRED-E2E-DUP-005',
        outcome: 'PROBLEM_CONFIRMED',
        notes: 'Duplicate observation attempt.',
      }),
    });
    assert.strictEqual(secondVerif.status, 409);
    const secondData = await secondVerif.json();
    assert.strictEqual(secondData.success, false);
    assert.ok(secondData.message.includes('already submitted'));
  });

  // ----------------------------------------------------
  // SECTION 29: STATUS TRANSITION VALIDATION
  // ----------------------------------------------------
  it('Status Transition Validation: Invalid state transitions are rejected with 400 Bad Request', async () => {
    const pred = await Prediction.create({
      predictionId: 'PRED-E2E-TRANS-006',
      predictionCycleId: cycleDoc._id,
      complaintType: 'Pothole & Asphalt Break',
      department: 'Streets & Sanitation',
      communityArea: 'The Loop',
      ward: 'Ward 42',
      location: { type: 'Point', coordinates: [-87.6298, 41.8781] },
      probability: 0.85,
      riskScore: 84.0,
      riskLevel: 'HIGH',
      verificationStatus: 'ASSIGNED',
      assignedOfficer: officerADoc._id,
      assignedOfficerId: officerADoc._id,
    });

    const asgn = await Assignment.create({
      assignmentId: 'ASGN-E2E-TRANS-006',
      predictionId: pred._id,
      officerId: officerADoc._id,
      department: 'Streets & Sanitation',
      status: 'COMPLETED', // Already completed
      assignedAt: new Date(),
      completedAt: new Date(),
    });

    // Attempting COMPLETED -> IN_PROGRESS transition -> 400 Bad Request
    const invalidTrans = await fetch(
      `${baseUrl}/officer/assignments/${asgn.assignmentId}/start`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${officerAToken}` },
      }
    );
    assert.strictEqual(invalidTrans.status, 400);
    const errData = await invalidTrans.json();
    assert.ok(errData.message.includes('Invalid assignment status transition'));
  });

  // ----------------------------------------------------
  // SECTION 32: DATABASE CONSISTENCY DIAGNOSTIC CHECK
  // ----------------------------------------------------
  it('Database Consistency Check: No orphan assignments, verifications, evaluations, or negative workloads', async () => {
    const diagnostic = await checkDatabaseConsistency();
    assert.strictEqual(diagnostic.healthy, true, 'Database should be completely consistent');
    assert.strictEqual(diagnostic.totalIssuesFound, 0);
    assert.ok(diagnostic.totalRecordsChecked.predictions >= 5);
    assert.ok(diagnostic.totalRecordsChecked.officers >= 5);
  });
});
