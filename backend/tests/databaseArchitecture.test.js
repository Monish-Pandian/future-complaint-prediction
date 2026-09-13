const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');

const { connectDB, disconnectDB } = require('../src/config/database');
const {
  User,
  ROLES,
  Officer,
  AVAILABILITY_STATUS,
  HistoricalComplaint,
  HISTORICAL_STATUS,
  PredictionCycle,
  CYCLE_STATUS,
  Prediction,
  RISK_LEVELS,
  VERIFICATION_STATUS,
  TRENDS,
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
  SystemSetting,
} = require('../src/models');
const seedDatabase = require('../seed');

describe('Module 11: Database Architecture, Relationships & Integrity Tests', () => {
  before(async () => {
    await connectDB();
    // Run seed to populate all 10 collections
    await seedDatabase();
  });

  after(async () => {
    await disconnectDB();
  });

  // ----------------------------------------------------
  // 1. ALL 10 COLLECTIONS PRESENT & SEEDED
  // ----------------------------------------------------
  it('All 10 required domain collections exist and contain seeded records', async () => {
    const userCount = await User.countDocuments();
    const officerCount = await Officer.countDocuments();
    const histCount = await HistoricalComplaint.countDocuments();
    const cycleCount = await PredictionCycle.countDocuments();
    const predCount = await Prediction.countDocuments();
    const asgnCount = await Assignment.countDocuments();
    const verifCount = await Verification.countDocuments();
    const evalCount = await Evaluation.countDocuments();
    const fdbkCount = await Feedback.countDocuments();
    const settingCount = await SystemSetting.countDocuments();

    assert.ok(userCount >= 6, 'users collection seeded');
    assert.ok(officerCount >= 5, 'officers collection seeded');
    assert.ok(histCount >= 5, 'historical_complaints collection seeded');
    assert.ok(cycleCount >= 2, 'prediction_cycles collection seeded');
    assert.ok(predCount >= 5, 'predictions collection seeded');
    assert.ok(asgnCount >= 4, 'assignments collection seeded');
    assert.ok(verifCount >= 3, 'verifications collection seeded');
    assert.ok(evalCount >= 3, 'evaluations collection seeded');
    assert.ok(fdbkCount >= 3, 'feedback collection seeded');
    assert.ok(settingCount >= 5, 'system_settings collection seeded');
  });

  // ----------------------------------------------------
  // 2. RELATIONSHIP INTEGRITY & CONSISTENCY
  // ----------------------------------------------------
  it('Every Assignment references an existing Prediction and Officer', async () => {
    const assignments = await Assignment.find().populate('predictionId').populate('officerId');
    assert.ok(assignments.length > 0);

    for (const asgn of assignments) {
      assert.ok(asgn.predictionId, `Assignment ${asgn.assignmentId} must reference a valid Prediction`);
      assert.ok(asgn.officerId, `Assignment ${asgn.assignmentId} must reference a valid Officer`);
      assert.ok(asgn.predictionId.predictionId);
      assert.ok(asgn.officerId.employeeCode);
    }
  });

  it('Every Verification references an existing Prediction, Assignment, and Officer', async () => {
    const verifications = await Verification.find()
      .populate('predictionId')
      .populate('assignmentId')
      .populate('officerId');

    assert.ok(verifications.length > 0);
    for (const v of verifications) {
      assert.ok(v.predictionId, `Verification ${v.verificationId} must reference Prediction`);
      assert.ok(v.officerId, `Verification ${v.verificationId} must reference Officer`);
      if (v.assignmentId) {
        assert.ok(v.assignmentId.assignmentId);
      }
    }
  });

  it('Every Evaluation references an existing Prediction and Verification', async () => {
    const evaluations = await Evaluation.find()
      .populate('predictionId')
      .populate('verificationId');

    assert.ok(evaluations.length > 0);
    for (const ev of evaluations) {
      assert.ok(ev.predictionId, `Evaluation ${ev.evaluationId} must reference Prediction`);
      assert.ok(ev.verificationId, `Evaluation ${ev.evaluationId} must reference Verification`);
      assert.ok(ev.classification);
    }
  });

  it('Every Feedback references valid Prediction, Verification, Evaluation, and PredictionCycle', async () => {
    const feedbackList = await Feedback.find()
      .populate('predictionId')
      .populate('verificationId')
      .populate('evaluationId')
      .populate('predictionCycleId');

    assert.ok(feedbackList.length > 0);
    for (const fb of feedbackList) {
      assert.ok(fb.predictionId, `Feedback ${fb.feedbackId} must reference Prediction`);
      assert.ok(fb.verificationId, `Feedback ${fb.feedbackId} must reference Verification`);
      assert.ok(fb.evaluationId, `Feedback ${fb.feedbackId} must reference Evaluation`);
      if (fb.predictionCycleId) {
        assert.ok(fb.predictionCycleId.cycleId);
      }
      assert.ok(fb.feedbackType);
      assert.ok(fb.feedbackStatus);
    }
  });

  it('Prediction references a valid PredictionCycle', async () => {
    const predictions = await Prediction.find({ predictionCycleId: { $ne: null } }).populate(
      'predictionCycleId'
    );
    assert.ok(predictions.length > 0);
    for (const p of predictions) {
      assert.ok(p.predictionCycleId.cycleId);
    }
  });

  // ----------------------------------------------------
  // 3. SCHEMA VALIDATION TESTS
  // ----------------------------------------------------
  it('Probability outside 0–1 is rejected by Mongoose validation', async () => {
    const invalidPred = new Prediction({
      predictionId: 'TEST-INVALID-PROB',
      complaintType: 'Pothole',
      department: 'Streets & Sanitation',
      communityArea: 'The Loop',
      ward: 'Ward 1',
      location: { type: 'Point', coordinates: [-87.6298, 41.8781] },
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(),
      probability: 1.45, // Invalid > 1
      riskScore: 80,
      riskLevel: RISK_LEVELS.HIGH,
    });

    await assert.rejects(async () => {
      await invalidPred.validate();
    }, /Probability cannot exceed 1/);
  });

  it('Risk score outside 0–100 is rejected by Mongoose validation', async () => {
    const invalidPred = new Prediction({
      predictionId: 'TEST-INVALID-RISK',
      complaintType: 'Pothole',
      department: 'Streets & Sanitation',
      communityArea: 'The Loop',
      ward: 'Ward 1',
      location: { type: 'Point', coordinates: [-87.6298, 41.8781] },
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(),
      probability: 0.85,
      riskScore: 110, // Invalid > 100
      riskLevel: RISK_LEVELS.HIGH,
    });

    await assert.rejects(async () => {
      await invalidPred.validate();
    }, /Risk score cannot exceed 100/);
  });

  it('Invalid coordinates (latitude > 90 or longitude > 180) are rejected', async () => {
    const invalidHist = new HistoricalComplaint({
      complaintId: 'TEST-INVALID-COORDS',
      complaintType: 'Water Leak',
      department: 'Water & Drainage',
      communityArea: 'West Town',
      ward: 'Ward 1',
      location: { type: 'Point', coordinates: [210, 95] }, // Invalid coordinates
    });

    await assert.rejects(async () => {
      await invalidHist.validate();
    }, /Coordinates must be GeoJSON/);
  });

  it('Invalid enum values are rejected by schema validators', async () => {
    const invalidVerif = new Verification({
      verificationId: 'TEST-INVALID-OUTCOME',
      predictionId: new mongoose.Types.ObjectId(),
      officerId: new mongoose.Types.ObjectId(),
      outcome: 'INVALID_OBSERVATION_OUTCOME',
    });

    await assert.rejects(async () => {
      await invalidVerif.validate();
    }, /Invalid verification outcome/);
  });

  it('Duplicate user email is rejected by unique index constraint', async () => {
    const dupUser = new User({
      name: 'Duplicate Admin',
      email: 'admin@civic.gov', // Existing email
      passwordHash: 'hash123',
      role: ROLES.ADMIN,
    });

    await assert.rejects(async () => {
      await dupUser.save();
    }, /E11000 duplicate key error/);
  });

  it('Duplicate employeeCode is rejected by unique index constraint', async () => {
    const dupOfficer = new Officer({
      officerId: 'OFF-DUP-TEST',
      employeeCode: 'EMP-301', // Existing employeeCode
      name: 'Dup Officer',
      department: 'Streets & Sanitation',
      location: { type: 'Point', coordinates: [-87.62, 41.87] },
    });

    await assert.rejects(async () => {
      await dupOfficer.save();
    }, /E11000 duplicate key error/);
  });

  // ----------------------------------------------------
  // 4. GEOSPATIAL 2DSPHERE QUERIES
  // ----------------------------------------------------
  it('Historical Complaints, Officers, and Predictions support geospatial radius queries', async () => {
    const centerLoop = [-87.6298, 41.8781];
    const radiusRadians = 5 / 6378.1; // 5 km

    const [nearHistorical, nearOfficers, nearPredictions] = await Promise.all([
      HistoricalComplaint.find({
        location: {
          $geoWithin: { $centerSphere: [centerLoop, radiusRadians] },
        },
      }),
      Officer.find({
        location: {
          $geoWithin: { $centerSphere: [centerLoop, radiusRadians] },
        },
      }),
      Prediction.find({
        location: {
          $geoWithin: { $centerSphere: [centerLoop, radiusRadians] },
        },
      }),
    ]);

    assert.ok(nearHistorical.length > 0, 'Geospatial query on HistoricalComplaint works');
    assert.ok(nearOfficers.length > 0, 'Geospatial query on Officer works');
    assert.ok(nearPredictions.length > 0, 'Geospatial query on Prediction works');
  });

  // ----------------------------------------------------
  // 5. SYSTEM SETTINGS
  // ----------------------------------------------------
  it('System settings store dynamic operational configurations', async () => {
    const windowSetting = await SystemSetting.findOne({ key: 'prediction_window_days' });
    const radiusSetting = await SystemSetting.findOne({ key: 'max_assignment_radius_km' });
    const deptsSetting = await SystemSetting.findOne({ key: 'supported_departments' });

    assert.strictEqual(windowSetting.value, 7);
    assert.strictEqual(radiusSetting.value, 50);
    assert.ok(Array.isArray(deptsSetting.value));
    assert.ok(deptsSetting.value.includes('Streets & Sanitation'));
  });
});
