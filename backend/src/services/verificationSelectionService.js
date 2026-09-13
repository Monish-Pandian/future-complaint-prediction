const mongoose = require('mongoose');
const {
  VerificationCandidate,
  SELECTION_TYPES,
  SELECTION_POLICIES,
  VERIFICATION_CANDIDATE_STATUS,
} = require('../models/VerificationCandidate');
const { Prediction, VERIFICATION_STATUS } = require('../models/Prediction');
const { PredictionCycle, CYCLE_STATUS } = require('../models/PredictionCycle');
const { validateDateRange } = require('../utils/dateValidator');
const {
  escapeRegex,
  sanitizeString,
  validatePagination,
  validateSort,
} = require('../utils/sanitizer');
const ApiError = require('../utils/apiError');

const EXPLOITATION_FRACTION = 0.90;
const EXPLORATION_FRACTION = 0.10;
const EXPLORATION_RANDOM_SEED = 42;
const SELECTION_POLICY_NAME = '90_10_EXPLOITATION_EXPLORATION';

/**
 * Compute verification budget for a given candidate count and budget percentage
 * @param {number} candidateCount
 * @param {number} budgetPct - Budget as fraction (e.g., 0.05 for 5%)
 * @returns {number} Integer budget (ceiling)
 */
const computeBudget = (candidateCount, budgetPct) => {
  if (!candidateCount || candidateCount <= 0) return 0;
  return Math.max(0, Math.ceil(candidateCount * budgetPct));
};

/**
 * Select verification candidates using 90/10 exploitation/exploration policy
 * @param {Object} params
 * @param {string} params.predictionCycleId - Prediction cycle ID (cycleId string like 'CYCLE-2026-001')
 * @param {number} budgetPct - Budget percentage as fraction (e.g., 0.05 for 5%)
 * @param {Object} [options] - Additional options
 * @param {number} [options.randomSeed] - Override random seed for exploration
 * @returns {Promise<Object>} Selection result
 */
const selectVerificationCandidates = async (predictionCycleId, budgetPct, options = {}) => {
  const { randomSeed = EXPLORATION_RANDOM_SEED } = options;

  // 1. Validate prediction cycle exists and is completed
  const cycle = await PredictionCycle.findOne({ cycleId: predictionCycleId });
  if (!cycle) {
    throw new ApiError(404, `Prediction cycle not found with ID '${predictionCycleId}'`);
  }

  if (cycle.status !== CYCLE_STATUS.COMPLETED) {
    throw new ApiError(400, `Prediction cycle must be COMPLETED. Current status: ${cycle.status}`);
  }

  // 2. Load all predictions for this cycle
  const predictions = await Prediction.find({ predictionCycleId: cycle._id })
    .select('predictionId communityArea ward complaintType department probability riskScore riskLevel predictionDate location verificationStatus')
    .lean();

  if (!predictions || predictions.length === 0) {
    throw new ApiError(400, `No predictions found for cycle '${cycle.cycleId}'`);
  }

  // 3. Filter out already verified predictions (optional - could include them)
  const candidatePredictions = predictions.filter(p =>
    p.verificationStatus === 'UNASSIGNED' || p.verificationStatus === 'ASSIGNED'
  );

  const candidateCount = candidatePredictions.length;
  if (candidateCount === 0) {
    return {
      cycle: { _id: cycle._id, cycleId: cycle.cycleId },
      budgetPct,
      totalCandidates: 0,
      exploitationBudget: 0,
      explorationBudget: 0,
      exploitationSelected: [],
      explorationSelected: [],
      totalSelected: 0,
      message: 'No eligible candidates for verification selection',
    };
  }

  // 4. Compute budget
  const totalBudget = computeBudget(candidateCount, budgetPct);
  if (totalBudget === 0) {
    return {
      cycle: { _id: cycle._id, cycleId: cycle.cycleId },
      budgetPct,
      totalCandidates: candidateCount,
      exploitationBudget: 0,
      explorationBudget: 0,
      exploitationSelected: [],
      explorationSelected: [],
      totalSelected: 0,
      message: 'Budget results in 0 verifications',
    };
  }

  // 3. Compute exploitation and exploration budgets
  const exploitationBudget = Math.floor(totalBudget * EXPLOITATION_FRACTION);
  const explorationBudget = totalBudget - exploitationBudget;

  // 4. Rank candidates by predicted probability (descending)
  const rankedCandidates = candidatePredictions
    .sort((a, b) => b.probability - a.probability)
    .map((pred, index) => ({
      ...pred,
      srType: pred.complaintType,
      predictionRank: index + 1,
    }));

  // 5. EXPLOITATION SELECTION: Top n_exploit by probability
  const exploitationCandidates = rankedCandidates.slice(0, exploitationBudget);

  // 6. EXPLORATION SELECTION: Random sample from remaining
  const remainingCandidates = rankedCandidates.slice(exploitationBudget);
  let explorationCandidates = [];

  if (explorationBudget > 0 && remainingCandidates.length > 0) {
    const exploreCount = Math.min(explorationBudget, remainingCandidates.length);

    // Use seeded random for reproducibility
    const rng = new SeededRandom(EXPLORATION_RANDOM_SEED);
    const shuffled = [...remainingCandidates].sort(() => rng.next() - 0.5);
    explorationCandidates = shuffled.slice(0, exploreCount);
  }

  // 7. Build verification candidates
  const weekStart = new Date().toISOString().split('T')[0]; // Current week for now, could be derived from cycle

  const generateCandidateId = (cycleNumber, index) => `VC-${cycleNumber}-${String(index + 1).padStart(4, '0')}`;

  const exploitationSelected = exploitationCandidates.map((pred, index) => ({
    predictionCycleId: cycle._id,
    predictionId: pred._id,
    candidateId: generateCandidateId(cycle.cycleNumber, index),
    selectionType: 'EXPLOITATION',
    selectionPolicy: '90_10_EXPLOITATION_EXPLORATION',
    selectionRank: index + 1,
    status: 'PENDING_ASSIGNMENT',
    budgetPct: budgetPct,
    weekStart: cycle.predictionWindowStart || new Date(),
    communityArea: pred.communityArea,
    srType: pred.srType || 'Unknown',
    ward: pred.ward || 'Unknown',
    department: pred.department || 'Unknown',
    probability: pred.probability,
    riskScore: pred.riskScore,
    riskLevel: pred.riskLevel,
    selectionMetadata: {
      exploitationBudget,
      explorationBudget: explorationBudget,
      totalBudget: totalBudget,
      totalCandidates: candidateCount,
      randomSeed: EXPLORATION_RANDOM_SEED,
    },
  }));

  const explorationSelected = explorationCandidates.map((pred, index) => ({
    predictionCycleId: cycle._id,
    predictionId: pred._id,
    candidateId: generateCandidateId(cycle.cycleNumber, exploitationBudget + index),
    selectionType: 'EXPLORATION',
    selectionPolicy: '90_10_EXPLOITATION_EXPLORATION',
    selectionRank: exploitationBudget + index + 1,
    status: 'PENDING_ASSIGNMENT',
    budgetPct: budgetPct,
    weekStart: cycle.predictionWindowStart || new Date(),
    communityArea: pred.communityArea,
    srType: pred.srType || 'Unknown',
    ward: pred.ward || 'Unknown',
    department: pred.department || 'Unknown',
    probability: pred.probability,
    riskScore: pred.riskScore,
    riskLevel: pred.riskLevel,
    selectionMetadata: {
      exploitationBudget,
      explorationBudget: explorationBudget,
      totalBudget: totalBudget,
      totalCandidates: candidateCount,
      randomSeed: EXPLORATION_RANDOM_SEED,
    },
  }));

  // 8. Bulk insert with idempotency (upsert by predictionId)
  const allSelected = [...exploitationSelected, ...explorationSelected];
  const insertedCandidates = [];

  for (const candidate of allSelected) {
    const existing = await VerificationCandidate.findOne({ predictionId: candidate.predictionId });
    if (!existing) {
      const created = await VerificationCandidate.create(candidate);
      insertedCandidates.push(created);
    } else {
      insertedCandidates.push(existing);
    }
  }

  // Update cycle with selection info
  await PredictionCycle.findByIdAndUpdate(cycle._id, {
    $inc: { verificationCount: insertedCandidates.length },
  });

  const exploitationInserted = insertedCandidates.filter(c => c.selectionType === 'EXPLOITATION').length;
  const explorationInserted = insertedCandidates.filter(c => c.selectionType === 'EXPLORATION').length;

  return {
    cycle: { _id: cycle._id, cycleId: cycle.cycleId },
    budgetPct,
    totalCandidates: candidateCount,
    exploitationBudget,
    explorationBudget,
    totalBudget,
    exploitationSelected: insertedCandidates.filter(c => c.selectionType === 'EXPLOITATION').length,
    explorationSelected: insertedCandidates.filter(c => c.selectionType === 'EXPLORATION').length,
    totalSelected: insertedCandidates.length,
    message: `Selected ${insertedCandidates.length} candidates (${insertedCandidates.filter(c => c.selectionType === 'EXPLOITATION').length} exploitation, ${insertedCandidates.filter(c => c.selectionType === 'EXPLORATION').length} exploration)`,
  };
};

/**
 * Simple seeded random number generator for reproducible exploration sampling
 */
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }
}

/**
 * Get verification candidates for a prediction cycle
 * @param {Object} params
 * @param {string} params.predictionCycleId
 * @param {Object} [queryParams]
 * @returns {Promise<Object>} Paginated candidates
 */
const getVerificationCandidates = async (predictionCycleId, queryParams = {}) => {
  // First resolve the cycle to get its ObjectId
  const cycle = await PredictionCycle.findOne({ cycleId: predictionCycleId });
  if (!cycle) {
    throw new ApiError(404, `Prediction cycle not found with ID '${predictionCycleId}'`);
  }

  const filter = { predictionCycleId: cycle._id };

  if (queryParams.selectionType) {
    filter.selectionType = queryParams.selectionType.toUpperCase();
  }
  if (queryParams.status) {
    filter.status = queryParams.status.toUpperCase();
  }

  const { page, limit, skip } = validatePagination(queryParams);
  const sortObj = validateSort(queryParams, ['selectionRank', 'probability', 'riskScore', 'createdAt'], { selectionRank: 1 });

  const [candidates, total] = await Promise.all([
    VerificationCandidate.find(filter)
      .populate('predictionId', 'predictionId complaintType probability riskScore riskLevel communityArea ward department location')
      .populate('predictionCycleId', 'cycleId cycleNumber status')
      .populate('assignedOfficer', 'name employeeCode officerId department')
      .sort(sortObj)
      .skip(skip)
      .limit(limit),
    VerificationCandidate.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    candidates,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      pages: totalPages,
    },
  };
};

/**
 * Get verification selection summary for a cycle
 * @param {string} predictionCycleId
 * @returns {Promise<Object>} Summary statistics
 */
const getSelectionSummary = async (predictionCycleId) => {
  const cycle = await PredictionCycle.findOne({ cycleId: predictionCycleId });
  if (!cycle) {
    throw new ApiError(404, `Prediction cycle not found with ID '${predictionCycleId}'`);
  }

  const cycleObjectId = cycle._id;

  const [totalCandidates, exploitationCount, explorationCount, assignedCount, pendingCount] = await Promise.all([
    VerificationCandidate.countDocuments({ predictionCycleId: cycleObjectId }),
    VerificationCandidate.countDocuments({ predictionCycleId: cycleObjectId, selectionType: 'EXPLOITATION' }),
    VerificationCandidate.countDocuments({ predictionCycleId: cycleObjectId, selectionType: 'EXPLORATION' }),
    VerificationCandidate.countDocuments({ predictionCycleId: cycleObjectId, status: 'ASSIGNED' }),
    VerificationCandidate.countDocuments({ predictionCycleId: cycleObjectId, status: 'PENDING_ASSIGNMENT' }),
  ]);

  const bySrType = await VerificationCandidate.aggregate([
    { $match: { predictionCycleId: cycleObjectId } },
    { $group: { _id: '$srType', count: { $sum: 1 }, exploitation: { $sum: { $cond: [{ $eq: ['$selectionType', 'EXPLOITATION'] }, 1, 0] } }, exploration: { $sum: { $cond: [{ $eq: ['$selectionType', 'EXPLORATION'] }, 1, 0] } } } },
    { $sort: { count: -1 } },
  ]);

  const byCommunityArea = await VerificationCandidate.aggregate([
    { $match: { predictionCycleId: cycleObjectId } },
    { $group: { _id: '$communityArea', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);

  const byRiskLevel = await VerificationCandidate.aggregate([
    { $match: { predictionCycleId: cycleObjectId } },
    { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return {
    cycleId: cycle.cycleId,
    totalCandidates,
    exploitationCount,
    explorationCount,
    totalSelected: exploitationCount + explorationCount,
    assignedCount,
    pendingCount,
    bySrType,
    byCommunityArea,
    byRiskLevel,
  };
};

module.exports = {
  selectVerificationCandidates,
  getVerificationCandidates,
  getSelectionSummary,
  SELECTION_TYPES,
  SELECTION_POLICIES,
  VERIFICATION_CANDIDATE_STATUS,
  EXPLOITATION_FRACTION,
  EXPLORATION_FRACTION,
};