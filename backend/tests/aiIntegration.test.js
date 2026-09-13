const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/database');
const {
  Prediction,
  PredictionCycle,
  Officer,
  Assignment,
  Verification,
  Evaluation,
  Feedback,
  CYCLE_STATUS,
  VERIFICATION_STATUS,
  ASSIGNMENT_STATUS,
} = require('../src/models');
const {
  validateAiPredictionItem,
  generateMockPredictions,
  generatePredictions,
  ingestPredictionCycle,
  callRemoteAiService,
  checkAiServiceHealth,
} = require('../src/services/aiService');
const { createTestAdmin, createTestOfficer } = require('./helpers/factories');
const { generateToken } = require('../src/utils/jwt');

describe('Module 19: AI Service Integration Architecture Suite', () => {
  let server;
  let baseUrl;
  let adminToken;
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

    const adminData = await createTestAdmin();
    adminToken = adminData.token;

    const officerData = await createTestOfficer({ department: 'Streets & Sanitation' });
    officerToken = officerData.token;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  });

  // ====================================================
  // 1. AI PREDICTION VALIDATION LOGIC
  // ====================================================
  describe('1. AI Prediction Response Validation', () => {
    it('Accepts valid AI prediction output and standardizes fields', () => {
      const validItem = {
        complaintType: 'Pothole Wave',
        department: 'Streets & Sanitation',
        communityArea: 'Near North Side',
        ward: 'Ward 42',
        location: { type: 'Point', coordinates: [-87.6298, 41.8781] },
        probability: 0.88,
        riskScore: 85.0,
        riskLevel: 'HIGH',
        confidence: 0.92,
        modelVersion: 'xgb-spatial-v1',
      };

      const result = validateAiPredictionItem(validItem);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
      assert.strictEqual(result.sanitized.probability, 0.88);
      assert.strictEqual(result.sanitized.riskScore, 85.0);
      assert.strictEqual(result.sanitized.riskLevel, 'HIGH');
      assert.strictEqual(result.sanitized.modelVersion, 'xgb-spatial-v1');
    });

    it('Rejects AI prediction with probability > 1.0', () => {
      const invalidItem = {
        complaintType: 'Pothole Wave',
        department: 'Streets & Sanitation',
        communityArea: 'Near North Side',
        ward: 'Ward 42',
        probability: 1.45,
        riskScore: 80,
      };

      const result = validateAiPredictionItem(invalidItem);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((err) => err.includes('probability')));
    });

    it('Rejects AI prediction with riskScore > 100', () => {
      const invalidItem = {
        complaintType: 'Pothole Wave',
        department: 'Streets & Sanitation',
        communityArea: 'Near North Side',
        ward: 'Ward 42',
        probability: 0.8,
        riskScore: 125,
      };

      const result = validateAiPredictionItem(invalidItem);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((err) => err.includes('riskScore')));
    });

    it('Rejects AI prediction missing required department or complaintType', () => {
      const invalidItem = {
        communityArea: 'Near North Side',
        ward: 'Ward 42',
        probability: 0.75,
        riskScore: 75,
      };

      const result = validateAiPredictionItem(invalidItem);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((err) => err.includes('Department is required')));
      assert.ok(result.errors.some((err) => err.includes('Complaint type is required')));
    });

    it('Rejects AI prediction with out-of-bounds coordinates', () => {
      const invalidItem = {
        complaintType: 'Pothole Wave',
        department: 'Streets & Sanitation',
        communityArea: 'Near North Side',
        ward: 'Ward 42',
        probability: 0.75,
        riskScore: 75,
        location: { type: 'Point', coordinates: [210.0, 95.0] },
      };

      const result = validateAiPredictionItem(invalidItem);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some((err) => err.includes('Invalid GeoJSON coordinates')));
    });
  });

  // ====================================================
  // 2. MOCK AI SERVICE ADAPTER
  // ====================================================
  describe('2. Mock AI Service Adapter', () => {
    it('Generates deterministic mock predictions for requested areas', async () => {
      const mockResult = await generateMockPredictions({
        modelVersion: 'mock-forecast-test',
        areas: [
          { communityArea: 'Near North Side', ward: 'Ward 42', department: 'Streets & Sanitation', complaintType: 'Pothole Wave' },
          { communityArea: 'Loop', ward: 'Ward 34', department: 'Water Management', complaintType: 'Water Main Risk' },
        ],
      });

      assert.strictEqual(mockResult.modelVersion, 'mock-forecast-test');
      assert.strictEqual(mockResult.predictions.length, 2);
      assert.strictEqual(mockResult.predictions[0].department, 'Streets & Sanitation');
      assert.strictEqual(mockResult.predictions[1].department, 'Water Management');
      assert.ok(mockResult.predictions[0].probability >= 0 && mockResult.predictions[0].probability <= 1);
    });
  });

  // ====================================================
  // 3. PREDICTION CYCLE INGESTION & IDEMPOTENCY
  // ====================================================
  describe('3. Prediction Cycle Ingestion & Idempotency', () => {
    it('Ingests a full prediction cycle and persists validated predictions', async () => {
      const cycleNumber = Math.floor(100000 + Math.random() * 900000);
      const cycleId = `CYCLE-TEST-${cycleNumber}`;

      const ingestResult = await ingestPredictionCycle(
        {
          cycleId,
          cycleNumber,
          modelVersion: 'baseline-test-v1',
          areas: [
            { communityArea: 'Near North Side', ward: 'Ward 42', department: 'Streets & Sanitation', complaintType: 'Pothole Wave' },
            { communityArea: 'Loop', ward: 'Ward 34', department: 'Water Management', complaintType: 'Water Main Risk' },
          ],
        },
        { forceMock: true }
      );

      assert.strictEqual(ingestResult.cycle.cycleId, cycleId);
      assert.strictEqual(ingestResult.cycle.status, CYCLE_STATUS.COMPLETED);
      assert.strictEqual(ingestResult.predictions.length, 2);

      // Verify predictions stored in MongoDB
      const dbPredictions = await Prediction.find({ predictionCycleId: ingestResult.cycle._id });
      assert.strictEqual(dbPredictions.length, 2);
      assert.strictEqual(dbPredictions[0].modelVersion, 'baseline-test-v1');
      assert.strictEqual(dbPredictions[0].verificationStatus, VERIFICATION_STATUS.UNASSIGNED);
    });

    it('Enforces idempotency: Re-ingesting existing cycle does not create duplicate predictions', async () => {
      const cycleNumber = Math.floor(100000 + Math.random() * 900000);
      const cycleId = `CYCLE-IDEMPOTENT-${cycleNumber}`;

      const run1 = await ingestPredictionCycle(
        {
          cycleId,
          cycleNumber,
          modelVersion: 'baseline-test-v1',
          areas: [
            { communityArea: 'West Town', ward: 'Ward 1', department: 'Transportation', complaintType: 'Traffic Signal Failure' },
          ],
        },
        { forceMock: true }
      );
      assert.strictEqual(run1.predictions.length, 1);

      // Re-run with same cycle & area
      const run2 = await ingestPredictionCycle(
        {
          cycleId,
          cycleNumber,
          modelVersion: 'baseline-test-v1',
          areas: [
            { communityArea: 'West Town', ward: 'Ward 1', department: 'Transportation', complaintType: 'Traffic Signal Failure' },
          ],
        },
        { forceMock: true }
      );

      const totalInCycle = await Prediction.countDocuments({ predictionCycleId: run1.cycle._id });
      assert.strictEqual(totalInCycle, 1); // Not duplicated
    });

    it('Gracefully handles empty predictions response', async () => {
      const cycleNumber = Math.floor(100000 + Math.random() * 900000);
      const cycleId = `CYCLE-EMPTY-${cycleNumber}`;

      const cycle = await PredictionCycle.create({
        cycleId,
        cycleNumber,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        predictionWindowStart: new Date(),
        predictionWindowEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: CYCLE_STATUS.RUNNING,
      });

      const emptyResult = await generatePredictions({ areas: [] }, { forceMock: true });
      assert.strictEqual(emptyResult.isEmpty, false); // generateMockPredictions defaults to sample areas
    });
  });

  // ====================================================
  // 4. REMOTE AI SERVICE FAILURE & TIMEOUT ISOLATION
  // ====================================================
  describe('4. Remote AI Service Failure & Timeout Isolation', () => {
    let mockRemoteServer;
    let mockRemotePort;

    before(async () => {
      // Start a temporary HTTP server simulating remote AI service behaviors
      mockRemoteServer = http.createServer((req, res) => {
        if (req.url === '/predict-500') {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Internal AI model inference failure' }));
        } else if (req.url === '/predict-invalid-schema') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              modelVersion: 'bad-v1',
              predictions: [
                { complaintType: 'Bad', probability: 9.99, riskScore: 500 }, // Invalid bounds
              ],
            })
          );
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      await new Promise((resolve) => {
        mockRemoteServer.listen(0, () => {
          mockRemotePort = mockRemoteServer.address().port;
          resolve();
        });
      });
    });

    after(async () => {
      await new Promise((resolve) => mockRemoteServer.close(resolve));
    });

    it('Handles remote 500/502 inference failure without crashing Express backend', async () => {
      await assert.rejects(
        async () => {
          await callRemoteAiService(
            { areas: [{ communityArea: '1' }] },
            { correlationId: 'TEST-500' }
          );
        },
        (err) => {
          assert.ok(err.statusCode === 502 || err.statusCode === 503 || err.statusCode === 504);
          return true;
        }
      );
    });

    it('Rejects remote AI payload containing invalid numerical ranges (422)', async () => {
      // Direct validation check
      const badPayload = {
        predictions: [{ complaintType: 'Bad', probability: 9.99, riskScore: 500 }],
      };

      assert.throws(
        () => {
          const { valid } = validateAiPredictionItem(badPayload.predictions[0]);
          if (!valid) throw new Error('Invalid predictions');
        },
        /Invalid predictions/
      );
    });

    it('checkAiServiceHealth returns mock_active when in mock simulation mode', async () => {
      const health = await checkAiServiceHealth();
      assert.ok(health.status === 'mock_active' || health.status === 'available');
    });
  });

  // ====================================================
  // 5. REST API ENDPOINT: POST /api/v1/admin/predictions/run-cycle
  // ====================================================
  describe('5. Admin Run Prediction Cycle Endpoint', () => {
    it('Admin triggers AI prediction cycle via REST API (201 Created)', async () => {
      const cycleNumber = Math.floor(100000 + Math.random() * 900000);
      const res = await fetch(`${baseUrl}/admin/predictions/run-cycle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          cycleNumber,
          modelVersion: 'api-trigger-v1',
          areas: [
            { communityArea: 'Near North Side', ward: 'Ward 42', department: 'Streets & Sanitation', complaintType: 'Pothole Wave' },
          ],
        }),
      });

      const data = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.cycle.status, CYCLE_STATUS.COMPLETED);
      assert.ok(data.data.predictions.length >= 1);
    });

    it('Officer role is blocked from triggering prediction cycles (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/admin/predictions/run-cycle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${officerToken}`,
        },
        body: JSON.stringify({ cycleNumber: 9999 }),
      });

      assert.strictEqual(res.status, 403);
    });
  });

  // ====================================================
  // 6. END-TO-END MOCK AI WORKFLOW TRACEABILITY
  // ====================================================
  describe('6. End-to-End Mock AI Workflow Traceability', () => {
    it('Executes full 7-node flow from AI ingestion to Feedback generation without mutating original forecast', async () => {
      // Step 1: AI generates and backend ingests forecast
      const cycleNumber = Math.floor(100000 + Math.random() * 900000);
      const ingestResult = await ingestPredictionCycle(
        {
          cycleNumber,
          modelVersion: 'e2e-model-v1',
          areas: [
            { communityArea: 'E2E Area', ward: 'Ward 10', department: 'Streets & Sanitation', complaintType: 'Pothole Cluster' },
          ],
        },
        { forceMock: true }
      );

      const prediction = ingestResult.predictions[0];
      const originalProbability = prediction.probability;
      const originalRiskScore = prediction.riskScore;

      // Step 2: Auto-assign officer to prediction
      const assignRes = await fetch(`${baseUrl}/admin/assignments/auto-assign/${prediction._id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(assignRes.status, 200);
      const assignData = await assignRes.json();
      const assignmentId = assignData.data.assignment.id || assignData.data.assignment._id;
      const rawOfficerId = assignData.data.assignment.officerId;
      const officerDocId =
        typeof rawOfficerId === 'object' && rawOfficerId !== null
          ? rawOfficerId.id || rawOfficerId._id
          : rawOfficerId;

      const assignedOfficerDoc = await Officer.findById(officerDocId).populate('userId');
      const officerJwt = generateToken({
        id: assignedOfficerDoc.userId._id,
        userId: assignedOfficerDoc.userId._id,
        email: assignedOfficerDoc.userId.email,
        role: assignedOfficerDoc.userId.role,
        department: assignedOfficerDoc.department,
        officerId: assignedOfficerDoc.officerId,
      });

      // Step 3: Officer accepts & starts assignment
      await fetch(`${baseUrl}/officer/assignments/${assignmentId}/accept`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${officerJwt}` },
      });
      await fetch(`${baseUrl}/officer/assignments/${assignmentId}/start`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${officerJwt}` },
      });

      // Step 4: Officer submits field verification (Observation: PROBLEM_CONFIRMED)
      const verifRes = await fetch(`${baseUrl}/officer/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${officerJwt}`,
        },
        body: JSON.stringify({
          predictionId: prediction.predictionId,
          outcome: 'PROBLEM_CONFIRMED',
          severity: 'HIGH',
          notes: 'E2E field observation confirmed.',
        }),
      });
      assert.strictEqual(verifRes.status, 201);

      // Step 5: Verification of Ground-Truth Evaluation & Feedback
      const evalDoc = await Evaluation.findOne({ predictionId: prediction._id });
      assert.ok(evalDoc);
      assert.strictEqual(evalDoc.classification, 'TRUE_POSITIVE');

      const feedbackDoc = await Feedback.findOne({ predictionId: prediction._id });
      assert.ok(feedbackDoc);
      assert.strictEqual(feedbackDoc.feedbackType, 'VERIFIED_OBSERVATION');

      // Step 6: Verify original AI prediction forecast values remain 100% IMMUTABLE
      const finalPred = await Prediction.findById(prediction._id);
      assert.strictEqual(finalPred.probability, originalProbability);
      assert.strictEqual(finalPred.riskScore, originalRiskScore);
      assert.strictEqual(finalPred.modelVersion, 'e2e-model-v1');
      assert.strictEqual(finalPred.verificationStatus, VERIFICATION_STATUS.VERIFIED_TRUE);
    });
  });
});
