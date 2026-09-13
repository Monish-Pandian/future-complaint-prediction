const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/database');
const {
  Prediction,
  Assignment,
  Verification,
  Evaluation,
  Feedback,
  Officer,
  VERIFICATION_STATUS,
  ASSIGNMENT_STATUS,
} = require('../src/models');
const {
  createTestOfficer,
  createTestPrediction,
  createTestAssignment,
  cleanupTestDatabase,
} = require('./helpers/factories');
const { submitVerification } = require('../src/services/verificationService');
const { checkDatabaseConsistency } = require('../src/services/consistencyService');

describe('Module 16: Transaction Integrity & Failure Recovery', () => {
  before(async () => {
    await connectDB();
    await cleanupTestDatabase();
  });

  after(async () => {
    await disconnectDB();
  });

  it('Verifies clean state and non-negative workload when handling invalid inputs', async () => {
    const { officer } = await createTestOfficer({ currentWorkload: 2 });
    const pred = await createTestPrediction({
      assignedOfficer: officer._id,
      verificationStatus: VERIFICATION_STATUS.ASSIGNED,
    });
    const asgn = await createTestAssignment({
      prediction: pred,
      officer,
      status: ASSIGNMENT_STATUS.IN_PROGRESS,
    });

    // Attempting invalid verification outcome should fail gracefully
    await assert.rejects(
      async () => {
        await submitVerification(officer, {
          predictionId: pred.predictionId,
          outcome: 'INVALID_CORRUPT_OUTCOME',
        });
      },
      /Invalid verification outcome/
    );

    // Verify database consistency
    const officerCheck = await Officer.findById(officer._id);
    assert.ok(officerCheck.currentWorkload >= 0);

    const asgnCheck = await Assignment.findById(asgn._id);
    assert.strictEqual(asgnCheck.status, ASSIGNMENT_STATUS.IN_PROGRESS);

    const verifCheck = await Verification.findOne({ assignmentId: asgn._id });
    assert.strictEqual(verifCheck, null);

    const consistency = await checkDatabaseConsistency();
    assert.strictEqual(consistency.healthy, true);
  });
});
