const express = require('express');
const {
  selectCandidates,
  getCandidates,
  getSummary,
  getOfficerCandidates,
  assignCandidates,
  unassignCandidates,
  acceptCandidate,
  rejectCandidate,
  getAssignmentPreview,
  autoAssignCandidates,
} = require('../controllers/verificationSelectionController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../models/User');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// ====================================================
// ADMIN ROUTES (ADMIN only)
// ====================================================
const adminRouter = express.Router();
adminRouter.use(authorize(ROLES.ADMIN));

// Trigger verification candidate selection for a prediction cycle
adminRouter.post('/select', selectCandidates);

// Get verification candidates for a prediction cycle
adminRouter.get('/candidates', getCandidates);

// Get verification selection summary for a prediction cycle
adminRouter.get('/summary', getSummary);

// Assign officer to verification candidates
adminRouter.patch('/candidates/assign', assignCandidates);

// Unassign officer from verification candidates
adminRouter.patch('/candidates/unassign', unassignCandidates);

// Automatic assignment preview (research-based)
adminRouter.get('/assign-auto/preview', getAssignmentPreview);

// Automatic assignment execution (research-based)
adminRouter.post('/assign-auto', autoAssignCandidates);

router.use('/admin', adminRouter);

// ====================================================
// OFFICER ROUTES (OFFICER + ADMIN)
// ====================================================
const officerRouter = express.Router();
officerRouter.use(authorize(ROLES.OFFICER, ROLES.ADMIN));

// Get officer's assigned verification candidates
officerRouter.get('/candidates', getOfficerCandidates);

// Officer accepts assigned verification candidate
officerRouter.patch('/candidates/:id/accept', acceptCandidate);

// Officer rejects assigned verification candidate
officerRouter.patch('/candidates/:id/reject', rejectCandidate);

router.use('/officer', officerRouter);

module.exports = router;