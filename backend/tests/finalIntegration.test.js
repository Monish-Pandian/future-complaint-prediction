const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/database');
const {
  User,
  Officer,
  Prediction,
  PredictionCycle,
  Assignment,
  Verification,
  Evaluation,
  Feedback,
  CYCLE_STATUS,
  VERIFICATION_STATUS,
  ASSIGNMENT_STATUS,
  VERIFICATION_OUTCOMES,
  EVALUATION_CLASSIFICATION,
  FEEDBACK_TYPES,
} = require('../src/models');
const {
  createTestAdmin,
  createTestOfficer,
  createTestPrediction,
  createTestAssignment,
  createTestPredictionCycle,
} = require('./helpers/factories');
const { ingestPredictionCycle } = require('../src/services/aiService');
const { generateToken } = require('../src/utils/jwt');

describe('Module 20: Final Integration & End-to-End Verification Suite', () => {
  let server;
  let baseUrl;
  let adminUser;
  let adminToken;

  before(async () => {
    await connectDB();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api/v1`;
        resolve();
      });
    });

    const adminData = await createTestAdmin();
    adminUser = adminData.user;
    adminToken = adminData.token;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  });

  // ====================================================
  // 1. MULTI-CYCLE ISOLATION & PREDICTION IMMUTABILITY
  // ====================================================
  describe('1. Multi-Cycle Isolation & Prediction Immutability', () => {
    it('Preserves Cycle 1 predictions untouched when Cycle 2 is generated', async () => {
      const cycle1Number = Math.floor(100000 + Math.random() * 900000);
      const cycle2Number = cycle1Number + 1;

      // Ingest Cycle 1
      const cycle1Result = await ingestPredictionCycle(
        {
          cycleNumber: cycle1Number,
          modelVersion: 'model-v1',
          areas: [
            { communityArea: 'Near North Side', ward: 'Ward 42', department: 'Streets & Sanitation', complaintType: 'Pothole Wave' },
          ],
        },
        { forceMock: true }
      );
      const pred1 = cycle1Result.predictions[0];
      const initialProb = pred1.probability;
      const initialScore = pred1.riskScore;

      // Ingest Cycle 2 with higher forecast
      const cycle2Result = await ingestPredictionCycle(
        {
          cycleNumber: cycle2Number,
          modelVersion: 'model-v2',
          areas: [
            { communityArea: 'Near North Side', ward: 'Ward 42', department: 'Streets & Sanitation', complaintType: 'Pothole Wave' },
          ],
        },
        { forceMock: true }
      );
      const pred2 = cycle2Result.predictions[0];

      // Assert Cycle 1 and Cycle 2 are distinct records
      assert.notStrictEqual(pred1._id.toString(), pred2._id.toString());
      assert.strictEqual(pred1.modelVersion, 'model-v1');
      assert.strictEqual(pred2.modelVersion, 'model-v2');

      // Assert Cycle 1 prediction values were never mutated
      const reloadedPred1 = await Prediction.findById(pred1._id);
      assert.strictEqual(reloadedPred1.probability, initialProb);
      assert.strictEqual(reloadedPred1.riskScore, initialScore);
      assert.strictEqual(reloadedPred1.modelVersion, 'model-v1');
    });
  });

  // ====================================================
  // 2. COMPREHENSIVE OUTCOME & EVALUATION MATRIX
  // ====================================================
  describe('2. Comprehensive Outcome & Evaluation Matrix', () => {
    it('Outcome: PROBLEM_CONFIRMED -> TRUE_POSITIVE & VERIFIED_OBSERVATION', async () => {
      const dept = `Dept-Confirm-${Date.now()}`;
      const { officer, token } = await createTestOfficer({ department: dept });
      const pred = await createTestPrediction({
        department: dept,
        assignedOfficer: officer._id,
        verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      });
      await createTestAssignment({
        prediction: pred,
        officer,
        department: dept,
        status: ASSIGNMENT_STATUS.IN_PROGRESS,
      });

      const res = await fetch(`${baseUrl}/officer/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          predictionId: pred.predictionId,
          outcome: VERIFICATION_OUTCOMES.PROBLEM_CONFIRMED,
          severity: 'HIGH',
          notes: 'Pothole verified on-site.',
          latitude: 41.8781,
          longitude: -87.6298,
        }),
      });

      assert.strictEqual(res.status, 201);
      const evalDoc = await Evaluation.findOne({ predictionId: pred._id });
      assert.strictEqual(evalDoc.classification, EVALUATION_CLASSIFICATION.TRUE_POSITIVE);

      const fdbkDoc = await Feedback.findOne({ predictionId: pred._id });
      assert.strictEqual(fdbkDoc.feedbackType, FEEDBACK_TYPES.VERIFIED_OBSERVATION);

      const updatedPred = await Prediction.findById(pred._id);
      assert.strictEqual(updatedPred.verificationStatus, VERIFICATION_STATUS.VERIFIED_TRUE);
    });

    it('Outcome: PROBLEM_NOT_FOUND -> FALSE_POSITIVE & FALSE_POSITIVE_SIGNAL', async () => {
      const dept = `Dept-NotFound-${Date.now()}`;
      const { officer, token } = await createTestOfficer({ department: dept });
      const pred = await createTestPrediction({
        department: dept,
        assignedOfficer: officer._id,
        verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      });
      await createTestAssignment({
        prediction: pred,
        officer,
        department: dept,
        status: ASSIGNMENT_STATUS.IN_PROGRESS,
      });

      const res = await fetch(`${baseUrl}/officer/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          predictionId: pred.predictionId,
          outcome: VERIFICATION_OUTCOMES.PROBLEM_NOT_FOUND,
          notes: 'No issue observed at the predicted coordinates.',
        }),
      });

      assert.strictEqual(res.status, 201);
      const evalDoc = await Evaluation.findOne({ predictionId: pred._id });
      assert.strictEqual(evalDoc.classification, EVALUATION_CLASSIFICATION.FALSE_POSITIVE);

      const fdbkDoc = await Feedback.findOne({ predictionId: pred._id });
      assert.strictEqual(fdbkDoc.feedbackType, FEEDBACK_TYPES.FALSE_POSITIVE_SIGNAL);

      const updatedPred = await Prediction.findById(pred._id);
      assert.strictEqual(updatedPred.verificationStatus, VERIFICATION_STATUS.VERIFIED_FALSE);
    });

    it('Outcome: DIFFERENT_PROBLEM -> FALSE_POSITIVE & FALSE_POSITIVE_SIGNAL', async () => {
      const dept = `Dept-Diff-${Date.now()}`;
      const { officer, token } = await createTestOfficer({ department: dept });
      const pred = await createTestPrediction({
        department: dept,
        assignedOfficer: officer._id,
        verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      });
      await createTestAssignment({
        prediction: pred,
        officer,
        department: dept,
        status: ASSIGNMENT_STATUS.IN_PROGRESS,
      });

      const res = await fetch(`${baseUrl}/officer/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          predictionId: pred.predictionId,
          outcome: VERIFICATION_OUTCOMES.DIFFERENT_PROBLEM,
          notes: 'Street flooding observed instead of predicted pothole.',
        }),
      });

      assert.strictEqual(res.status, 201);
      const evalDoc = await Evaluation.findOne({ predictionId: pred._id });
      assert.strictEqual(evalDoc.classification, EVALUATION_CLASSIFICATION.FALSE_POSITIVE);

      const updatedPred = await Prediction.findById(pred._id);
      assert.strictEqual(updatedPred.verificationStatus, VERIFICATION_STATUS.VERIFIED_FALSE);
    });

    it('Outcome: DUPLICATE -> UNDETERMINED & DATA_QUALITY_ISSUE', async () => {
      const dept = `Dept-Dup-${Date.now()}`;
      const { officer, token } = await createTestOfficer({ department: dept });
      const pred = await createTestPrediction({
        department: dept,
        assignedOfficer: officer._id,
        verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      });
      await createTestAssignment({
        prediction: pred,
        officer,
        department: dept,
        status: ASSIGNMENT_STATUS.IN_PROGRESS,
      });

      const res = await fetch(`${baseUrl}/officer/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          predictionId: pred.predictionId,
          outcome: VERIFICATION_OUTCOMES.DUPLICATE,
          notes: 'Task is a duplicate of a previously resolved complaint.',
        }),
      });

      assert.strictEqual(res.status, 201);
      const evalDoc = await Evaluation.findOne({ predictionId: pred._id });
      assert.strictEqual(evalDoc.classification, EVALUATION_CLASSIFICATION.UNDETERMINED);

      const fdbkDoc = await Feedback.findOne({ predictionId: pred._id });
      assert.strictEqual(fdbkDoc.feedbackType, FEEDBACK_TYPES.DATA_QUALITY_ISSUE);
    });

    it('Outcome: UNABLE_TO_VERIFY -> UNDETERMINED & DATA_QUALITY_ISSUE', async () => {
      const dept = `Dept-Unable-${Date.now()}`;
      const { officer, token } = await createTestOfficer({ department: dept });
      const pred = await createTestPrediction({
        department: dept,
        assignedOfficer: officer._id,
        verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      });
      await createTestAssignment({
        prediction: pred,
        officer,
        department: dept,
        status: ASSIGNMENT_STATUS.IN_PROGRESS,
      });

      const res = await fetch(`${baseUrl}/officer/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          predictionId: pred.predictionId,
          outcome: VERIFICATION_OUTCOMES.UNABLE_TO_VERIFY,
          notes: 'Gated construction area; inspection site inaccessible.',
        }),
      });

      assert.strictEqual(res.status, 201);
      const evalDoc = await Evaluation.findOne({ predictionId: pred._id });
      assert.strictEqual(evalDoc.classification, EVALUATION_CLASSIFICATION.UNDETERMINED);

      const updatedPred = await Prediction.findById(pred._id);
      assert.strictEqual(updatedPred.verificationStatus, VERIFICATION_STATUS.UNABLE_TO_VERIFY);
    });
  });

  // ====================================================
  // 3. CROSS-DEPARTMENT & OFFICER ISOLATION
  // ====================================================
  describe('3. Cross-Department & Officer Isolation', () => {
    it('Enforces strict boundary between Streets & Sanitation and Police officers', async () => {
      const { officer: officerSanitation, token: tokenSanitation } = await createTestOfficer({
        department: 'Streets & Sanitation',
      });
      const { officer: officerPolice, token: tokenPolice } = await createTestOfficer({
        department: 'Police',
      });

      const asgnPolice = await createTestAssignment({
        officer: officerPolice,
        department: 'Police',
      });

      // 1. Officer Sanitation cannot access Officer Police assignment -> 403
      const resAsgn = await fetch(`${baseUrl}/officer/assignments/${asgnPolice._id}`, {
        headers: { Authorization: `Bearer ${tokenSanitation}` },
      });
      assert.strictEqual(resAsgn.status, 403);

      // 2. Officer Sanitation cannot access Police department heatmap -> 403
      const resHeatmap = await fetch(`${baseUrl}/officer/heatmap?department=Police`, {
        headers: { Authorization: `Bearer ${tokenSanitation}` },
      });
      assert.strictEqual(resHeatmap.status, 403);

      // 3. Officer Police cannot access Streets & Sanitation heatmap -> 403
      const resHeatmapPolice = await fetch(
        `${baseUrl}/officer/heatmap?department=Streets%20%26%20Sanitation`,
        {
          headers: { Authorization: `Bearer ${tokenPolice}` },
        }
      );
      assert.strictEqual(resHeatmapPolice.status, 403);

      // 4. Admin has global visibility across all departments -> 200
      const resAdminHeatmap = await fetch(`${baseUrl}/admin/heatmap`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resAdminHeatmap.status, 200);
    });
  });

  // ====================================================
  // 4. STATE MACHINE INVARIANTS & CONCURRENCY
  // ====================================================
  describe('4. State Machine Invariants & Concurrency', () => {
    it('Rejects invalid state transitions (COMPLETED -> IN_PROGRESS, AI_ASSIGNED -> COMPLETED)', async () => {
      const { officer, token } = await createTestOfficer();
      const asgn = await createTestAssignment({
        officer,
        status: ASSIGNMENT_STATUS.COMPLETED,
      });

      // Try jumping from COMPLETED to IN_PROGRESS
      const jump1 = await fetch(`${baseUrl}/officer/assignments/${asgn._id}/start`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.strictEqual(jump1.status, 400);

      // Try jumping from AI_ASSIGNED to COMPLETED directly
      const asgn2 = await createTestAssignment({
        officer,
        status: ASSIGNMENT_STATUS.AI_ASSIGNED,
      });
      const jump2 = await fetch(`${baseUrl}/officer/assignments/${asgn2._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: ASSIGNMENT_STATUS.COMPLETED }),
      });
      assert.strictEqual(jump2.status, 400);
    });

    it('Rejects concurrent / duplicate verification submissions (409 Conflict)', async () => {
      const dept = `Dept-Race-${Date.now()}`;
      const { officer, token } = await createTestOfficer({ department: dept });
      const pred = await createTestPrediction({
        department: dept,
        assignedOfficer: officer._id,
        verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      });
      await createTestAssignment({
        prediction: pred,
        officer,
        department: dept,
        status: ASSIGNMENT_STATUS.IN_PROGRESS,
      });

      // Execute sequential verification submissions for the same assignment
      const res1 = await fetch(`${baseUrl}/officer/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          predictionId: pred.predictionId,
          outcome: VERIFICATION_OUTCOMES.PROBLEM_CONFIRMED,
        }),
      });
      assert.strictEqual(res1.status, 201);

      const res2 = await fetch(`${baseUrl}/officer/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          predictionId: pred.predictionId,
          outcome: VERIFICATION_OUTCOMES.PROBLEM_CONFIRMED,
        }),
      });
      assert.strictEqual(res2.status, 409);
    });
  });

  // ====================================================
  // 5. OFFICER DEACTIVATION & HISTORICAL INTEGRITY
  // ====================================================
  describe('5. Officer Deactivation & Historical Integrity', () => {
    it('Deactivating an officer blocks login but preserves all historical data and assignments', async () => {
      const { user, officer, token } = await createTestOfficer();
      const asgn = await createTestAssignment({ officer });

      // Admin soft deactivates officer
      const deleteRes = await fetch(`${baseUrl}/admin/officers/${officer._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(deleteRes.status, 200);

      // Verify user account is disabled
      const updatedUser = await User.findById(user._id);
      assert.strictEqual(updatedUser.isActive, false);

      // Deactivated officer cannot login (403 Forbidden)
      const loginAttempt = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: 'OfficerPass123!' }),
      });
      assert.strictEqual(loginAttempt.status, 403);

      // Historical assignment record remains completely intact in MongoDB
      const historicalAsgn = await Assignment.findById(asgn._id);
      assert.ok(historicalAsgn);
      assert.strictEqual(historicalAsgn.officerId.toString(), officer._id.toString());
    });
  });

  // ====================================================
  // 6. COMPLETE 7-NODE END-TO-END WORKFLOW INTEGRATION
  // ====================================================
  describe('6. Complete 7-Node End-to-End Workflow Integration', () => {
    it('Validates full lifecycle from AI forecast to Ground-Truth Feedback & Admin Traceability', async () => {
      // Step 1: Admin triggers AI Prediction Cycle
      const cycleNumber = Math.floor(100000 + Math.random() * 900000);
      const cycleRes = await fetch(`${baseUrl}/admin/predictions/run-cycle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          cycleNumber,
          modelVersion: 'e2e-final-v1',
          areas: [
            { communityArea: 'Loop', ward: 'Ward 42', department: 'Streets & Sanitation', complaintType: 'Pothole Wave' },
          ],
        }),
      });
      assert.strictEqual(cycleRes.status, 201);
      const cycleData = await cycleRes.json();
      const prediction = cycleData.data.predictions[0];

      // Step 2: Auto-Assign Prediction to Available Officer
      const assignRes = await fetch(`${baseUrl}/admin/assignments/auto-assign/${prediction.id || prediction._id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(assignRes.status, 200);
      const assignData = await assignRes.json();
      const assignmentId = assignData.data.assignment.id || assignData.data.assignment._id;
      const rawOfficerId = assignData.data.assignment.officerId;
      const officerDocId = typeof rawOfficerId === 'object' ? rawOfficerId.id || rawOfficerId._id : rawOfficerId;

      const assignedOfficerDoc = await Officer.findById(officerDocId).populate('userId');
      const officerJwt = generateToken({
        id: assignedOfficerDoc.userId._id,
        userId: assignedOfficerDoc.userId._id,
        email: assignedOfficerDoc.userId.email,
        role: assignedOfficerDoc.userId.role,
        department: assignedOfficerDoc.department,
        officerId: assignedOfficerDoc.officerId,
      });

      // Step 3: Officer views personal assignments
      const myAsgnRes = await fetch(`${baseUrl}/officer/assignments`, {
        headers: { Authorization: `Bearer ${officerJwt}` },
      });
      assert.strictEqual(myAsgnRes.status, 200);

      // Step 4: Officer accepts assignment
      const acceptRes = await fetch(`${baseUrl}/officer/assignments/${assignmentId}/accept`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${officerJwt}` },
      });
      assert.strictEqual(acceptRes.status, 200);

      // Step 5: Officer starts field verification task
      const startRes = await fetch(`${baseUrl}/officer/assignments/${assignmentId}/start`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${officerJwt}` },
      });
      assert.strictEqual(startRes.status, 200);

      // Step 6: Officer submits field verification observation (PROBLEM_CONFIRMED)
      const verifRes = await fetch(`${baseUrl}/officer/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${officerJwt}`,
        },
        body: JSON.stringify({
          predictionId: prediction.predictionId,
          outcome: VERIFICATION_OUTCOMES.PROBLEM_CONFIRMED,
          severity: 'HIGH',
          notes: 'End-to-End verified problem on-site.',
          latitude: 41.8781,
          longitude: -87.6298,
        }),
      });
      assert.strictEqual(verifRes.status, 201);

      // Step 7: Admin retrieves prediction details & full 7-Node Traceability Graph
      const traceRes = await fetch(`${baseUrl}/admin/predictions/${prediction.predictionId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(traceRes.status, 200);
      const traceData = await traceRes.json();

      // Assert complete 7-Node graph reconstruction
      assert.ok(traceData.data.prediction, 'Node 3: Prediction exists');
      assert.ok(traceData.data.predictionCycle, 'Node 2: PredictionCycle exists');
      assert.ok(traceData.data.assignedOfficer, 'Officer profile exists');
      assert.ok(traceData.data.assignment, 'Node 4: Assignment exists');
      assert.ok(traceData.data.verification, 'Node 5: Verification exists');
      assert.ok(traceData.data.evaluation, 'Node 6: Ground-truth Evaluation exists');
      assert.ok(traceData.data.feedback, 'Node 7: Retraining Feedback signal exists');

      assert.strictEqual(traceData.data.evaluation.classification, EVALUATION_CLASSIFICATION.TRUE_POSITIVE);
      assert.strictEqual(traceData.data.feedback.feedbackType, FEEDBACK_TYPES.VERIFIED_OBSERVATION);
      assert.strictEqual(traceData.data.prediction.verificationStatus, VERIFICATION_STATUS.VERIFIED_TRUE);
    });
  });
});
