const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Officer, AVAILABILITY_STATUS } = require('../models/Officer');
const { User, ROLES } = require('../models/User');
const { Assignment, ASSIGNMENT_STATUS } = require('../models/Assignment');
const { Prediction, RISK_LEVELS, VERIFICATION_STATUS } = require('../models/Prediction');
const {
  escapeRegex,
  sanitizeString,
  validatePagination,
  validateSort,
} = require('../utils/sanitizer');
const ApiError = require('../utils/apiError');

const ALLOWED_OFFICER_SORTS = [
  'name',
  'department',
  'currentWorkload',
  'createdAt',
  'updatedAt',
  'employeeCode',
  'availability',
];

/**
 * Helper to find officer by MongoDB ObjectId or unique string identifier
 */
const findOfficerByIdentifier = async (id) => {
  let query = {};
  if (mongoose.Types.ObjectId.isValid(id)) {
    query = { $or: [{ _id: id }, { officerId: id.toUpperCase() }, { employeeCode: id.toUpperCase() }] };
  } else {
    query = { $or: [{ officerId: id.toUpperCase() }, { employeeCode: id.toUpperCase() }] };
  }
  return Officer.findOne(query).populate('userId', 'name email role isActive');
};

/**
 * Create a new Officer record
 * @param {Object} data
 */
const createOfficer = async (data) => {
  const employeeCode = (data.employeeCode || '').toUpperCase().trim();
  const officerId = (data.officerId || `OFF-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase().trim();

  if (!employeeCode) {
    throw new ApiError(400, 'Employee code is required.');
  }

  // Check unique employee code
  const existingCode = await Officer.findOne({ employeeCode });
  if (existingCode) {
    throw new ApiError(409, `Employee code '${employeeCode}' is already registered.`);
  }

  // Check unique officer ID
  const existingOfficerId = await Officer.findOne({ officerId });
  if (existingOfficerId) {
    throw new ApiError(409, `Officer ID '${officerId}' is already assigned.`);
  }

  let linkedUserId = data.userId || null;

  // If email and password provided, provision a User login account
  if (data.email && data.password) {
    const email = data.email.toLowerCase().trim();
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(409, `Email '${email}' is already associated with an account.`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const newUser = await User.create({
      name: data.name.trim(),
      email,
      passwordHash,
      role: ROLES.OFFICER,
      officerId,
      department: data.department.trim(),
      isActive: data.active !== undefined ? data.active : true,
    });

    linkedUserId = newUser._id;
  }

  const officer = await Officer.create({
    officerId,
    userId: linkedUserId,
    employeeCode,
    name: (data.name || '').trim(),
    department: (data.department || 'Municipal').trim(),
    phone: data.phone ? data.phone.trim() : undefined,
    skills: Array.isArray(data.skills) ? data.skills : [],
    availability: data.availability || AVAILABILITY_STATUS.AVAILABLE,
    currentWorkload: Math.max(0, data.currentWorkload || 0),
    active: data.active !== undefined ? data.active : true,
    location: data.location || {
      type: 'Point',
      coordinates: [0, 0],
    },
  });

  return Officer.findById(officer._id).populate('userId', 'name email role isActive');
};

/**
 * List all officers with filtering, search, and pagination
 * @param {Object} queryParams
 */
const getOfficers = async (queryParams = {}) => {
  const filter = {};

  // Department filter
  if (queryParams.department && typeof queryParams.department === 'string') {
    filter.department = { $regex: new RegExp(`^${escapeRegex(queryParams.department.trim())}$`, 'i') };
  }

  // Availability filter
  if (queryParams.availability && typeof queryParams.availability === 'string') {
    const avail = queryParams.availability.toUpperCase().trim();
    if (Object.values(AVAILABILITY_STATUS).includes(avail)) {
      filter.availability = avail;
    } else {
      throw new ApiError(400, `Invalid availability filter '${avail}'. Allowed: [${Object.values(AVAILABILITY_STATUS).join(', ')}]`);
    }
  }

  // Active status filter
  if (queryParams.active !== undefined) {
    filter.active = queryParams.active === 'true' || queryParams.active === true;
  }

  // Search by name, officerId, employeeCode, or skills
  if (queryParams.search && typeof queryParams.search === 'string' && queryParams.search.trim()) {
    const searchRegex = new RegExp(escapeRegex(queryParams.search.trim()), 'i');
    filter.$or = [
      { name: searchRegex },
      { officerId: searchRegex },
      { employeeCode: searchRegex },
      { department: searchRegex },
      { skills: searchRegex },
    ];
  }

  // Pagination & Sorting
  const { page, limit, skip } = validatePagination(queryParams);
  const sortObj = validateSort(queryParams, ALLOWED_OFFICER_SORTS, { createdAt: -1 });

  const [officers, total] = await Promise.all([
    Officer.find(filter)
      .populate('userId', 'name email role isActive')
      .sort(sortObj)
      .skip(skip)
      .limit(limit),
    Officer.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    officers,
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
 * Officer Dashboard Data Service
 * Resolves officer profile, department metrics, and current assignments
 * @param {Object} user - Authenticated user context
 */
const getOfficerDashboard = async (user) => {
  const officerDoc = await Officer.findOne({
    $or: [{ userId: user._id }, { officerId: user.officerId }],
  });

  const officerDepartment = officerDoc?.department || user.department || 'Municipal';
  const officerId = officerDoc?.officerId || user.officerId || 'OFF-UNKNOWN';

  // Retrieve officer's assignments if officerDoc exists
  let myAssignmentsDocs = [];
  if (officerDoc) {
    myAssignmentsDocs = await Assignment.find({ officerId: officerDoc._id })
      .populate('predictionId')
      .sort({ assignedAt: -1 });
  }

  const assignedPredictionsCount = myAssignmentsDocs.length;
  let pendingVerificationCount = 0;
  let verifiedTodayCount = 0;
  let highRiskPredictionsCount = 0;
  let confirmedProblemsCount = 0;
  let notFoundProblemsCount = 0;

  const formattedMyAssignments = [];

  for (const asgn of myAssignmentsDocs) {
    const pred = asgn.predictionId;
    if (!pred) continue;

    if (
      asgn.status === ASSIGNMENT_STATUS.AI_ASSIGNED ||
      asgn.status === ASSIGNMENT_STATUS.ACCEPTED ||
      asgn.status === ASSIGNMENT_STATUS.IN_PROGRESS
    ) {
      pendingVerificationCount++;
    }

    if (
      asgn.status === ASSIGNMENT_STATUS.COMPLETED ||
      asgn.status === ASSIGNMENT_STATUS.VERIFICATION_SUBMITTED ||
      pred.verificationStatus === VERIFICATION_STATUS.VERIFIED ||
      pred.verificationStatus === VERIFICATION_STATUS.VERIFIED_TRUE ||
      pred.verificationStatus === VERIFICATION_STATUS.VERIFIED_FALSE
    ) {
      verifiedTodayCount++;
    }

    if (pred.riskLevel === RISK_LEVELS.HIGH || pred.riskLevel === RISK_LEVELS.CRITICAL) {
      highRiskPredictionsCount++;
    }

    if (
      pred.verificationStatus === VERIFICATION_STATUS.VERIFIED_TRUE ||
      asgn.status === ASSIGNMENT_STATUS.COMPLETED
    ) {
      confirmedProblemsCount++;
    }

    if (
      pred.verificationStatus === VERIFICATION_STATUS.VERIFIED_FALSE ||
      asgn.status === ASSIGNMENT_STATUS.REJECTED
    ) {
      notFoundProblemsCount++;
    }

    formattedMyAssignments.push({
      assignmentId: asgn.assignmentId,
      predictionId: pred.predictionId,
      complaintType: pred.complaintType,
      communityArea: pred.communityArea,
      ward: pred.ward,
      riskScore: pred.riskScore,
      riskLevel: pred.riskLevel,
      distanceKm: asgn.distanceKm,
      status: asgn.status,
      predictionWindow: {
        start: pred.predictionWindowStart,
        end: pred.predictionWindowEnd,
      },
      location: pred.location,
    });
  }

  // Retrieve department predictions for heatmap summary
  const departmentPredictions = await Prediction.find({
    department: { $regex: new RegExp(`^${escapeRegex(officerDepartment)}$`, 'i') },
  })
    .sort({ predictionDate: -1 })
    .limit(20);

  return {
    officer: {
      officerId,
      name: officerDoc?.name || user.name,
      employeeCode: officerDoc?.employeeCode || officerId,
      department: officerDepartment,
      phone: officerDoc?.phone || null,
      availability: officerDoc?.availability || 'AVAILABLE',
      currentWorkload: officerDoc?.currentWorkload || 0,
      active: officerDoc ? officerDoc.active : true,
    },
    department: officerDepartment,
    metrics: {
      assignedPredictions: assignedPredictionsCount,
      pendingVerification: pendingVerificationCount,
      verifiedToday: verifiedTodayCount,
      highRiskPredictions: highRiskPredictionsCount,
      confirmedProblems: confirmedProblemsCount,
      notFoundProblems: notFoundProblemsCount,
    },
    myAssignments: formattedMyAssignments,
    departmentPredictions,
  };
};

/**
 * Get single officer by identifier with assignment & verification summaries
 * @param {string} id - ObjectId, officerId, or employeeCode
 */
const getOfficerById = async (id) => {
  const officer = await findOfficerByIdentifier(id);
  if (!officer) {
    throw new ApiError(404, `Officer not found with identifier '${id}'`);
  }

  const [assignments, predictions, activeAssignmentsCount] = await Promise.all([
    Assignment.find({ officerId: officer._id })
      .populate('predictionId', 'predictionId complaintType riskLevel riskScore probability')
      .sort({ assignedAt: -1 })
      .limit(10),
    Prediction.find({ assignedOfficer: officer._id })
      .sort({ predictionDate: -1 })
      .limit(10),
    Assignment.countDocuments({
      officerId: officer._id,
      status: { $in: [ASSIGNMENT_STATUS.AI_ASSIGNED, ASSIGNMENT_STATUS.ACCEPTED, ASSIGNMENT_STATUS.IN_PROGRESS] },
    }),
  ]);

  const completedVerificationsCount = await Assignment.countDocuments({
    officerId: officer._id,
    status: ASSIGNMENT_STATUS.COMPLETED,
  });

  return {
    officer,
    recentAssignments: assignments,
    recentPredictions: predictions,
    assignmentSummary: {
      total: assignments.length,
      active: activeAssignmentsCount,
      completed: completedVerificationsCount,
    },
    verificationSummary: {
      completed: completedVerificationsCount,
      pending: activeAssignmentsCount,
    },
  };
};

/**
 * Get live officer operational workload breakdown
 * @param {string} id - ObjectId, officerId, or employeeCode
 */
const getOfficerWorkload = async (id) => {
  const officer = await findOfficerByIdentifier(id);
  if (!officer) {
    throw new ApiError(404, `Officer not found with identifier '${id}'`);
  }

  const [activeAssignments, pendingVerifications, completedVerifications] = await Promise.all([
    Assignment.countDocuments({
      officerId: officer._id,
      status: { $in: [ASSIGNMENT_STATUS.AI_ASSIGNED, ASSIGNMENT_STATUS.ACCEPTED, ASSIGNMENT_STATUS.IN_PROGRESS] },
    }),
    Assignment.countDocuments({
      officerId: officer._id,
      status: { $in: [ASSIGNMENT_STATUS.ACCEPTED, ASSIGNMENT_STATUS.IN_PROGRESS] },
    }),
    Assignment.countDocuments({
      officerId: officer._id,
      status: ASSIGNMENT_STATUS.COMPLETED,
    }),
  ]);

  return {
    officerId: officer.officerId,
    name: officer.name,
    department: officer.department,
    availability: officer.availability,
    currentWorkload: officer.currentWorkload,
    activeAssignments,
    pendingVerifications,
    completedVerifications,
    active: officer.active,
  };
};

/**
 * Update Officer details
 * @param {string} id
 * @param {Object} updateData
 */
const updateOfficer = async (id, updateData) => {
  const officer = await findOfficerByIdentifier(id);
  if (!officer) {
    throw new ApiError(404, `Officer not found with identifier '${id}'`);
  }

  if (updateData.name) officer.name = updateData.name.trim();
  if (updateData.department) officer.department = updateData.department.trim();
  if (updateData.phone !== undefined) officer.phone = updateData.phone ? updateData.phone.trim() : null;
  if (Array.isArray(updateData.skills)) officer.skills = updateData.skills;
  if (updateData.location) officer.location = updateData.location;
  if (updateData.availability) officer.availability = updateData.availability;

  if (updateData.currentWorkload !== undefined) {
    const wl = Number(updateData.currentWorkload);
    if (!isNaN(wl) && wl >= 0) {
      officer.currentWorkload = wl;
    }
  }

  if (updateData.active !== undefined) {
    officer.active = updateData.active;
    if (officer.userId) {
      await User.findByIdAndUpdate(officer.userId, { isActive: updateData.active });
    }
  }

  await officer.save();
  return Officer.findById(officer._id).populate('userId', 'name email role isActive');
};

/**
 * Update Officer Status (Availability and Active state)
 * @param {string} id
 * @param {Object} statusData
 */
const updateOfficerStatus = async (id, statusData) => {
  const officer = await findOfficerByIdentifier(id);
  if (!officer) {
    throw new ApiError(404, `Officer not found with identifier '${id}'`);
  }

  if (statusData.availability) {
    const avail = statusData.availability.toUpperCase();
    if (!Object.values(AVAILABILITY_STATUS).includes(avail)) {
      throw new ApiError(400, `Invalid availability status '${statusData.availability}'`);
    }
    officer.availability = avail;
  }

  if (statusData.active !== undefined) {
    officer.active = statusData.active;
    if (officer.userId) {
      await User.findByIdAndUpdate(officer.userId, { isActive: statusData.active });
    }
  }

  await officer.save();
  return Officer.findById(officer._id).populate('userId', 'name email role isActive');
};

/**
 * Soft delete (deactivate) an officer (Section 34: Preserve Research History)
 * @param {string} id
 */
const deleteOfficer = async (id) => {
  const officer = await findOfficerByIdentifier(id);
  if (!officer) {
    throw new ApiError(404, `Officer not found with identifier '${id}'`);
  }

  // Soft deactivation to preserve historical assignments & verifications
  officer.active = false;
  officer.availability = AVAILABILITY_STATUS.OFF_DUTY;
  await officer.save();

  if (officer.userId) {
    await User.findByIdAndUpdate(officer.userId, { isActive: false });
  }

  return {
    success: true,
    message: `Officer '${officer.name}' (${officer.officerId}) has been deactivated successfully. Historical assignments preserved.`,
    officer,
    deleted: false,
  };
};

module.exports = {
  findOfficerByIdentifier,
  createOfficer,
  getOfficers,
  getOfficerDashboard,
  getOfficerById,
  getOfficerWorkload,
  updateOfficer,
  updateOfficerStatus,
  deleteOfficer,
};
