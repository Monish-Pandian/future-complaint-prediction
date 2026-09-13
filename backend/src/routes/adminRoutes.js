const express = require('express');
const {
  getDashboard,
  getPredictions,
  getPredictionById,
  createPrediction,
  runPredictionCycle,
  getGlobalHeatmap,
  getAssignments,
  getAssignmentById,
  autoAssignPrediction,
  getVerifications,
  getVerificationById,
  getVerificationMonitoring,
  getEvaluationMetrics,
  getEvaluationRecords,
  getOfficers,
  getOfficerById,
  getOfficerWorkload,
  createOfficer,
  updateOfficer,
  updateOfficerStatus,
  deleteOfficer,
  getModelStatus,
  getTrainingRun,
  getTrainingRuns,
  triggerManualRetraining,
  getRetrainingConfig,
  updateRetrainingConfig,
  checkRetrainingEligibility,
  getActiveModel,
  validateHistoricalData,
  getPredictionSchedulerStatus,
  getPredictionSchedulerConfig,
  updatePredictionSchedulerConfig,
  triggerPredictionCycleManual,
  getVerificationSelectionConfig,
} = require('../controllers/adminController');
const {
  validateCreateOfficer,
  validateUpdateOfficer,
  validateUpdateStatus,
} = require('../validators/officerValidators');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../models/User');

const router = express.Router();

// Apply authentication and ADMIN role requirement to all admin routes
router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

// Overview & Intelligence Routes
router.get('/dashboard', getDashboard);
router.get('/heatmap', getGlobalHeatmap);
router.get('/verification-monitoring', getVerificationMonitoring);

// Predicted Problems Management
router.get('/predictions', getPredictions);
router.get('/predictions/:id', getPredictionById);
router.post('/predictions', createPrediction);
router.post('/predictions/run-cycle', runPredictionCycle);

// AI Assignment Management & Monitoring
router.get('/assignments', getAssignments);
router.get('/assignments/:id', getAssignmentById);
router.post('/assignments/auto-assign/:predictionId', autoAssignPrediction);

// Field Verifications Monitoring
router.get('/verifications', getVerifications);
router.get('/verifications/:id', getVerificationById);

// AI Feedback & Model Evaluation Routes
router.get('/evaluation/metrics', getEvaluationMetrics);
router.get('/evaluation/records', getEvaluationRecords);
router.get('/evaluation', getEvaluationMetrics);

// Officer Management CRUD Routes
router.get('/officers', getOfficers);
router.get('/officers/:id/workload', getOfficerWorkload);
router.get('/officers/:id', getOfficerById);
router.post('/officers', validateCreateOfficer, createOfficer);
router.patch('/officers/:id', validateUpdateOfficer, updateOfficer);
router.patch('/officers/:id/status', validateUpdateStatus, updateOfficerStatus);
router.delete('/officers/:id', deleteOfficer);

// Model Training & Retraining Routes
router.get('/model/status', getModelStatus);
router.get('/model/active', getActiveModel);
router.get('/model/training-runs', getTrainingRuns);
router.get('/model/training-runs/:modelVersion', getTrainingRun);
router.post('/model/retrain', triggerManualRetraining);
router.get('/model/retraining-config', getRetrainingConfig);
router.patch('/model/retraining-config', updateRetrainingConfig);
router.get('/model/retraining-eligibility', checkRetrainingEligibility);
router.get('/model/validate-data', validateHistoricalData);

// Prediction Scheduler Routes
router.get('/prediction-scheduler/status', getPredictionSchedulerStatus);
router.get('/prediction-scheduler/config', getPredictionSchedulerConfig);
router.patch('/prediction-scheduler/config', updatePredictionSchedulerConfig);
router.post('/prediction-scheduler/trigger', triggerPredictionCycleManual);

// Verification Selection Routes
router.get('/verification-selection/config', getVerificationSelectionConfig);

module.exports = router;
