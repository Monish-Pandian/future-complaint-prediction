const officerService = require('../services/officerService');
const predictionService = require('../services/predictionService');
const assignmentService = require('../services/assignmentService');
const heatmapService = require('../services/heatmapService');
const verificationService = require('../services/verificationService');
const { sendSuccess } = require('../utils/responseHandler');

/**
 * Officer Own Dashboard
 * Returns strictly isolated department-relevant metrics, officer profile, and officer's own assigned predicted problems.
 * @route GET /api/v1/officer/dashboard
 */
const getDashboard = async (req, res, next) => {
  try {
    const dashboardData = await officerService.getOfficerDashboard(req.user);
    return sendSuccess(res, 200, dashboardData);
  } catch (error) {
    next(error);
  }
};

/**
 * Officer Assigned Predicted Problems
 * @route GET /api/v1/officer/predictions
 */
const getPredictions = async (req, res, next) => {
  try {
    const result = await predictionService.getOfficerPredictions(req.user, req.query);
    return sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Officer Get Single Assigned Predicted Problem
 * @route GET /api/v1/officer/predictions/:id
 */
const getPredictionById = async (req, res, next) => {
  try {
    const result = await predictionService.getPredictionById(req.params.id, req.user);
    const prediction = result.prediction || result;
    return sendSuccess(res, 200, { prediction });
  } catch (error) {
    next(error);
  }
};

/**
 * Officer Own Assignments
 * Returns ONLY assignments assigned to the authenticated officer.
 * @route GET /api/v1/officer/assignments
 */
const getAssignments = async (req, res, next) => {
  try {
    const result = await assignmentService.getOfficerAssignments(req.user, req.query);
    return sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Officer Specific Assignment by ID (Protected by Ownership)
 * @route GET /api/v1/officer/assignments/:id
 */
const getAssignmentById = async (req, res, next) => {
  try {
    const targetId = req.params.id || req.params.officerId;
    const result = await assignmentService.getAssignmentById(targetId, req.user);
    if (result && result.targetOfficerId) {
      return sendSuccess(res, 200, result);
    }
    return sendSuccess(res, 200, { assignment: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Department Heatmap (Strictly isolated to officer department)
 * Returns GeoJSON FeatureCollection of department predicted problems
 * @route GET /api/v1/officer/heatmap
 */
const getDepartmentHeatmap = async (req, res, next) => {
  try {
    const heatmapData = await heatmapService.getHeatmapData(req.query, req.user);
    return sendSuccess(res, 200, heatmapData);
  } catch (error) {
    next(error);
  }
};

// ====================================================
// FIELD VERIFICATION CONTROLLER ACTIONS
// ====================================================

/**
 * List Field Verifications submitted by the authenticated Officer
 * @route GET /api/v1/officer/verifications
 */
const getVerifications = async (req, res, next) => {
  try {
    const result = await verificationService.getOfficerVerifications(req.user, req.query);
    return sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get Single Verification by ID
 * @route GET /api/v1/officer/verifications/:id
 */
const getVerificationById = async (req, res, next) => {
  try {
    const verification = await verificationService.getVerificationById(req.params.id, req.user);
    return sendSuccess(res, 200, { verification });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit Field Verification for an assigned predicted problem
 * @route POST /api/v1/officer/verifications
 */
const createVerification = async (req, res, next) => {
  try {
    const verification = await verificationService.submitVerification(req.user, req.body);
    return sendSuccess(res, 201, { verification });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Field Verification
 * @route PATCH /api/v1/officer/verifications/:id
 */
const updateVerification = async (req, res, next) => {
  try {
    const verification = await verificationService.updateVerification(
      req.params.id,
      req.user,
      req.body
    );
    return sendSuccess(res, 200, { verification });
  } catch (error) {
    next(error);
  }
};

/**
 * Officer Verification Tasks
 * @route GET /api/v1/officer/verification-tasks
 */
const getVerificationTasks = (req, res) => {
  return sendSuccess(res, 200, {
    scope: 'OFFICER_TASKS',
    department: req.user.department,
    officerId: req.user.officerId || req.user._id.toString(),
    tasks: [],
  });
};

/**
 * Officer Verification History
 * @route GET /api/v1/officer/verification-history
 */
const getVerificationHistory = (req, res) => {
  return sendSuccess(res, 200, {
    scope: 'OFFICER_HISTORY',
    department: req.user.department,
    officerId: req.user.officerId || req.user._id.toString(),
    history: [],
  });
};

/**
 * Officer accepts assigned prediction
 * @route PATCH /api/v1/officer/assignments/:id/accept
 */
const acceptAssignment = async (req, res, next) => {
  try {
    const assignment = await assignmentService.updateAssignmentStatus(
      req.params.id,
      'ACCEPTED',
      req.user
    );
    return sendSuccess(res, 200, { assignment, message: 'Assignment accepted successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Officer starts assigned prediction field task
 * @route PATCH /api/v1/officer/assignments/:id/start
 */
const startAssignment = async (req, res, next) => {
  try {
    const assignment = await assignmentService.updateAssignmentStatus(
      req.params.id,
      'IN_PROGRESS',
      req.user
    );
    return sendSuccess(res, 200, { assignment, message: 'Assignment task started (IN_PROGRESS).' });
  } catch (error) {
    next(error);
  }
};

/**
 * Officer rejects assigned prediction
 * @route PATCH /api/v1/officer/assignments/:id/reject
 */
const rejectAssignment = async (req, res, next) => {
  try {
    const assignment = await assignmentService.updateAssignmentStatus(
      req.params.id,
      'REJECTED',
      req.user
    );
    return sendSuccess(res, 200, { assignment, message: 'Assignment rejected.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Officer updates assignment status with validation
 * @route PATCH /api/v1/officer/assignments/:id/status
 */
const updateAssignmentStatus = async (req, res, next) => {
  try {
    const status = req.body.status;
    const assignment = await assignmentService.updateAssignmentStatus(
      req.params.id,
      status,
      req.user
    );
    return sendSuccess(res, 200, { assignment });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getPredictions,
  getPredictionById,
  getAssignments,
  getAssignmentById,
  acceptAssignment,
  startAssignment,
  rejectAssignment,
  updateAssignmentStatus,
  getDepartmentHeatmap,
  getVerifications,
  getVerificationById,
  createVerification,
  updateVerification,
  getVerificationTasks,
  getVerificationHistory,
};
