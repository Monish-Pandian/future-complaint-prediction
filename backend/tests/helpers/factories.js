if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { assertTestDatabase } = require('../../src/config/database');

const {
  User,
  ROLES,
  Officer,
  AVAILABILITY_STATUS,
  Prediction,
  RISK_LEVELS,
  VERIFICATION_STATUS,
  PredictionCycle,
  CYCLE_STATUS,
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
  HistoricalComplaint,
  SystemSettings,
} = require('../../src/models');
const { generateToken } = require('../../src/utils/jwt');

/**
 * Generate unique counter for factory IDs
 */
let counter = 1000;
const getUniqueId = () => {
  counter += 1;
  return `${Date.now().toString().slice(-4)}${counter}`;
};

/**
 * Hash password helper
 */
const hashPassword = async (plain = 'Password123!') => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
};

/**
 * Create Test Admin User Factory
 */
const createTestAdmin = async (overrides = {}) => {
  const id = getUniqueId();
  const passwordHash =
    overrides.passwordHash || (await hashPassword(overrides.password || 'AdminPass123!'));

  const user = await User.create({
    name: overrides.name || `Admin User ${id}`,
    email: overrides.email || `admin.${id}@test.civic.gov`,
    passwordHash,
    role: ROLES.ADMIN,
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    department: 'Citywide Administration',
    ...overrides,
  });

  const token = generateToken(user);

  return { user, token };
};

/**
 * Create Test Officer Factory (User + Officer Profile)
 */
const createTestOfficer = async (overrides = {}) => {
  const id = getUniqueId();
  const officerId = overrides.officerId || `OFF-TEST-${id}`;
  const employeeCode = overrides.employeeCode || `EMP-TEST-${id}`;
  const department = overrides.department || 'Streets & Sanitation';
  const passwordHash =
    overrides.passwordHash || (await hashPassword(overrides.password || 'OfficerPass123!'));

  const user = await User.create({
    name: overrides.name || `Officer ${id}`,
    email: overrides.email || `officer.${id}@test.civic.gov`,
    passwordHash,
    role: ROLES.OFFICER,
    officerId,
    department,
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
  });

  const officer = await Officer.create({
    officerId,
    userId: user._id,
    employeeCode,
    name: user.name,
    department,
    phone: overrides.phone || '312-555-0199',
    skills: overrides.skills || ['General Inspection'],
    location: overrides.location || {
      type: 'Point',
      coordinates: overrides.coordinates || [-87.6298, 41.8781], // [lng, lat]
    },
    availability: overrides.availability || AVAILABILITY_STATUS.AVAILABLE,
    currentWorkload: overrides.currentWorkload !== undefined ? overrides.currentWorkload : 0,
    active: overrides.active !== undefined ? overrides.active : true,
  });

  const token = generateToken(user);

  return { user, officer, token };
};

let monotonicSeq = 1;
let defaultTestCycle = null;

const resetTestCycle = () => {
  defaultTestCycle = null;
};

/**
 * Get or create a shared test prediction cycle to avoid one-cycle-per-prediction multiplication
 */
const getOrCreateDefaultTestCycle = async () => {
  if (defaultTestCycle) {
    try {
      const exists = await PredictionCycle.findById(defaultTestCycle._id);
      if (exists) return defaultTestCycle;
    } catch (_) {
      defaultTestCycle = null;
    }
  }
  defaultTestCycle = await createTestPredictionCycle({
    status: CYCLE_STATUS.COMPLETED,
    predictionCount: 0,
  });
  return defaultTestCycle;
};

/**
 * Create Test Prediction Cycle Factory
 */
const createTestPredictionCycle = async (overrides = {}) => {
  const id = getUniqueId();
  monotonicSeq += 1;
  const cycleNumber =
    overrides.cycleNumber || Math.floor(Date.now() * 1000 + (monotonicSeq % 1000));
  return PredictionCycle.create({
    cycleId: overrides.cycleId || `CYCLE-TEST-${id}`,
    cycleNumber,
    status: overrides.status || CYCLE_STATUS.COMPLETED,
    startDate: overrides.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: overrides.endDate || new Date(),
    predictionWindowStart: overrides.predictionWindowStart || new Date(),
    predictionWindowEnd:
      overrides.predictionWindowEnd || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    predictionCount: overrides.predictionCount !== undefined ? overrides.predictionCount : (overrides.totalPredictions || 0),
    metadata: {
      dataSource: 'TEST_SYNTHETIC',
      generatedBy: 'TEST_FACTORY',
      ...overrides.metadata,
    },
    ...overrides,
  });
};

/**
 * Create Test Predicted Problem Factory
 */
const createTestPrediction = async (overrides = {}) => {
  const id = getUniqueId();
  let cycleId = overrides.predictionCycleId;

  if (!cycleId && !overrides.skipCycle) {
    const cycle = await getOrCreateDefaultTestCycle();
    cycleId = cycle._id;
    await PredictionCycle.findByIdAndUpdate(cycleId, { $inc: { predictionCount: 1 } });
  }

  return Prediction.create({
    predictionId: overrides.predictionId || `PRED-TEST-${id}`,
    predictionCycleId: cycleId,
    complaintType: overrides.complaintType || 'Pothole Wave',
    department: overrides.department || 'Streets & Sanitation',
    communityArea: overrides.communityArea || 'Near North Side',
    ward: overrides.ward || 'Ward 42',
    location: overrides.location || {
      type: 'Point',
      coordinates: overrides.coordinates || [-87.6298, 41.8781], // [lng, lat]
    },
    predictionDate: overrides.predictionDate || new Date(),
    predictionWindowStart: overrides.predictionWindowStart || new Date(),
    predictionWindowEnd:
      overrides.predictionWindowEnd || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    probability: overrides.probability !== undefined ? overrides.probability : 0.88,
    riskScore: overrides.riskScore !== undefined ? overrides.riskScore : 82.5,
    riskLevel: overrides.riskLevel || RISK_LEVELS.HIGH,
    historicalCount: overrides.historicalCount || 14,
    recentCount: overrides.recentCount || 8,
    trend: overrides.trend || 'INCREASING',
    confidence: overrides.confidence !== undefined ? overrides.confidence : 0.9,
    verificationStatus: overrides.verificationStatus || VERIFICATION_STATUS.UNASSIGNED,
    assignedOfficer: overrides.assignedOfficer || null,
    assignedOfficerId: overrides.assignedOfficerId || null,
    ...overrides,
  });
};

/**
 * Create Test Assignment Factory
 */
const createTestAssignment = async (overrides = {}) => {
  const id = getUniqueId();

  let pred = overrides.prediction;
  if (!pred && !overrides.predictionId) {
    pred = await createTestPrediction({
      department: overrides.department || 'Streets & Sanitation',
    });
  }
  const predictionId = pred ? pred._id : overrides.predictionId;

  let off = overrides.officer;
  if (!off && !overrides.officerId) {
    const { officer } = await createTestOfficer({
      department: overrides.department || 'Streets & Sanitation',
    });
    off = officer;
  }
  const officerId = off ? off._id : overrides.officerId;

  const assignment = await Assignment.create({
    assignmentId: overrides.assignmentId || `ASGN-TEST-${id}`,
    predictionId,
    officerId,
    department: overrides.department || (pred ? pred.department : 'Streets & Sanitation'),
    distanceKm: overrides.distanceKm !== undefined ? overrides.distanceKm : 1.8,
    estimatedTravelMinutes:
      overrides.estimatedTravelMinutes !== undefined ? overrides.estimatedTravelMinutes : 12,
    currentWorkload: overrides.currentWorkload !== undefined ? overrides.currentWorkload : 1,
    availability: overrides.availability || AVAILABILITY_STATUS.AVAILABLE,
    departmentMatch: overrides.departmentMatch !== undefined ? overrides.departmentMatch : true,
    assignmentScore: overrides.assignmentScore !== undefined ? overrides.assignmentScore : 92.5,
    reasoning:
      overrides.reasoning ||
      'Optimal heuristic score based on proximity (1.8 km) and department match.',
    status: overrides.status || ASSIGNMENT_STATUS.AI_ASSIGNED,
    assignedAt: overrides.assignedAt || new Date(),
    isAdminOverride: overrides.isAdminOverride || false,
    ...overrides,
  });

  // Keep Prediction linked
  if (pred) {
    pred.assignedOfficer = officerId;
    pred.verificationStatus = VERIFICATION_STATUS.ASSIGNED;
    await pred.save();
  }

  return assignment;
};

/**
 * Create Test Verification Factory
 */
const createTestVerification = async (overrides = {}) => {
  const id = getUniqueId();

  let asgn = overrides.assignment;
  if (!asgn && !overrides.assignmentId) {
    asgn = await createTestAssignment();
  }
  const assignmentId = asgn ? asgn._id : overrides.assignmentId;
  const predictionId = asgn ? asgn.predictionId : overrides.predictionId;
  const officerId = asgn ? asgn.officerId : overrides.officerId;

  return Verification.create({
    verificationId: overrides.verificationId || `VERIF-TEST-${id}`,
    predictionId,
    assignmentId,
    officerId,
    outcome: overrides.outcome || VERIFICATION_OUTCOMES.PROBLEM_CONFIRMED,
    severity: overrides.severity || VERIFICATION_SEVERITY.HIGH,
    notes: overrides.notes || 'Field verification observed severe roadway degradation.',
    evidenceUrl: overrides.evidenceUrl || 'https://evidence.civic.gov/img/pothole-01.jpg',
    location: overrides.location || {
      type: 'Point',
      coordinates: overrides.coordinates || [-87.6298, 41.8781],
    },
    gpsAvailable: overrides.gpsAvailable !== undefined ? overrides.gpsAvailable : true,
    verifiedAt: overrides.verifiedAt || new Date(),
    ...overrides,
  });
};

/**
 * Create Test Evaluation Factory
 */
const createTestEvaluation = async (overrides = {}) => {
  const id = getUniqueId();

  let verif = overrides.verification;
  if (!verif && !overrides.verificationId) {
    verif = await createTestVerification();
  }
  const verificationId = verif ? verif._id : overrides.verificationId;
  const predictionId = verif ? verif.predictionId : overrides.predictionId;

  return Evaluation.create({
    evaluationId: overrides.evaluationId || `EVAL-TEST-${id}`,
    predictionId,
    verificationId,
    predictionOutcome: overrides.predictionOutcome || 'HIGH_RISK_PREDICTED',
    actualOutcome: overrides.actualOutcome || (verif ? verif.outcome : 'PROBLEM_CONFIRMED'),
    classification:
      overrides.classification || EVALUATION_CLASSIFICATION.TRUE_POSITIVE,
    evaluatedAt: overrides.evaluatedAt || new Date(),
    ...overrides,
  });
};

/**
 * Create Test Feedback Factory
 */
const createTestFeedback = async (overrides = {}) => {
  const id = getUniqueId();

  let evaluation = overrides.evaluation;
  if (!evaluation && !overrides.evaluationId) {
    evaluation = await createTestEvaluation();
  }
  const evaluationId = evaluation ? evaluation._id : overrides.evaluationId;
  const predictionId = evaluation ? evaluation.predictionId : overrides.predictionId;
  const verificationId = evaluation ? evaluation.verificationId : overrides.verificationId;

  return Feedback.create({
    feedbackId: overrides.feedbackId || `FDBK-TEST-${id}`,
    predictionId,
    verificationId,
    evaluationId,
    predictionCycleId: overrides.predictionCycleId || undefined,
    feedbackType: overrides.feedbackType || FEEDBACK_TYPES.VERIFIED_OBSERVATION,
    feedbackStatus: overrides.feedbackStatus || FEEDBACK_STATUS.READY_FOR_MODEL_UPDATE,
    createdAt: overrides.createdAt || new Date(),
    ...overrides,
  });
};

/**
 * Create Test Historical Complaint Factory
 */
const createTestHistoricalComplaint = async (overrides = {}) => {
  const id = getUniqueId();
  return HistoricalComplaint.create({
    complaintId: overrides.complaintId || `COMP-TEST-${id}`,
    complaintType: overrides.complaintType || 'Pothole Wave',
    department: overrides.department || 'Streets & Sanitation',
    communityArea: overrides.communityArea || 'Near North Side',
    ward: overrides.ward || 'Ward 42',
    location: overrides.location || {
      type: 'Point',
      coordinates: overrides.coordinates || [-87.6298, 41.8781],
    },
    createdDate: overrides.createdDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    status: overrides.status || 'CLOSED',
    source: overrides.source || '311_CALL_CENTER',
    ...overrides,
  });
};

/**
 * Clean all test database collections (safe for isolated test DB)
 */
const cleanupTestDatabase = async () => {
  assertTestDatabase();
  defaultTestCycle = null;
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

module.exports = {
  createTestAdmin,
  createTestOfficer,
  createTestPredictionCycle,
  createTestPrediction,
  createTestAssignment,
  createTestVerification,
  createTestEvaluation,
  createTestFeedback,
  createTestHistoricalComplaint,
  cleanupTestDatabase,
  resetTestCycle,
};
