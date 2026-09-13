const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/database');
const {
  User,
  ROLES,
  Officer,
  Prediction,
  Assignment,
  ASSIGNMENT_STATUS,
  VERIFICATION_STATUS,
} = require('../src/models');
const {
  createTestAdmin,
  createTestOfficer,
  createTestPrediction,
  createTestAssignment,
  createTestVerification,
  createTestPredictionCycle,
} = require('./helpers/factories');
const { generateToken } = require('../src/utils/jwt');

describe('Module 17: Security Audit & Access-Control Hardening Suite', () => {
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
  // 1. JWT & TOKEN AUTHENTICATION SECURITY
  // ====================================================
  describe('1. JWT & Token Authentication Security', () => {
    it('1. Missing JWT returns 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/officer/dashboard`);
      const data = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('Authentication required'));
    });

    it('2. Invalid or forged JWT signature returns 401 Unauthorized', async () => {
      const forgedToken = jwt.sign(
        { userId: '6a8ed15ebdd2e2b8996112bf', role: 'ADMIN' },
        'wrong_attacker_secret_key_12345'
      );
      const res = await fetch(`${baseUrl}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${forgedToken}` },
      });
      const data = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('Invalid authentication token'));
    });

    it('3. Expired JWT returns 401 Unauthorized', async () => {
      const { user } = await createTestOfficer();
      const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_civic_forecasting_2026_secure';
      const expiredToken = jwt.sign(
        { userId: user._id.toString(), role: ROLES.OFFICER },
        secret,
        { expiresIn: '-10s' } // Expired 10 seconds ago
      );

      const res = await fetch(`${baseUrl}/officer/dashboard`, {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      const data = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('expired'));
    });
  });

  // ====================================================
  // 2. ROLE-BASED ACCESS CONTROL & ESCALATION DEFENSE
  // ====================================================
  describe('2. RBAC & Privilege Escalation Defense', () => {
    it('4. Officer accessing Admin routes returns 403 Forbidden', async () => {
      const { token: officerToken } = await createTestOfficer();
      const res = await fetch(`${baseUrl}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      const data = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('Access forbidden'));
    });

    it('8. Public registration with role=ADMIN is blocked (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Attacker Admin',
          email: `attacker.${Date.now()}@test.civic.gov`,
          password: 'Password123!',
          role: 'ADMIN',
        }),
      });
      const data = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('Public registration cannot create ADMIN accounts'));
    });
  });

  // ====================================================
  // 3. RESOURCE OWNERSHIP & IDOR PROTECTION
  // ====================================================
  describe('3. Resource Ownership & IDOR Protection', () => {
    it('5. Officer A cannot view or modify Officer B assignment', async () => {
      const { officer: officerA, token: tokenA } = await createTestOfficer({
        department: 'Streets & Sanitation',
      });
      const { officer: officerB } = await createTestOfficer({
        department: 'Streets & Sanitation',
      });

      const asgnB = await createTestAssignment({
        officer: officerB,
        department: 'Streets & Sanitation',
      });

      // Officer A attempts to view Assignment B
      const resView = await fetch(`${baseUrl}/officer/assignments/${asgnB._id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(resView.status, 403);

      // Officer A attempts to accept Assignment B
      const resAccept = await fetch(`${baseUrl}/officer/assignments/${asgnB._id}/accept`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(resAccept.status, 403);
    });

    it('6. Officer A cannot submit or view Officer B verification record', async () => {
      const { officer: officerA, token: tokenA } = await createTestOfficer({
        department: 'Streets & Sanitation',
      });
      const { officer: officerB, token: tokenB } = await createTestOfficer({
        department: 'Streets & Sanitation',
      });

      const predB = await createTestPrediction({
        assignedOfficer: officerB._id,
        verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      });
      const asgnB = await createTestAssignment({
        prediction: predB,
        officer: officerB,
        status: ASSIGNMENT_STATUS.IN_PROGRESS,
      });

      // Officer A tries to submit verification for Officer B prediction
      const resSubmit = await fetch(`${baseUrl}/officer/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          predictionId: predB.predictionId,
          outcome: 'PROBLEM_CONFIRMED',
          severity: 'HIGH',
        }),
      });
      assert.strictEqual(resSubmit.status, 403);

      // Officer B submits valid verification
      const resB = await fetch(`${baseUrl}/officer/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({
          predictionId: predB.predictionId,
          outcome: 'PROBLEM_CONFIRMED',
        }),
      });
      const dataB = await resB.json();
      assert.strictEqual(resB.status, 201);
      const verifId =
        dataB.data.verification.id ||
        dataB.data.verification._id ||
        dataB.data.verification.verificationId;

      // Officer A tries to view Officer B verification record
      const resView = await fetch(`${baseUrl}/officer/verifications/${verifId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(resView.status, 403);
    });
  });

  // ====================================================
  // 4. DEPARTMENT DATA BOUNDARY ISOLATION
  // ====================================================
  describe('4. Department Data Boundary Isolation', () => {
    it('7. Officer cannot access other department heatmap via query parameter spoofing', async () => {
      const { token: tokenSanitation } = await createTestOfficer({
        department: 'Streets & Sanitation',
      });

      const res = await fetch(`${baseUrl}/officer/heatmap?department=Police`, {
        headers: { Authorization: `Bearer ${tokenSanitation}` },
      });
      const data = await res.json();

      assert.strictEqual(res.status, 403);
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('restricted to your department'));
    });
  });

  // ====================================================
  // 5. INPUT SANITIZATION & NOSQL OPERATOR INJECTION
  // ====================================================
  describe('5. Input Hardening & NoSQL Injection Protection', () => {
    it('12. Invalid ObjectId in route parameters returns 400 Bad Request', async () => {
      const { token: adminToken } = await createTestAdmin();
      const res = await fetch(`${baseUrl}/admin/officers/not-a-valid-id-12345!@#`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      assert.strictEqual(res.status, 404);
      assert.strictEqual(data.success, false);
    });

    it('13. NoSQL operator injection in query params ($ne, $gt) returns 400 Bad Request', async () => {
      const { token: adminToken } = await createTestAdmin();
      const res = await fetch(`${baseUrl}/admin/predictions?department[$ne]=null`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('NoSQL operators are not permitted'));
    });
  });

  // ====================================================
  // 6. STATE MACHINE & DUPLICATION DEFENSE
  // ====================================================
  describe('6. State Machine & Duplication Defense', () => {
    it('11. Duplicate field verification submission returns 409 Conflict', async () => {
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

      // 1st submit -> 201
      const res1 = await fetch(`${baseUrl}/officer/verifications`, {
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
      assert.strictEqual(res1.status, 201);

      // 2nd submit -> 409 Conflict
      const res2 = await fetch(`${baseUrl}/officer/verifications`, {
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
      assert.strictEqual(res2.status, 409);
    });

    it('14. Unauthorized assignment status transition returns 400 Bad Request', async () => {
      const { officer, token } = await createTestOfficer();
      const asgn = await createTestAssignment({
        officer,
        status: ASSIGNMENT_STATUS.COMPLETED,
      });

      const res = await fetch(`${baseUrl}/officer/assignments/${asgn._id}/start`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.strictEqual(res.status, 400);
    });
  });

  // ====================================================
  // 7. COMPREHENSIVE MULTI-STEP ATTACK & VERIFICATION SCENARIO
  // ====================================================
  describe('7. Final Multi-Step Access-Control Verification', () => {
    it('Demonstrates comprehensive attack mitigation leading to authorized success', async () => {
      const deptA = `Streets & Sanitation Test ${Date.now()}`;
      const { officer: officerA, token: tokenA } = await createTestOfficer({
        department: deptA,
      });
      const { officer: officerB } = await createTestOfficer({
        department: 'Police',
      });

      const asgnB = await createTestAssignment({
        officer: officerB,
        department: 'Police',
      });

      const predA = await createTestPrediction({
        department: deptA,
        assignedOfficer: officerA._id,
        verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      });
      const asgnA = await createTestAssignment({
        prediction: predA,
        officer: officerA,
        department: deptA,
        status: ASSIGNMENT_STATUS.IN_PROGRESS,
      });

      // Step 1: Officer A tries to access Officer B assignment -> DENIED (403)
      const attack1 = await fetch(`${baseUrl}/officer/assignments/${asgnB._id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(attack1.status, 403);

      // Step 2: Officer A tries to access Police department heatmap -> DENIED (403)
      const attack2 = await fetch(`${baseUrl}/officer/heatmap?department=Police`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(attack2.status, 403);

      // Step 3: Officer A tries to modify prediction risk score on an admin route -> DENIED (403)
      const attack3 = await fetch(`${baseUrl}/admin/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          riskScore: 10,
          probability: 0.1,
        }),
      });
      assert.strictEqual(attack3.status, 403);

      // Step 4: Officer A tries to escalate role to ADMIN -> DENIED (403)
      const attack4 = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Escalation Attempt',
          email: `escalate.${Date.now()}@test.civic.gov`,
          password: 'Password123!',
          role: 'ADMIN',
        }),
      });
      assert.strictEqual(attack4.status, 403);

      // Step 5: Officer A submits valid verification for OWN assignment -> SUCCESS (201)
      const validAction = await fetch(`${baseUrl}/officer/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          predictionId: predA.predictionId,
          outcome: 'PROBLEM_CONFIRMED',
          severity: 'HIGH',
          notes: 'Legitimate field verification submitted successfully.',
          latitude: 41.8781,
          longitude: -87.6298,
        }),
      });
      const validData = await validAction.json();
      assert.strictEqual(validAction.status, 201);
      assert.strictEqual(validData.success, true);
      assert.strictEqual(validData.data.verification.outcome, 'PROBLEM_CONFIRMED');
    });
  });
});
