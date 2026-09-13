const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/database');
const {
  User,
  ROLES,
  Officer,
  AVAILABILITY_STATUS,
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
const {
  createTestAdmin,
  createTestOfficer,
  createTestPrediction,
  createTestAssignment,
  createTestVerification,
  createTestEvaluation,
  createTestFeedback,
  createTestPredictionCycle,
  cleanupTestDatabase,
} = require('./helpers/factories');
const { assignPrediction } = require('../src/services/assignmentService');
const { checkDatabaseConsistency } = require('../src/services/consistencyService');

describe('Module 16: Automated Backend Verification Suite', () => {
  let server;
  let baseUrl;
  let rawBaseUrl;

  before(async () => {
    await connectDB();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        rawBaseUrl = `http://127.0.0.1:${port}`;
        baseUrl = `http://127.0.0.1:${port}/api/v1`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  });

  // ====================================================
  // SECTION 5 & 6: AUTHENTICATION & PASSWORD SECURITY
  // ====================================================
  describe('Authentication & Password Security (Sections 5 & 6)', () => {
    it('Registers new Officer and verifies password is never stored in plaintext or exposed', async () => {
      const email = `jordan.reed.${Date.now()}@test.civic.gov`;
      const payload = {
        name: 'Officer Jordan Reed',
        email,
        password: 'SecurePassword123!',
        department: 'Streets & Sanitation',
      };

      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      assert.strictEqual(res.status, 201);
      assert.strictEqual(data.success, true);
      assert.ok(data.data.token);
      assert.strictEqual(data.data.user.email, payload.email);

      // Verify DB stores hash and not plaintext
      const userInDb = await User.findOne({ email: payload.email }).select('+passwordHash');
      assert.ok(userInDb.passwordHash);
      assert.notStrictEqual(userInDb.passwordHash, payload.password);
      const isMatch = await bcrypt.compare(payload.password, userInDb.passwordHash);
      assert.strictEqual(isMatch, true);

      // Verify response does NOT expose password or passwordHash
      const responseStr = JSON.stringify(data);
      assert.strictEqual(responseStr.includes('passwordHash'), false);
      assert.strictEqual(responseStr.includes('SecurePassword123!'), false);
    });

    it('Login succeeds with correct password and fails with incorrect password (401)', async () => {
      const email = `login.test.${Date.now()}@test.civic.gov`;
      const { user } = await createTestOfficer({
        email,
        password: 'ValidPassword123!',
      });

      // 1. Success
      const resSuccess = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'ValidPassword123!',
        }),
      });
      const dataSuccess = await resSuccess.json();
      assert.strictEqual(resSuccess.status, 200);
      assert.strictEqual(dataSuccess.success, true);
      assert.ok(dataSuccess.data.token);

      // 2. Failure with wrong password
      const resFail = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'WrongPassword!',
        }),
      });
      const dataFail = await resFail.json();
      assert.strictEqual(resFail.status, 401);
      assert.strictEqual(dataFail.success, false);
      assert.ok(dataFail.message.includes('Invalid email or password'));
    });

    it('Inactive user accounts cannot authenticate (403 Forbidden)', async () => {
      const email = `inactive.user.${Date.now()}@test.civic.gov`;
      await createTestOfficer({
        email,
        password: 'Password123!',
        isActive: false,
      });

      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'Password123!',
        }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('deactivated'));
    });
  });

  // ====================================================
  // SECTION 7: ROLE-BASED ACCESS CONTROL (RBAC)
  // ====================================================
  describe('Role-Based Access Control (Section 7)', () => {
    it('Admin can access Admin APIs; Officer accessing Admin API receives 403 Forbidden', async () => {
      const { token: adminToken } = await createTestAdmin();
      const { token: officerToken } = await createTestOfficer();

      // Admin -> Admin Dashboard (200 OK)
      const resAdmin = await fetch(`${baseUrl}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resAdmin.status, 200);

      // Officer -> Admin Dashboard (403 Forbidden)
      const resOfficer = await fetch(`${baseUrl}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      const dataOfficer = await resOfficer.json();
      assert.strictEqual(resOfficer.status, 403);
      assert.strictEqual(dataOfficer.success, false);
      assert.ok(dataOfficer.message.includes('Access forbidden'));

      // Unauthenticated -> Admin Dashboard (401 Unauthorized)
      const resAnon = await fetch(`${baseUrl}/admin/dashboard`);
      assert.strictEqual(resAnon.status, 401);
    });
  });

  // ====================================================
  // SECTION 8 & 9: OFFICER & DEPARTMENT ISOLATION
  // ====================================================
  describe('Officer & Department Isolation (Sections 8 & 9)', () => {
    it('Officer A cannot access, modify, or verify Assignment B belonging to Officer B', async () => {
      const { officer: officerA, token: tokenA } = await createTestOfficer({
        department: 'Streets & Sanitation',
      });
      const { officer: officerB, token: tokenB } = await createTestOfficer({
        department: 'Streets & Sanitation',
      });

      const asgnA = await createTestAssignment({
        officer: officerA,
        department: 'Streets & Sanitation',
      });
      const asgnB = await createTestAssignment({
        officer: officerB,
        department: 'Streets & Sanitation',
      });

      // Officer A -> Assignment A (200 OK)
      const resA = await fetch(`${baseUrl}/officer/assignments/${asgnA._id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(resA.status, 200);

      // Officer A -> Assignment B (403 Forbidden)
      const resB = await fetch(`${baseUrl}/officer/assignments/${asgnB._id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(resB.status, 403);

      // Officer A -> Modifying Assignment B status (403 Forbidden)
      const resMod = await fetch(`${baseUrl}/officer/assignments/${asgnB._id}/accept`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(resMod.status, 403);

      // Officer A -> Submitting verification for Assignment B prediction (403 Forbidden)
      const resVerif = await fetch(`${baseUrl}/officer/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          predictionId: asgnB.predictionId,
          outcome: 'PROBLEM_CONFIRMED',
          severity: 'HIGH',
        }),
      });
      assert.strictEqual(resVerif.status, 403);
    });

    it('Officer heatmap enforces department isolation and blocks query spoofing', async () => {
      const { token: tokenSanitation } = await createTestOfficer({
        department: 'Streets & Sanitation',
      });

      await createTestPrediction({
        department: 'Streets & Sanitation',
        complaintType: 'Pothole Wave',
      });
      await createTestPrediction({
        department: 'Police',
        complaintType: 'Illegal Parking Surge',
      });

      // Officer requests heatmap with malicious query: ?department=Police
      const res = await fetch(`${baseUrl}/officer/heatmap?department=Police`, {
        headers: { Authorization: `Bearer ${tokenSanitation}` },
      });
      const data = await res.json();

      // Enforced department isolation: Returns 403 or filters strictly to officer department
      if (res.status === 200) {
        assert.strictEqual(data.data.type, 'FeatureCollection');
        for (const f of data.data.features) {
          assert.strictEqual(f.properties.department, 'Streets & Sanitation');
        }
      } else {
        assert.strictEqual(res.status, 403);
      }
    });
  });

  // ====================================================
  // SECTION 10: OFFICER CRUD & DEACTIVATION
  // ====================================================
  describe('Officer CRUD & Soft Deactivation (Section 10)', () => {
    it('Admin creates, reads, updates, and soft deactivates an officer', async () => {
      const { token: adminToken } = await createTestAdmin();

      // 1. Create
      const uid = `${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
      const resCreate = await fetch(`${baseUrl}/admin/officers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Inspector Leslie Knope',
          employeeCode: `EMP-LK-${uid}`,
          officerId: `OFF-LK-${uid}`,
          department: 'Parks & Recreation',
          location: { type: 'Point', coordinates: [-87.6298, 41.8781] },
        }),
      });
      const dataCreate = await resCreate.json();
      assert.strictEqual(resCreate.status, 201);
      const officerKey = dataCreate.data.officer.officerId || dataCreate.data.officer._id;

      // 2. Read
      const resRead = await fetch(`${baseUrl}/admin/officers/${officerKey}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(resRead.status, 200);

      // 3. Update
      const resUpdate = await fetch(`${baseUrl}/admin/officers/${officerKey}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ phone: '312-555-8888' }),
      });
      const dataUpdate = await resUpdate.json();
      assert.strictEqual(resUpdate.status, 200);
      assert.strictEqual(dataUpdate.data.officer.phone, '312-555-8888');

      // 4. Soft Deactivate
      const resDel = await fetch(`${baseUrl}/admin/officers/${officerKey}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const dataDel = await resDel.json();
      assert.strictEqual(resDel.status, 200);
      assert.strictEqual(dataDel.data.officer.active, false);
      assert.strictEqual(dataDel.data.officer.availability, 'OFF_DUTY');
    });
  });

  // ====================================================
  // SECTION 11 & 12: PREDICTION CREATION & IMMUTABILITY
  // ====================================================
  describe('Prediction Lifecycle & Immutability (Sections 11 & 12)', () => {
    it('Creates valid predicted problem and prevents illegal bounds', async () => {
      const { token: adminToken } = await createTestAdmin();

      // Invalid probability (> 1)
      const resInvalid = await fetch(`${baseUrl}/admin/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          complaintType: 'Pothole Wave',
          department: 'Streets & Sanitation',
          probability: 1.5, // Invalid
          riskScore: 80,
          riskLevel: 'HIGH',
        }),
      });
      assert.strictEqual(resInvalid.status, 400);

      // Valid Prediction creation
      const resValid = await fetch(`${baseUrl}/admin/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          complaintType: 'Pothole Wave',
          department: 'Streets & Sanitation',
          communityArea: 'The Loop',
          ward: 'Ward 42',
          location: { type: 'Point', coordinates: [-87.6298, 41.8781] },
          probability: 0.85,
          riskScore: 82.0,
          riskLevel: 'HIGH',
        }),
      });
      const dataValid = await resValid.json();
      assert.strictEqual(resValid.status, 201);
      assert.strictEqual(dataValid.data.prediction.probability, 0.85);
      assert.strictEqual(dataValid.data.prediction.riskScore, 82.0);
    });

    it('Original prediction values remain immutable after verification observations', async () => {
      const { officer, token: officerToken } = await createTestOfficer({
        department: 'Streets & Sanitation',
      });
      const pred = await createTestPrediction({
        department: 'Streets & Sanitation',
        probability: 0.91,
        riskScore: 94.0,
        riskLevel: 'CRITICAL',
        assignedOfficer: officer._id,
        verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      });
      await createTestAssignment({
        prediction: pred,
        officer,
        status: ASSIGNMENT_STATUS.IN_PROGRESS,
      });

      // Officer verifies PROBLEM_NOT_FOUND (False positive observation)
      const resVerif = await fetch(`${baseUrl}/officer/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${officerToken}`,
        },
        body: JSON.stringify({
          predictionId: pred.predictionId,
          outcome: 'PROBLEM_NOT_FOUND',
          notes: 'No issue found upon inspection.',
        }),
      });
      assert.strictEqual(resVerif.status, 201);

      // Reload prediction and verify original forecast is IMMUTABLE
      const updatedPred = await Prediction.findById(pred._id);
      assert.strictEqual(updatedPred.probability, 0.91, 'Probability must remain immutable');
      assert.strictEqual(updatedPred.riskScore, 94.0, 'Risk score must remain immutable');
      assert.strictEqual(updatedPred.riskLevel, 'CRITICAL', 'Risk level must remain immutable');
      assert.strictEqual(
        updatedPred.verificationStatus,
        VERIFICATION_STATUS.VERIFIED_FALSE,
        'Verification status reflects observation without altering original forecast'
      );
    });
  });

  // ====================================================
  // SECTION 13, 14, 15: AI DISPATCH ASSIGNMENT LOGIC
  // ====================================================
  describe('AI Dispatch Assignment & Constraints (Sections 13, 14, 15)', () => {
    it('Assigns eligible department officer and prefers lower-workload candidate', async () => {
      const dept = `Water & Drainage ${Date.now()}`;
      const { officer: officerBusy } = await createTestOfficer({
        department: dept,
        currentWorkload: 5,
        coordinates: [-87.6298, 41.8781],
      });
      const { officer: officerAvailable } = await createTestOfficer({
        department: dept,
        currentWorkload: 1,
        coordinates: [-87.6298, 41.8781],
      });
      const { officer: officerPolice } = await createTestOfficer({
        department: 'Police',
        currentWorkload: 0,
        coordinates: [-87.6298, 41.8781],
      });

      const prediction = await createTestPrediction({
        department: dept,
        coordinates: [-87.6298, 41.8781],
      });

      const assignment = await assignPrediction(prediction._id);

      assert.ok(assignment);
      assert.strictEqual(assignment.department, dept);
      // Police officer was excluded (Section 14)
      assert.notStrictEqual(assignment.officerId._id.toString(), officerPolice._id.toString());
      // Lower workload officer preferred (Section 15)
      assert.strictEqual(assignment.officerId._id.toString(), officerAvailable._id.toString());
      assert.strictEqual(assignment.status, ASSIGNMENT_STATUS.AI_ASSIGNED);
    });
  });

  // ====================================================
  // SECTION 16 & 17: ASSIGNMENT STATE TRANSITIONS
  // ====================================================
  describe('Assignment State Machine & Transition Hardening (Sections 16 & 17)', () => {
    it('Accepts valid state progression and rejects illegal transitions with 400/409', async () => {
      const { officer, token: officerToken } = await createTestOfficer();
      const asgn = await createTestAssignment({
        officer,
        status: ASSIGNMENT_STATUS.AI_ASSIGNED,
      });

      // 1. AI_ASSIGNED -> ACCEPTED (Valid)
      const resAccept = await fetch(`${baseUrl}/officer/assignments/${asgn._id}/accept`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      assert.strictEqual(resAccept.status, 200);

      // 2. ACCEPTED -> IN_PROGRESS (Valid)
      const resStart = await fetch(`${baseUrl}/officer/assignments/${asgn._id}/start`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      assert.strictEqual(resStart.status, 200);

      // 3. Complete assignment directly
      asgn.status = ASSIGNMENT_STATUS.COMPLETED;
      await asgn.save();

      // 4. COMPLETED -> IN_PROGRESS (Invalid: returns 400/409)
      const resIllegal = await fetch(`${baseUrl}/officer/assignments/${asgn._id}/start`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      assert.strictEqual(resIllegal.status, 400);
    });
  });

  // ====================================================
  // SECTION 18-23: FIELD VERIFICATION & GPS HARDENING
  // ====================================================
  describe('Field Verification, GPS Validation & Duplication Defense (Sections 18-23)', () => {
    it('Submits verification with all valid outcomes and server-generated timestamps', async () => {
      const outcomes = [
        VERIFICATION_OUTCOMES.PROBLEM_CONFIRMED,
        VERIFICATION_OUTCOMES.PROBLEM_NOT_FOUND,
        VERIFICATION_OUTCOMES.DIFFERENT_PROBLEM,
        VERIFICATION_OUTCOMES.DUPLICATE,
        VERIFICATION_OUTCOMES.UNABLE_TO_VERIFY,
      ];

      for (const outcome of outcomes) {
        const { officer, token } = await createTestOfficer();
        const pred = await createTestPrediction({
          assignedOfficer: officer._id,
          verificationStatus: VERIFICATION_STATUS.ASSIGNED,
        });
        await createTestAssignment({
          prediction: pred,
          officer,
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
            outcome,
            severity: 'HIGH',
            notes: `Observation test for ${outcome}`,
            latitude: 41.8781,
            longitude: -87.6298,
            verifiedAt: '1999-01-01T00:00:00.000Z', // Client-forged timestamp (must be ignored)
          }),
        });
        const data = await res.json();
        assert.strictEqual(res.status, 201);
        assert.strictEqual(data.data.verification.outcome, outcome);

        // Verify verifiedAt is contemporary server time, not the forged 1999 timestamp
        const recordTime = new Date(data.data.verification.verifiedAt).getFullYear();
        assert.ok(recordTime >= 2026);
      }
    });

    it('Duplicate verification submissions return 409 Conflict', async () => {
      const { officer, token } = await createTestOfficer();
      const pred = await createTestPrediction({
        assignedOfficer: officer._id,
        verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      });
      await createTestAssignment({
        prediction: pred,
        officer,
        status: ASSIGNMENT_STATUS.IN_PROGRESS,
      });

      // 1st verification submission -> 201 Created
      const res1 = await fetch(`${baseUrl}/officer/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          predictionId: pred.predictionId,
          outcome: 'PROBLEM_CONFIRMED',
          severity: 'HIGH',
        }),
      });
      assert.strictEqual(res1.status, 201);

      // 2nd duplicate submission -> 409 Conflict
      const res2 = await fetch(`${baseUrl}/officer/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          predictionId: pred.predictionId,
          outcome: 'PROBLEM_CONFIRMED',
          severity: 'HIGH',
        }),
      });
      const data2 = await res2.json();
      assert.strictEqual(res2.status, 409);
      assert.strictEqual(data2.success, false);
      assert.ok(data2.message.includes('already submitted'));
    });
  });

  // ====================================================
  // SECTION 24 & 25: EVALUATION & FEEDBACK SIGNALS
  // ====================================================
  describe('Ground-Truth Evaluation & Feedback Signals (Sections 24 & 25)', () => {
    it('PROBLEM_CONFIRMED generates TRUE_POSITIVE Evaluation and VERIFIED_OBSERVATION Feedback', async () => {
      const { officer, token } = await createTestOfficer();
      const pred = await createTestPrediction({
        assignedOfficer: officer._id,
        verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      });
      await createTestAssignment({
        prediction: pred,
        officer,
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
          outcome: 'PROBLEM_CONFIRMED',
        }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201);

      const evalDoc = await Evaluation.findOne({ predictionId: pred._id });
      assert.ok(evalDoc);
      assert.strictEqual(evalDoc.classification, EVALUATION_CLASSIFICATION.TRUE_POSITIVE);

      const fdbkDoc = await Feedback.findOne({ predictionId: pred._id });
      assert.ok(fdbkDoc);
      assert.strictEqual(fdbkDoc.feedbackType, FEEDBACK_TYPES.VERIFIED_OBSERVATION);
      assert.strictEqual(fdbkDoc.feedbackStatus, FEEDBACK_STATUS.READY_FOR_MODEL_UPDATE);
    });

    it('UNABLE_TO_VERIFY generates UNDETERMINED Evaluation without false penalization', async () => {
      const { officer, token } = await createTestOfficer();
      const pred = await createTestPrediction({
        assignedOfficer: officer._id,
        verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      });
      await createTestAssignment({
        prediction: pred,
        officer,
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
          outcome: 'UNABLE_TO_VERIFY',
        }),
      });
      assert.strictEqual(res.status, 201);

      const evalDoc = await Evaluation.findOne({ predictionId: pred._id });
      assert.ok(evalDoc);
      assert.strictEqual(evalDoc.classification, EVALUATION_CLASSIFICATION.UNDETERMINED);
    });
  });

  // ====================================================
  // SECTION 26, 27, 28: COMPLETE END-TO-END WORKFLOW
  // ====================================================
  describe('Complete End-to-End Workflow & Traceability (Sections 26, 27, 28)', () => {
    it('Executes full lifecycle: Prediction -> Dispatch -> Accept -> Verify -> Evaluate -> Feedback -> Trace', async () => {
      const { token: adminToken } = await createTestAdmin();
      const { officer, token: officerToken } = await createTestOfficer({
        department: 'Streets & Sanitation',
        currentWorkload: 0,
      });

      // 1. Create Prediction
      const cycle = await createTestPredictionCycle();
      const pred = await createTestPrediction({
        predictionCycleId: cycle._id,
        department: 'Streets & Sanitation',
      });

      // 2. Dispatch Assignment
      const asgn = await assignPrediction(pred._id);
      assert.strictEqual(asgn.status, ASSIGNMENT_STATUS.AI_ASSIGNED);

      // Get assigned officer user context
      const assignedOfficerDoc = await Officer.findById(asgn.officerId._id || asgn.officerId);
      const assignedUserDoc = await User.findById(assignedOfficerDoc.userId);
      const assignedToken = require('../src/utils/jwt').generateToken(assignedUserDoc);

      // 3. Officer Accepts
      const resAccept = await fetch(`${baseUrl}/officer/assignments/${asgn._id}/accept`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${assignedToken}` },
      });
      assert.strictEqual(resAccept.status, 200);

      // 4. Officer Starts
      const resStart = await fetch(`${baseUrl}/officer/assignments/${asgn._id}/start`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${assignedToken}` },
      });
      assert.strictEqual(resStart.status, 200);

      // 5. Officer Submits Verification
      const resVerif = await fetch(`${baseUrl}/officer/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assignedToken}`,
        },
        body: JSON.stringify({
          predictionId: pred.predictionId,
          outcome: 'PROBLEM_CONFIRMED',
          severity: 'CRITICAL',
          notes: 'End-to-end full verification verified.',
        }),
      });
      assert.strictEqual(resVerif.status, 201);

      // 6. Admin checks Prediction Trace (Complete 7-node relational graph)
      const resTrace = await fetch(`${baseUrl}/admin/predictions/${pred.predictionId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const dataTrace = await resTrace.json();

      assert.strictEqual(resTrace.status, 200);
      assert.strictEqual(dataTrace.success, true);

      const body = dataTrace.data;
      assert.ok(body.prediction);
      assert.ok(body.predictionCycle);
      assert.ok(body.assignedOfficer);
      assert.ok(body.assignment);
      assert.ok(body.verification);
      assert.ok(body.evaluation);
      assert.ok(body.feedback);
      assert.strictEqual(body.assignment.status, ASSIGNMENT_STATUS.COMPLETED);
      assert.strictEqual(body.evaluation.classification, EVALUATION_CLASSIFICATION.TRUE_POSITIVE);
    });
  });

  // ====================================================
  // SECTION 34-37: HARDENING, HEALTH & CONSISTENCY
  // ====================================================
  describe('Hardening, Health Check & Referential Integrity (Sections 34-37)', () => {
    it('GET /api/health returns 200 with active database status', async () => {
      const res = await fetch(`${rawBaseUrl}/api/health`);
      const data = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.status, 'healthy');
      assert.strictEqual(data.data.database, 'connected');
    });

    it('Unknown route returns standard 404 JSON response', async () => {
      const res = await fetch(`${baseUrl}/does-not-exist`);
      const data = await res.json();

      assert.strictEqual(res.status, 404);
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('Route not found'));
      assert.ok(Array.isArray(data.errors));
    });

    it('Database consistency check reports zero orphan records and non-negative workloads', async () => {
      const consistency = await checkDatabaseConsistency();
      assert.strictEqual(consistency.healthy, true);
      assert.strictEqual(consistency.totalIssuesFound, 0);
    });
  });
});
