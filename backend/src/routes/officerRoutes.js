const express = require('express');
const {
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
} = require('../controllers/officerController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const departmentAccess = require('../middleware/departmentAccess');
const checkOwnership = require('../middleware/checkOwnership');
const { ROLES } = require('../models/User');

const router = express.Router();

// Apply authentication to all officer routes
router.use(authenticate);

// Allow both OFFICER and ADMIN
router.use(authorize(ROLES.OFFICER, ROLES.ADMIN));

router.get('/dashboard', getDashboard);

// Assigned Predicted Problems for Officer
router.get('/predictions', getPredictions);
router.get('/predictions/:id', getPredictionById);

// Assigned Tasks & Officer Assignments
router.get('/assignments', getAssignments);
router.get('/assignments/:id', checkOwnership('id'), getAssignmentById);
router.patch('/assignments/:id/accept', checkOwnership('id'), acceptAssignment);
router.patch('/assignments/:id/start', checkOwnership('id'), startAssignment);
router.patch('/assignments/:id/reject', checkOwnership('id'), rejectAssignment);
router.patch('/assignments/:id/status', checkOwnership('id'), updateAssignmentStatus);

// Field Verifications (Prediction vs Actual Observation)
router.get('/verifications', getVerifications);
router.get('/verifications/:id', getVerificationById);
router.post('/verifications', createVerification);
router.patch('/verifications/:id', updateVerification);

// Heatmap & Verification Task Aliases
router.get('/heatmap', departmentAccess, getDepartmentHeatmap);
router.get('/verification-tasks', getVerificationTasks);
router.get('/verification-history', getVerificationHistory);
router.put('/verification/:officerId', checkOwnership('officerId'), updateVerification);

module.exports = router;
