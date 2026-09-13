const mongoose = require('mongoose');
const { Prediction, RISK_LEVELS, VERIFICATION_STATUS } = require('../models/Prediction');
const { Officer } = require('../models/Officer');
const { Assignment } = require('../models/Assignment');
const { Verification } = require('../models/Verification');
const { Evaluation } = require('../models/Evaluation');
const { Feedback } = require('../models/Feedback');
const { validateDateRange } = require('../utils/dateValidator');
const {
  escapeRegex,
  sanitizeString,
  validatePagination,
  validateSort,
} = require('../utils/sanitizer');
const ApiError = require('../utils/apiError');

const ALLOWED_PREDICTION_SORTS = [
  'predictionDate',
  'riskScore',
  'probability',
  'createdAt',
  'updatedAt',
  'confidence',
  'trend',
  'recentCount',
  'historicalCount',
];

/**
 * Retrieve all predicted problems with administrative filters & pagination
 * @param {Object} queryParams
 */
const getAdminPredictions = async (queryParams = {}) => {
  const filter = {};

  // 1. Department filter
  if (queryParams.department && typeof queryParams.department === 'string' && queryParams.department.trim()) {
    filter.department = { $regex: new RegExp(`^${escapeRegex(queryParams.department.trim())}$`, 'i') };
  }

  // 2. Complaint type filter
  if (queryParams.complaintType && typeof queryParams.complaintType === 'string' && queryParams.complaintType.trim()) {
    filter.complaintType = { $regex: new RegExp(`^${escapeRegex(queryParams.complaintType.trim())}$`, 'i') };
  }

  // 3. Community area filter
  if (queryParams.communityArea && typeof queryParams.communityArea === 'string' && queryParams.communityArea.trim()) {
    filter.communityArea = { $regex: new RegExp(`^${escapeRegex(queryParams.communityArea.trim())}$`, 'i') };
  }

  // 4. Ward filter
  if (queryParams.ward && typeof queryParams.ward === 'string' && queryParams.ward.trim()) {
    filter.ward = { $regex: new RegExp(`^${escapeRegex(queryParams.ward.trim())}$`, 'i') };
  }

  // 5. Risk level filter (LOW, MEDIUM, HIGH, CRITICAL)
  if (queryParams.riskLevel && typeof queryParams.riskLevel === 'string' && queryParams.riskLevel.trim()) {
    const risk = queryParams.riskLevel.toUpperCase().trim();
    if (Object.values(RISK_LEVELS).includes(risk)) {
      filter.riskLevel = risk;
    } else {
      throw new ApiError(400, `Invalid riskLevel filter '${risk}'. Allowed: [${Object.values(RISK_LEVELS).join(', ')}]`);
    }
  }

  // 6. Verification status filter
  if (queryParams.verificationStatus && typeof queryParams.verificationStatus === 'string' && queryParams.verificationStatus.trim()) {
    const status = queryParams.verificationStatus.toUpperCase().trim();
    if (Object.values(VERIFICATION_STATUS).includes(status)) {
      filter.verificationStatus = status;
    } else {
      throw new ApiError(400, `Invalid verificationStatus filter '${status}'. Allowed: [${Object.values(VERIFICATION_STATUS).join(', ')}]`);
    }
  }

  // 7. Prediction cycle filter
  if (queryParams.predictionCycleId) {
    const cycleIdStr = queryParams.predictionCycleId.toString().trim();
    if (mongoose.Types.ObjectId.isValid(cycleIdStr)) {
      filter.predictionCycleId = cycleIdStr;
    } else {
      throw new ApiError(400, `Invalid predictionCycleId format '${cycleIdStr}'. Must be a valid ObjectId.`);
    }
  }

  // 8. Date Range Validation & Filtering
  if (queryParams.startDate || queryParams.endDate) {
    const { startDate, endDate } = validateDateRange(queryParams.startDate, queryParams.endDate);
    filter.predictionDate = {};
    if (startDate) filter.predictionDate.$gte = startDate;
    if (endDate) filter.predictionDate.$lte = endDate;
  } else if (queryParams.date) {
    const startOfDay = new Date(queryParams.date);
    if (isNaN(startOfDay.getTime())) {
      throw new ApiError(400, `Invalid date format '${queryParams.date}'. Expected ISO date.`);
    }
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(queryParams.date);
    endOfDay.setHours(23, 59, 59, 999);
    filter.predictionDate = { $gte: startOfDay, $lte: endOfDay };
  }

  // 9. Keyword search with regex escaping
  if (queryParams.search && typeof queryParams.search === 'string' && queryParams.search.trim()) {
    const searchRegex = new RegExp(escapeRegex(queryParams.search.trim()), 'i');
    filter.$or = [
      { predictionId: searchRegex },
      { complaintType: searchRegex },
      { department: searchRegex },
      { communityArea: searchRegex },
      { ward: searchRegex },
    ];
  }

  // 10. Pagination and Sorting
  const { page, limit, skip } = validatePagination(queryParams);
  const sortObj = validateSort(queryParams, ALLOWED_PREDICTION_SORTS, { riskScore: -1 });

  const [predictions, total] = await Promise.all([
    Prediction.find(filter)
      .populate('predictionCycleId', 'cycleId cycleNumber status startDate endDate predictionWindowStart predictionWindowEnd')
      .populate('assignedOfficer', 'name employeeCode officerId department phone availability currentWorkload')
      .sort(sortObj)
      .skip(skip)
      .limit(limit),
    Prediction.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    predictions,
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
 * Retrieve predicted problems assigned strictly to the authenticated officer
 * @param {Object} officerUser - Authenticated User document
 * @param {Object} queryParams
 */
const getOfficerPredictions = async (officerUser, queryParams = {}) => {
  const officerDoc = await Officer.findOne({
    $or: [{ userId: officerUser._id }, { officerId: officerUser.officerId }],
  });

  if (!officerDoc) {
    return {
      predictions: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
        pages: 1,
      },
    };
  }

  const filter = {
    $or: [{ assignedOfficer: officerDoc._id }, { assignedOfficerId: officerDoc._id }],
  };

  if (queryParams.riskLevel && typeof queryParams.riskLevel === 'string') {
    const risk = queryParams.riskLevel.toUpperCase().trim();
    if (Object.values(RISK_LEVELS).includes(risk)) {
      filter.riskLevel = risk;
    }
  }

  if (queryParams.verificationStatus && typeof queryParams.verificationStatus === 'string') {
    const status = queryParams.verificationStatus.toUpperCase().trim();
    if (Object.values(VERIFICATION_STATUS).includes(status)) {
      filter.verificationStatus = status;
    }
  }

  if (queryParams.search && typeof queryParams.search === 'string' && queryParams.search.trim()) {
    const searchRegex = new RegExp(escapeRegex(queryParams.search.trim()), 'i');
    filter.$or = [
      { predictionId: searchRegex },
      { complaintType: searchRegex },
      { communityArea: searchRegex },
      { ward: searchRegex },
    ];
  }

  const { page, limit, skip } = validatePagination(queryParams);
  const sortObj = validateSort(queryParams, ALLOWED_PREDICTION_SORTS, { riskScore: -1 });

  const [predictions, total] = await Promise.all([
    Prediction.find(filter)
      .populate('assignedOfficer', 'name employeeCode officerId department phone')
      .populate('predictionCycleId', 'cycleId cycleNumber status')
      .sort(sortObj)
      .skip(skip)
      .limit(limit),
    Prediction.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    predictions,
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
 * Retrieve single predicted problem with full relational graph (Cycle, Officer, Assignment, Verification, Evaluation, Feedback)
 * @param {string} id
 * @param {Object} [user] - Optional user context for authorization checks
 */
const getPredictionById = async (id, user = null) => {
  let query = {};
  const idStr = id ? id.toString().trim() : '';
  if (mongoose.Types.ObjectId.isValid(idStr)) {
    query = { $or: [{ _id: idStr }, { predictionId: idStr.toUpperCase() }] };
  } else {
    query = { predictionId: idStr.toUpperCase() };
  }

  const prediction = await Prediction.findOne(query)
    .populate('predictionCycleId', 'cycleId cycleNumber status startDate endDate predictionWindowStart predictionWindowEnd')
    .populate('assignedOfficer', 'name employeeCode officerId department phone availability currentWorkload');

  if (!prediction) {
    throw new ApiError(404, `Predicted problem not found with identifier '${idStr}'`);
  }

  // If request is from an OFFICER, ensure prediction is assigned to them
  if (user && user.role === 'OFFICER') {
    const officerDoc = await Officer.findOne({
      $or: [{ userId: user._id }, { officerId: user.officerId }],
    });

    const isAssigned =
      officerDoc &&
      prediction.assignedOfficer &&
      prediction.assignedOfficer._id.toString() === officerDoc._id.toString();

    if (!isAssigned) {
      throw new ApiError(
        403,
        'Forbidden: You are only authorized to view predicted problems assigned to you.'
      );
    }

    return { prediction };
  }

  // For ADMIN: Load full operational lifecycle relationships
  const [assignment, verification, evaluation, feedback] = await Promise.all([
    Assignment.findOne({ predictionId: prediction._id })
      .populate('officerId', 'name employeeCode officerId department phone availability currentWorkload'),
    Verification.findOne({ predictionId: prediction._id })
      .populate('officerId', 'name employeeCode officerId department phone'),
    Evaluation.findOne({ predictionId: prediction._id }),
    Feedback.findOne({ predictionId: prediction._id }),
  ]);

  return {
    prediction,
    predictionCycle: prediction.predictionCycleId || null,
    assignedOfficer: prediction.assignedOfficer || null,
    assignment: assignment || null,
    verification: verification || null,
    evaluation: evaluation || null,
    feedback: feedback || null,
  };
};

/**
 * Retrieve complete end-to-end relational trace for a given predictionId
 * Traces: Prediction -> Prediction Cycle -> Assignment -> Officer -> Verification -> Evaluation -> Feedback
 * @param {string} id
 */
const getPredictionTrace = async (id) => {
  let query = {};
  const idStr = id ? id.toString().trim() : '';
  if (mongoose.Types.ObjectId.isValid(idStr)) {
    query = { $or: [{ _id: idStr }, { predictionId: idStr.toUpperCase() }] };
  } else {
    query = { predictionId: idStr.toUpperCase() };
  }

  const prediction = await Prediction.findOne(query)
    .populate('predictionCycleId', 'cycleId cycleNumber status startDate endDate predictionWindowStart predictionWindowEnd')
    .populate('assignedOfficer', 'name employeeCode officerId department phone availability currentWorkload');

  if (!prediction) {
    throw new ApiError(404, `Predicted problem not found with identifier '${idStr}'`);
  }

  const [assignment, verification, evaluation, feedback] = await Promise.all([
    Assignment.findOne({ predictionId: prediction._id })
      .populate('officerId', 'name employeeCode officerId department phone availability currentWorkload'),
    Verification.findOne({ predictionId: prediction._id })
      .populate('officerId', 'name employeeCode officerId department phone'),
    Evaluation.findOne({ predictionId: prediction._id }),
    Feedback.findOne({ predictionId: prediction._id }),
  ]);

  return {
    prediction,
    predictionCycle: prediction.predictionCycleId || null,
    assignment: assignment || null,
    officer: assignment?.officerId || prediction.assignedOfficer || null,
    verification: verification || null,
    evaluation: evaluation || null,
    feedback: feedback || null,
  };
};

/**
 * Create a new predicted problem record
 * @param {Object} data
 */
const createPrediction = async (data) => {
  const predictionId = (
    data.predictionId ||
    `PRED-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`
  ).toUpperCase().trim();

  const existing = await Prediction.findOne({ predictionId });
  if (existing) {
    throw new ApiError(409, `Prediction ID '${predictionId}' is already registered.`);
  }

  const prediction = await Prediction.create({
    predictionId,
    predictionCycleId: data.predictionCycleId || undefined,
    complaintType: data.complaintType?.trim() || 'Municipal Complaint',
    department: data.department?.trim() || 'Municipal',
    communityArea: data.communityArea?.trim() || 'Unassigned Area',
    ward: data.ward?.trim() || 'Ward 1',
    location: data.location || {
      type: 'Point',
      coordinates: [0, 0],
    },
    predictionDate: data.predictionDate || new Date(),
    predictionWindowStart: data.predictionWindowStart || new Date(),
    predictionWindowEnd:
      data.predictionWindowEnd || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    probability: Number(data.probability),
    riskScore: Number(data.riskScore),
    riskLevel: (data.riskLevel || 'MEDIUM').toUpperCase().trim(),
    historicalCount: data.historicalCount || 0,
    recentCount: data.recentCount || 0,
    trend: data.trend || 'INCREASING',
    confidence: data.confidence !== undefined ? Number(data.confidence) : 0.85,
    verificationStatus: data.verificationStatus || VERIFICATION_STATUS.UNASSIGNED,
    assignedOfficer: data.assignedOfficer || data.assignedOfficerId || null,
    assignedOfficerId: data.assignedOfficer || data.assignedOfficerId || null,
  });

  return Prediction.findById(prediction._id)
    .populate('predictionCycleId', 'cycleId cycleNumber status')
    .populate('assignedOfficer', 'name employeeCode officerId department');
};

module.exports = {
  getAllPredictions: getAdminPredictions,
  getAdminPredictions,
  getOfficerPredictions,
  getPredictionById,
  getPredictionTrace,
  createPrediction,
};
