const mongoose = require('mongoose');
const { Assignment, ASSIGNMENT_STATUS } = require('../models/Assignment');
const { Prediction, VERIFICATION_STATUS } = require('../models/Prediction');
const { Officer, AVAILABILITY_STATUS } = require('../models/Officer');
const { Verification } = require('../models/Verification');
const { validateDateRange } = require('../utils/dateValidator');
const {
  escapeRegex,
  sanitizeString,
  validatePagination,
  validateSort,
} = require('../utils/sanitizer');
const ApiError = require('../utils/apiError');

const ALLOWED_ASSIGNMENT_SORTS = [
  'assignedAt',
  'acceptedAt',
  'completedAt',
  'distanceKm',
  'estimatedTravelMinutes',
  'assignmentScore',
  'currentWorkload',
  'status',
  'createdAt',
  'updatedAt',
];

/**
 * Valid state transitions for Assignment lifecycle
 */
const VALID_TRANSITIONS = {
  [ASSIGNMENT_STATUS.AI_ASSIGNED]: [
    ASSIGNMENT_STATUS.ACCEPTED,
    ASSIGNMENT_STATUS.REJECTED,
    ASSIGNMENT_STATUS.IN_PROGRESS,
  ],
  [ASSIGNMENT_STATUS.ACCEPTED]: [
    ASSIGNMENT_STATUS.IN_PROGRESS,
    ASSIGNMENT_STATUS.REJECTED,
  ],
  [ASSIGNMENT_STATUS.IN_PROGRESS]: [
    ASSIGNMENT_STATUS.VERIFICATION_SUBMITTED,
    ASSIGNMENT_STATUS.COMPLETED,
    ASSIGNMENT_STATUS.REJECTED,
  ],
  [ASSIGNMENT_STATUS.VERIFICATION_SUBMITTED]: [
    ASSIGNMENT_STATUS.COMPLETED,
  ],
  [ASSIGNMENT_STATUS.COMPLETED]: [],
  [ASSIGNMENT_STATUS.REJECTED]: [],
};

/**
 * Helper to calculate Haversine great-circle distance in kilometers
 */
const calculateHaversineDistanceKm = (coords1, coords2) => {
  const [lon1, lat1] = coords1 || [0, 0];
  const [lon2, lat2] = coords2 || [0, 0];

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

/**
 * Find eligible active candidate officers for assignment
 * @param {string} department
 * @param {Array<number>} [coordinates]
 * @param {number} [maxRadiusKm=50]
 */
const findEligibleOfficers = async (department, coordinates = null, maxRadiusKm = 50) => {
  const deptName = (department || 'Municipal').trim();

  // 1. First search for active, available officers matching department
  let candidates = await Officer.find({
    department: { $regex: new RegExp(`^${escapeRegex(deptName)}$`, 'i') },
    active: true,
    availability: { $in: [AVAILABILITY_STATUS.AVAILABLE, AVAILABILITY_STATUS.BUSY] },
  });

  // 2. If no department officers, fallback to any active officers across departments
  if (candidates.length === 0) {
    candidates = await Officer.find({
      active: true,
      availability: { $in: [AVAILABILITY_STATUS.AVAILABLE, AVAILABILITY_STATUS.BUSY] },
    });
  }

  // 3. Radius filter where applicable if coordinates provided
  if (coordinates && Array.isArray(coordinates) && coordinates.length === 2 && maxRadiusKm > 0) {
    const radiusRadians = maxRadiusKm / 6378.1;
    const nearbyCandidateIds = await Officer.find({
      _id: { $in: candidates.map((c) => c._id) },
      location: {
        $geoWithin: {
          $centerSphere: [coordinates, radiusRadians],
        },
      },
    }).distinct('_id');

    if (nearbyCandidateIds.length > 0) {
      candidates = candidates.filter((c) =>
        nearbyCandidateIds.some((id) => id.toString() === c._id.toString())
      );
    }
  }

  return candidates;
};

/**
 * Rank candidate officers by department match, travel distance, availability and workload
 * @param {Array<Object>} candidateOfficers
 * @param {Object} prediction
 */
const rankOfficers = (candidateOfficers, prediction) => {
  const targetDept = (prediction.department || 'Municipal').toLowerCase().trim();
  const predCoords = prediction.location?.coordinates || [0, 0];

  const scored = candidateOfficers.map((officer) => {
    const officerDept = (officer.department || '').toLowerCase().trim();
    const isDeptMatch = officerDept === targetDept;

    const distanceKm = calculateHaversineDistanceKm(
      predCoords,
      officer.location?.coordinates || [0, 0]
    );

    const estimatedTravelMinutes = Math.max(5, Math.round(distanceKm * 3.2 + 4));

    // Availability scoring
    let availabilityPoints = 0;
    if (officer.availability === AVAILABILITY_STATUS.AVAILABLE) availabilityPoints = 35;
    else if (officer.availability === AVAILABILITY_STATUS.BUSY) availabilityPoints = 15;
    else availabilityPoints = 0;

    const departmentPoints = isDeptMatch ? 40 : 10;
    const distancePoints = Math.max(0, 25 - distanceKm * 2);
    const workloadPenalty = (officer.currentWorkload || 0) * 4;

    const compositeScore = Math.max(
      0,
      Math.min(100, departmentPoints + availabilityPoints + distancePoints - workloadPenalty)
    );

    return {
      officer,
      isDeptMatch,
      distanceKm,
      estimatedTravelMinutes,
      compositeScore: Math.round(compositeScore * 10) / 10,
    };
  });

  scored.sort((a, b) => b.compositeScore - a.compositeScore);
  return scored;
};

/**
 * Automated Heuristic Assignment Engine (DEMO ASSIGNMENT LOGIC)
 * Assigns an active officer based on department match, spatial proximity, and workload.
 *
 * @param {string} predictionId - ID or ObjectId of the predicted problem
 * @param {Object} [options] - Assignment options (reassign, override)
 */
const assignPrediction = async (predictionId, options = {}) => {
  // 1. Locate the Predicted Problem
  let predQuery = {};
  const predIdStr = predictionId ? predictionId.toString().trim() : '';
  if (mongoose.Types.ObjectId.isValid(predIdStr)) {
    predQuery = { $or: [{ _id: predIdStr }, { predictionId: predIdStr.toUpperCase() }] };
  } else {
    predQuery = { predictionId: predIdStr.toUpperCase() };
  }

  const prediction = await Prediction.findOne(predQuery);
  if (!prediction) {
    throw new ApiError(404, `Predicted problem not found with identifier '${predictionId}'`);
  }

  // Check if active assignment already exists for this prediction
  const existingAssignment = await Assignment.findOne({
    predictionId: prediction._id,
    status: {
      $in: [
        ASSIGNMENT_STATUS.AI_ASSIGNED,
        ASSIGNMENT_STATUS.ACCEPTED,
        ASSIGNMENT_STATUS.IN_PROGRESS,
      ],
    },
  }).populate('officerId predictionId');

  if (existingAssignment && !options.reassign) {
    return existingAssignment;
  }

  // 2. Query available candidate officers
  const candidateOfficers = await findEligibleOfficers(
    prediction.department,
    prediction.location?.coordinates,
    50
  );

  if (candidateOfficers.length === 0) {
    prediction.verificationStatus = VERIFICATION_STATUS.PENDING_VERIFICATION;
    await prediction.save();

    throw new ApiError(
      400,
      `NO_ELIGIBLE_OFFICER: No active, available officers found for department '${prediction.department || 'Municipal'}'`
    );
  }

  // 3. DEMO ASSIGNMENT LOGIC (Heuristic Decision Scoring)
  const ranked = rankOfficers(candidateOfficers, prediction);
  const bestSelection = ranked[0];
  const selectedOfficer = bestSelection.officer;

  const assignmentId = `ASGN-${Date.now().toString().slice(-6)}-${Math.floor(
    100 + Math.random() * 900
  )}`;

  const reasoning = `[DEMO ASSIGNMENT LOGIC / DEMO/MOCK DECISION ENGINE] Automatically assigned based on optimal composite score (${bestSelection.compositeScore}/100). Distance: ${bestSelection.distanceKm} km (~${bestSelection.estimatedTravelMinutes} mins). Department Match: ${bestSelection.isDeptMatch ? 'YES' : 'NO'}. Current workload: ${selectedOfficer.currentWorkload}.`;

  const assignment = await Assignment.create({
    assignmentId,
    predictionId: prediction._id,
    officerId: selectedOfficer._id,
    department: (prediction.department || 'Municipal').trim(),
    distanceKm: bestSelection.distanceKm,
    estimatedTravelMinutes: bestSelection.estimatedTravelMinutes,
    currentWorkload: selectedOfficer.currentWorkload,
    availability: selectedOfficer.availability,
    departmentMatch: bestSelection.isDeptMatch,
    assignmentScore: bestSelection.compositeScore,
    reasoning,
    status: ASSIGNMENT_STATUS.AI_ASSIGNED,
    assignedAt: new Date(),
    isAdminOverride: options.isAdminOverride || false,
  });

  // Update Prediction record
  prediction.assignedOfficer = selectedOfficer._id;
  prediction.assignedOfficerId = selectedOfficer._id;
  if (
    prediction.verificationStatus === VERIFICATION_STATUS.UNASSIGNED ||
    prediction.verificationStatus === VERIFICATION_STATUS.PENDING_VERIFICATION
  ) {
    prediction.verificationStatus = VERIFICATION_STATUS.ASSIGNED;
  }
  await prediction.save();

  // Increment officer workload atomically
  await Officer.findByIdAndUpdate(selectedOfficer._id, {
    $inc: { currentWorkload: 1 },
  });

  return Assignment.findById(assignment._id)
    .populate('officerId', 'name employeeCode officerId department phone availability currentWorkload')
    .populate('predictionId', 'predictionId complaintType riskLevel riskScore probability communityArea ward location');
};

/**
 * Update Assignment Status with rigorous state machine validation and officer identity enforcement
 * @param {string} id - Assignment ID or ObjectId
 * @param {string} newStatus - Target status (ACCEPTED, IN_PROGRESS, REJECTED, COMPLETED)
 * @param {Object} user - Authenticated user context
 */
const updateAssignmentStatus = async (id, newStatus, user) => {
  let query = {};
  const idStr = id ? id.toString().trim() : '';
  if (mongoose.Types.ObjectId.isValid(idStr)) {
    query = { $or: [{ _id: idStr }, { assignmentId: idStr.toUpperCase() }] };
  } else {
    query = { assignmentId: idStr.toUpperCase() };
  }

  const assignment = await Assignment.findOne(query);
  if (!assignment) {
    throw new ApiError(404, `Assignment not found with identifier '${idStr}'`);
  }

  const targetStatus = (newStatus || '').toUpperCase().trim();

  // 1. Officer Authorization & Ownership Check
  if (user && user.role === 'OFFICER') {
    const officerDoc = await Officer.findOne({
      $or: [{ userId: user._id }, { officerId: user.officerId }],
    });

    const isAssigned =
      officerDoc &&
      assignment.officerId &&
      assignment.officerId.toString() === officerDoc._id.toString();

    if (!isAssigned) {
      throw new ApiError(
        403,
        'Forbidden: You are not authorized to modify another officer’s assignment.'
      );
    }
  }

  // 2. State Machine Transition Validation
  const allowedNext = VALID_TRANSITIONS[assignment.status] || [];
  if (!allowedNext.includes(targetStatus)) {
    throw new ApiError(
      400,
      `Invalid assignment status transition from '${assignment.status}' to '${targetStatus}'. Allowed: [${allowedNext.join(
        ', '
      )}]`
    );
  }

  // 3. Apply state transition & audit timestamps
  assignment.status = targetStatus;

  if (targetStatus === ASSIGNMENT_STATUS.ACCEPTED) {
    assignment.acceptedAt = new Date();
  } else if (targetStatus === ASSIGNMENT_STATUS.COMPLETED) {
    assignment.completedAt = new Date();
    // Decrease officer workload atomically
    await Officer.findByIdAndUpdate(assignment.officerId, [
      {
        $set: {
          currentWorkload: {
            $max: [0, { $subtract: ['$currentWorkload', 1] }],
          },
        },
      },
    ]);
  } else if (targetStatus === ASSIGNMENT_STATUS.REJECTED) {
    // Decrease workload if rejected
    await Officer.findByIdAndUpdate(assignment.officerId, [
      {
        $set: {
          currentWorkload: {
            $max: [0, { $subtract: ['$currentWorkload', 1] }],
          },
        },
      },
    ]);
  }

  await assignment.save();

  return Assignment.findById(assignment._id)
    .populate('officerId', 'name employeeCode officerId department phone availability currentWorkload')
    .populate('predictionId', 'predictionId complaintType riskLevel riskScore probability communityArea ward location');
};

/**
 * Retrieve all automated assignments for Administrative monitoring
 * @param {Object} queryParams
 */
const getAdminAssignments = async (queryParams = {}) => {
  const filter = {};

  if (queryParams.status && typeof queryParams.status === 'string') {
    const st = queryParams.status.toUpperCase().trim();
    if (Object.values(ASSIGNMENT_STATUS).includes(st)) {
      filter.status = st;
    } else {
      throw new ApiError(400, `Invalid status filter '${st}'. Allowed: [${Object.values(ASSIGNMENT_STATUS).join(', ')}]`);
    }
  }

  if (queryParams.department && typeof queryParams.department === 'string' && queryParams.department.trim()) {
    filter.department = { $regex: new RegExp(`^${escapeRegex(queryParams.department.trim())}$`, 'i') };
  }

  if (queryParams.officerId && mongoose.Types.ObjectId.isValid(queryParams.officerId)) {
    filter.officerId = queryParams.officerId;
  }

  if (queryParams.predictionId && mongoose.Types.ObjectId.isValid(queryParams.predictionId)) {
    filter.predictionId = queryParams.predictionId;
  }

  if (queryParams.startDate || queryParams.endDate) {
    const { startDate, endDate } = validateDateRange(queryParams.startDate, queryParams.endDate);
    filter.assignedAt = {};
    if (startDate) filter.assignedAt.$gte = startDate;
    if (endDate) filter.assignedAt.$lte = endDate;
  }

  if (queryParams.search && typeof queryParams.search === 'string' && queryParams.search.trim()) {
    const searchRegex = new RegExp(escapeRegex(queryParams.search.trim()), 'i');
    filter.$or = [
      { assignmentId: searchRegex },
      { department: searchRegex },
      { reasoning: searchRegex },
    ];
  }

  const { page, limit, skip } = validatePagination(queryParams);
  const sortObj = validateSort(queryParams, ALLOWED_ASSIGNMENT_SORTS, { assignedAt: -1 });

  const [assignments, total] = await Promise.all([
    Assignment.find(filter)
      .populate('officerId', 'name employeeCode officerId department phone availability currentWorkload')
      .populate('predictionId', 'predictionId complaintType riskLevel riskScore probability communityArea ward location')
      .sort(sortObj)
      .skip(skip)
      .limit(limit),
    Assignment.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    assignments,
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
 * Retrieve assignments assigned strictly to the authenticated officer
 * @param {Object} officerUser - Authenticated user document
 * @param {Object} queryParams
 */
const getOfficerAssignments = async (officerUser, queryParams = {}) => {
  const officerDoc = await Officer.findOne({
    $or: [{ userId: officerUser._id }, { officerId: officerUser.officerId }],
  });

  if (!officerDoc) {
    return {
      assignments: [],
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
    officerId: officerDoc._id,
  };

  if (queryParams.status && typeof queryParams.status === 'string') {
    const st = queryParams.status.toUpperCase().trim();
    if (Object.values(ASSIGNMENT_STATUS).includes(st)) {
      filter.status = st;
    }
  }

  if (queryParams.department && typeof queryParams.department === 'string') {
    filter.department = { $regex: new RegExp(`^${escapeRegex(queryParams.department.trim())}$`, 'i') };
  }

  const { page, limit, skip } = validatePagination(queryParams);
  const sortObj = validateSort(queryParams, ALLOWED_ASSIGNMENT_SORTS, { assignedAt: -1 });

  const [assignments, total] = await Promise.all([
    Assignment.find(filter)
      .populate('officerId', 'name employeeCode officerId department phone')
      .populate('predictionId', 'predictionId complaintType riskLevel riskScore probability communityArea ward location predictionWindowStart predictionWindowEnd')
      .sort(sortObj)
      .skip(skip)
      .limit(limit),
    Assignment.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    assignments,
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
 * Get Assignment by ID with verification details for Admin
 * @param {string} id
 * @param {Object} user
 */
const getAssignmentById = async (id, user = null) => {
  let query = {};
  const idStr = id ? id.toString().trim() : '';
  if (mongoose.Types.ObjectId.isValid(idStr)) {
    query = { $or: [{ _id: idStr }, { assignmentId: idStr.toUpperCase() }] };
  } else {
    query = { assignmentId: idStr.toUpperCase() };
  }

  const assignment = await Assignment.findOne(query)
    .populate('officerId', 'name employeeCode officerId department phone availability currentWorkload')
    .populate('predictionId', 'predictionId complaintType riskLevel riskScore probability communityArea ward location predictionWindowStart predictionWindowEnd');

  // Fallback if querying with an officer identifier string
  if (!assignment) {
    if (idStr.startsWith('OFF-') || idStr.startsWith('TEST-') || idStr.includes('EMP')) {
      return {
        scope: 'OFFICER_SPECIFIC',
        targetOfficerId: idStr,
        assignments: [],
      };
    }
    throw new ApiError(404, `Assignment not found with identifier '${idStr}'`);
  }

  // Enforce officer ownership
  if (user && user.role === 'OFFICER') {
    const officerDoc = await Officer.findOne({
      $or: [{ userId: user._id }, { officerId: user.officerId }],
    });

    const isAssigned =
      officerDoc &&
      assignment.officerId &&
      assignment.officerId._id.toString() === officerDoc._id.toString();

    if (!isAssigned) {
      throw new ApiError(
        403,
        'Forbidden: You are not authorized to view another officer’s private assignment.'
      );
    }

    return assignment;
  }

  // For Admin: attach verification record if available
  const verification = await Verification.findOne({
    $or: [{ assignmentId: assignment._id }, { predictionId: assignment.predictionId?._id }],
  });

  return {
    assignment,
    prediction: assignment.predictionId,
    officer: assignment.officerId,
    verification: verification || null,
    isAdminOverride: assignment.isAdminOverride,
    engineSource: 'DEMO ASSIGNMENT LOGIC',
  };
};

module.exports = {
  findEligibleOfficers,
  rankOfficers,
  assignPrediction,
  updateAssignmentStatus,
  getAdminAssignments,
  getOfficerAssignments,
  getAssignmentById,
};
