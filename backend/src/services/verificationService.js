const mongoose = require('mongoose');
const {
  Verification,
  VERIFICATION_OUTCOMES,
  VERIFICATION_SEVERITY,
} = require('../models/Verification');
const { Prediction, VERIFICATION_STATUS } = require('../models/Prediction');
const { Assignment, ASSIGNMENT_STATUS } = require('../models/Assignment');
const { Officer } = require('../models/Officer');
const { Evaluation, EVALUATION_CLASSIFICATION } = require('../models/Evaluation');
const { Feedback, FEEDBACK_TYPES, FEEDBACK_STATUS } = require('../models/Feedback');
const {
  VerificationCandidate,
  VERIFICATION_CANDIDATE_STATUS,
} = require('../models/VerificationCandidate');
const { validateDateRange } = require('../utils/dateValidator');
const {
  escapeRegex,
  sanitizeString,
  validatePagination,
  validateSort,
} = require('../utils/sanitizer');
const ApiError = require('../utils/apiError');

const ALLOWED_VERIFICATION_SORTS = [
  'verifiedAt',
  'createdAt',
  'updatedAt',
  'severity',
  'outcome',
];

/**
 * Submit field verification for an assigned predicted problem
 * Automatically handles end-to-end integration:
 * Verification Creation -> Assignment Completion -> Prediction State Update ->
 * Evaluation Comparison -> Feedback Generation -> Officer Workload Decrement.
 *
 * @param {Object} officerUser - Authenticated officer JWT identity
 * @param {Object} data - Verification payload
 */
const submitVerification = async (officerUser, data) => {
  // 1. Resolve Officer document from authenticated JWT user identity
  const officerDoc = await Officer.findOne({
    $or: [{ userId: officerUser._id }, { officerId: officerUser.officerId }],
  });

  if (!officerDoc) {
    throw new ApiError(404, 'Officer profile not found for authenticated user.');
  }

  // 2. Locate the Predicted Problem
  if (!data.predictionId) {
    throw new ApiError(400, 'Prediction ID is required to submit field verification.');
  }

  let predQuery = {};
  const predIdStr = data.predictionId.toString().trim();
  if (mongoose.Types.ObjectId.isValid(predIdStr)) {
    predQuery = { $or: [{ _id: predIdStr }, { predictionId: predIdStr.toUpperCase() }] };
  } else {
    predQuery = { predictionId: predIdStr.toUpperCase() };
  }

  const prediction = await Prediction.findOne(predQuery);
  if (!prediction) {
    throw new ApiError(404, `Predicted problem not found with identifier '${data.predictionId}'.`);
  }

  // 3. Security & Ownership Check: Officer can verify ONLY their own assigned prediction
  const isAssignedToOfficer =
    prediction.assignedOfficer &&
    prediction.assignedOfficer.toString() === officerDoc._id.toString();

  if (!isAssignedToOfficer) {
    throw new ApiError(
      403,
      'Forbidden: You are not authorized to submit verification for a prediction not assigned to you.'
    );
  }

  // 4. Duplicate Verification Protection
  const existingVerif = await Verification.findOne({
    predictionId: prediction._id,
    officerId: officerDoc._id,
  });
  if (existingVerif) {
    throw new ApiError(409, 'Verification already submitted for this assignment.');
  }

  // 5. Validate Outcome
  if (!data.outcome || !Object.values(VERIFICATION_OUTCOMES).includes(data.outcome)) {
    throw new ApiError(
      400,
      `Invalid verification outcome '${data.outcome}'. Must be one of: ${Object.values(
        VERIFICATION_OUTCOMES
      ).join(', ')}`
    );
  }

  // 6. Validate Severity if provided
  let severity = VERIFICATION_SEVERITY.MEDIUM;
  if (data.severity) {
    const sev = data.severity.toUpperCase().trim();
    if (Object.values(VERIFICATION_SEVERITY).includes(sev)) {
      severity = sev;
    }
  }

  // 7. Handle GPS Location (No fabrication, accurate flag)
  let coordinates = [0, 0];
  let gpsAvailable = false;

  if (
    data.latitude !== undefined &&
    data.longitude !== undefined &&
    data.latitude !== null &&
    data.longitude !== null &&
    !isNaN(Number(data.latitude)) &&
    !isNaN(Number(data.longitude))
  ) {
    const lat = Number(data.latitude);
    const lon = Number(data.longitude);

    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      coordinates = [lon, lat];
      gpsAvailable = data.gpsAvailable !== undefined ? Boolean(data.gpsAvailable) : true;
    }
  }

  // 8. Locate existing linked assignment
  const assignment = await Assignment.findOne({
    predictionId: prediction._id,
    officerId: officerDoc._id,
  });

  // 9. Generate Unique Verification Identifier
  const verificationId = `VERIF-${Date.now().toString().slice(-6)}-${Math.floor(
    100 + Math.random() * 900
  )}`;

  // 10. Create Verification Record (ignoring any forged officerId in body)
  const verification = await Verification.create({
    verificationId,
    predictionId: prediction._id,
    assignmentId: assignment ? assignment._id : undefined,
    officerId: officerDoc._id, // Enforce authenticated officer identity
    outcome: data.outcome,
    severity,
    notes: data.notes ? data.notes.trim() : '',
    evidenceUrl: data.evidenceUrl ? data.evidenceUrl.trim() : null,
    location: {
      type: 'Point',
      coordinates,
    },
    gpsAvailable,
    verifiedAt: new Date(), // Server generated timestamp
  });

  // 11. Update Assignment status: COMPLETED
  if (assignment) {
    assignment.status = ASSIGNMENT_STATUS.COMPLETED;
    assignment.completedAt = new Date();
    await assignment.save();
  }

  // 12. Update Prediction status (Immutable original prediction properties preserved)
  if (data.outcome === VERIFICATION_OUTCOMES.PROBLEM_CONFIRMED) {
    prediction.verificationStatus = VERIFICATION_STATUS.VERIFIED_TRUE;
  } else if (
    data.outcome === VERIFICATION_OUTCOMES.PROBLEM_NOT_FOUND ||
    data.outcome === VERIFICATION_OUTCOMES.DIFFERENT_PROBLEM
  ) {
    prediction.verificationStatus = VERIFICATION_STATUS.VERIFIED_FALSE;
  } else if (data.outcome === VERIFICATION_OUTCOMES.UNABLE_TO_VERIFY) {
    prediction.verificationStatus = VERIFICATION_STATUS.UNABLE_TO_VERIFY;
  } else {
    prediction.verificationStatus = VERIFICATION_STATUS.VERIFIED;
  }
  await prediction.save();

  // 13. Decrement Officer Workload atomically
  await Officer.findByIdAndUpdate(officerDoc._id, [
    {
      $set: {
        currentWorkload: {
          $max: [0, { $subtract: ['$currentWorkload', 1] }],
        },
      },
    },
  ]);

  // 14. Automatic Ground-Truth Evaluation Creation
  let classification = EVALUATION_CLASSIFICATION.UNDETERMINED;
  if (data.outcome === VERIFICATION_OUTCOMES.PROBLEM_CONFIRMED) {
    classification = EVALUATION_CLASSIFICATION.TRUE_POSITIVE;
  } else if (
    data.outcome === VERIFICATION_OUTCOMES.PROBLEM_NOT_FOUND ||
    data.outcome === VERIFICATION_OUTCOMES.DIFFERENT_PROBLEM
  ) {
    classification = EVALUATION_CLASSIFICATION.FALSE_POSITIVE;
  } else {
    classification = EVALUATION_CLASSIFICATION.UNDETERMINED;
  }

  const evaluationId = `EVAL-${Date.now().toString().slice(-6)}-${Math.floor(
    100 + Math.random() * 900
  )}`;

  const evaluation = await Evaluation.create({
    evaluationId,
    predictionId: prediction._id,
    verificationId: verification._id,
    predictionOutcome: `${prediction.riskLevel || 'HIGH'}_RISK_PREDICTED`,
    actualOutcome: data.outcome,
    classification,
    evaluatedAt: new Date(),
  });

  // 15. Automatic Feedback Creation (Learning Signal for Future Cycles)
  let feedbackType = FEEDBACK_TYPES.DATA_QUALITY_ISSUE;
  if (classification === EVALUATION_CLASSIFICATION.TRUE_POSITIVE) {
    feedbackType = FEEDBACK_TYPES.VERIFIED_OBSERVATION;
  } else if (classification === EVALUATION_CLASSIFICATION.FALSE_POSITIVE) {
    feedbackType = FEEDBACK_TYPES.FALSE_POSITIVE_SIGNAL;
  } else {
    feedbackType = FEEDBACK_TYPES.DATA_QUALITY_ISSUE;
  }

  const feedbackId = `FDBK-${Date.now().toString().slice(-6)}-${Math.floor(
    100 + Math.random() * 900
  )}`;

  const feedback = await Feedback.create({
    feedbackId,
    predictionId: prediction._id,
    verificationId: verification._id,
    evaluationId: evaluation._id,
    predictionCycleId: prediction.predictionCycleId || undefined,
    feedbackType,
    feedbackStatus: FEEDBACK_STATUS.READY_FOR_MODEL_UPDATE,
    createdAt: new Date(),
  });

  // 16. Explicitly update VerificationCandidate status to COMPLETED
  // This ensures the backend is the source of truth, not frontend refresh
  if (prediction.predictionCycleId) {
    await VerificationCandidate.findOneAndUpdate(
      {
        predictionCycleId: prediction.predictionCycleId,
        predictionId: prediction._id,
        status: { $in: [VERIFICATION_CANDIDATE_STATUS.ASSIGNED, VERIFICATION_CANDIDATE_STATUS.VERIFICATION_SUBMITTED] },
      },
      {
        $set: {
          status: VERIFICATION_CANDIDATE_STATUS.COMPLETED,
        },
      }
    );
  }

  // Return populated verification document with attached evaluation & feedback
  const populatedVerification = await Verification.findById(verification._id)
    .populate('officerId', 'name employeeCode officerId department phone')
    .populate(
      'predictionId',
      'predictionId complaintType riskLevel riskScore probability communityArea ward location'
    )
    .populate('assignmentId', 'assignmentId status distanceKm assignedAt completedAt');

  const verifObj = populatedVerification.toObject();
  verifObj.evaluation = evaluation;
  verifObj.feedback = feedback;

  return populatedVerification;
};

/**
 * Retrieve field verifications belonging strictly to the authenticated officer
 * @param {Object} officerUser
 * @param {Object} [queryParams]
 */
const getOfficerVerifications = async (officerUser, queryParams = {}) => {
  const officerDoc = await Officer.findOne({
    $or: [{ userId: officerUser._id }, { officerId: officerUser.officerId }],
  });

  if (!officerDoc) {
    return {
      verifications: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 1, pages: 1 },
    };
  }

  const filter = {
    officerId: officerDoc._id,
  };

  if (queryParams.outcome && typeof queryParams.outcome === 'string') {
    filter.outcome = queryParams.outcome.toUpperCase().trim();
  }

  if (queryParams.severity && typeof queryParams.severity === 'string') {
    filter.severity = queryParams.severity.toUpperCase().trim();
  }

  const { page, limit, skip } = validatePagination(queryParams);
  const sortObj = validateSort(queryParams, ALLOWED_VERIFICATION_SORTS, { verifiedAt: -1 });

  const [verifications, total] = await Promise.all([
    Verification.find(filter)
      .populate('officerId', 'name employeeCode officerId department phone')
      .populate(
        'predictionId',
        'predictionId complaintType riskLevel riskScore probability communityArea ward location'
      )
      .populate('assignmentId', 'assignmentId status distanceKm')
      .sort(sortObj)
      .skip(skip)
      .limit(limit),
    Verification.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    verifications,
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
 * Retrieve all field verifications across the municipality for Admin monitoring
 * @param {Object} [queryParams]
 */
const getAdminVerifications = async (queryParams = {}) => {
  const filter = {};

  if (queryParams.outcome && typeof queryParams.outcome === 'string' && queryParams.outcome.trim()) {
    filter.outcome = queryParams.outcome.toUpperCase().trim();
  }

  if (queryParams.severity && typeof queryParams.severity === 'string' && queryParams.severity.trim()) {
    filter.severity = queryParams.severity.toUpperCase().trim();
  }

  if (queryParams.officerId && mongoose.Types.ObjectId.isValid(queryParams.officerId)) {
    filter.officerId = queryParams.officerId;
  }

  if (queryParams.predictionId && mongoose.Types.ObjectId.isValid(queryParams.predictionId)) {
    filter.predictionId = queryParams.predictionId;
  }

  if (queryParams.startDate || queryParams.endDate) {
    const { startDate, endDate } = validateDateRange(queryParams.startDate, queryParams.endDate);
    filter.verifiedAt = {};
    if (startDate) filter.verifiedAt.$gte = startDate;
    if (endDate) filter.verifiedAt.$lte = endDate;
  }

  if (queryParams.search && typeof queryParams.search === 'string' && queryParams.search.trim()) {
    const searchRegex = new RegExp(escapeRegex(queryParams.search.trim()), 'i');
    filter.$or = [
      { verificationId: searchRegex },
      { notes: searchRegex },
      { outcome: searchRegex },
    ];
  }

  const { page, limit, skip } = validatePagination(queryParams);
  const sortObj = validateSort(queryParams, ALLOWED_VERIFICATION_SORTS, { verifiedAt: -1 });

  const [verifications, total] = await Promise.all([
    Verification.find(filter)
      .populate('officerId', 'name employeeCode officerId department phone')
      .populate(
        'predictionId',
        'predictionId complaintType department riskLevel riskScore probability communityArea ward location'
      )
      .populate('assignmentId', 'assignmentId status distanceKm')
      .sort(sortObj)
      .skip(skip)
      .limit(limit),
    Verification.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    verifications,
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
 * Retrieve single verification record by ID with full evaluation details for Admin
 * @param {string} id
 * @param {Object} user
 */
const getVerificationById = async (id, user = null) => {
  let query = {};
  const idStr = id ? id.toString().trim() : '';
  if (mongoose.Types.ObjectId.isValid(idStr)) {
    query = { $or: [{ _id: idStr }, { verificationId: idStr.toUpperCase() }] };
  } else {
    query = { verificationId: idStr.toUpperCase() };
  }

  const verification = await Verification.findOne(query)
    .populate('officerId', 'name employeeCode officerId department phone availability')
    .populate(
      'predictionId',
      'predictionId complaintType department riskLevel riskScore probability communityArea ward location'
    )
    .populate('assignmentId', 'assignmentId status distanceKm assignedAt completedAt');

  if (!verification) {
    throw new ApiError(404, `Verification record not found with identifier '${idStr}'`);
  }

  // Enforce officer ownership
  if (user && user.role === 'OFFICER') {
    const officerDoc = await Officer.findOne({
      $or: [{ userId: user._id }, { officerId: user.officerId }],
    });

    const isOwner =
      officerDoc &&
      verification.officerId &&
      verification.officerId._id.toString() === officerDoc._id.toString();

    if (!isOwner) {
      throw new ApiError(
        403,
        'Forbidden: You are not authorized to view another officer’s verification record.'
      );
    }

    return { verification };
  }

  // For Admin: attach evaluation record if evaluated
  const evaluation = await Evaluation.findOne({ verificationId: verification._id });

  return {
    verification,
    prediction: verification.predictionId,
    assignment: verification.assignmentId,
    officer: verification.officerId,
    evaluation: evaluation || null,
  };
};

/**
 * Update verification details (e.g. notes, severity, evidenceUrl)
 * @param {string} id
 * @param {Object} officerUser
 * @param {Object} updateData
 */
const updateVerification = async (id, officerUser, updateData) => {
  const result = await getVerificationById(id, officerUser);
  const verification = result.verification || result;

  if (updateData.notes !== undefined) {
    verification.notes = sanitizeString(updateData.notes);
  }

  if (updateData.severity) {
    const sev = updateData.severity.toUpperCase().trim();
    if (Object.values(VERIFICATION_SEVERITY).includes(sev)) {
      verification.severity = sev;
    }
  }

  if (updateData.evidenceUrl !== undefined) {
    verification.evidenceUrl = updateData.evidenceUrl ? updateData.evidenceUrl.trim() : null;
  }

  await verification.save();
  return verification;
};

module.exports = {
  submitVerification,
  getOfficerVerifications,
  getAdminVerifications,
  getVerificationById,
  updateVerification,
};
