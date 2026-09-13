const predictionService = require('../services/predictionService');
const assignmentService = require('../services/assignmentService');
const verificationService = require('../services/verificationService');
const officerService = require('../services/officerService');
const heatmapService = require('../services/heatmapService');
const aiService = require('../services/aiService');
const evaluationService = require('../services/evaluationService');
const { getAdminDashboardMetrics } = require('../services/adminService');
const { ModelTrainingService } = require('../services/modelTrainingService');
const { RetrainingService } = require('../services/retrainingService');
const { PredictionSchedulerService } = require('../services/predictionSchedulerService');
const { sendSuccess } = require('../utils/responseHandler');

const modelTrainingService = new ModelTrainingService();
const retrainingService = new RetrainingService();
const predictionSchedulerService = new PredictionSchedulerService();

// ====================================================
// OVERVIEW & INTELLIGENCE CONTROLLER ACTIONS
// ====================================================

/**
 * Admin Operational Dashboard
 * @route GET /api/v1/admin/dashboard
 */
const getDashboard = async (req, res, next) => {
  try {
    const metrics = await getAdminDashboardMetrics();
    return sendSuccess(res, 200, metrics);
  } catch (error) {
    next(error);
  }
};

/**
 * Global Municipality Heatmap
 * @route GET /api/v1/admin/heatmap
 */
const getGlobalHeatmap = async (req, res, next) => {
  try {
    const heatmapData = await heatmapService.getAdminHeatmap(req.query);
    return sendSuccess(res, 200, heatmapData);
  } catch (error) {
    next(error);
  }
};

/**
 * Comprehensive Field Verification Monitoring
 * @route GET /api/v1/admin/verification-monitoring
 */
const getVerificationMonitoring = async (req, res, next) => {
  try {
    const monitoringData = await verificationService.getAdminVerifications(req.query);
    return sendSuccess(res, 200, monitoringData);
  } catch (error) {
    next(error);
  }
};

/**
 * AI Model Evaluation & Performance Metrics Summary
 * @route GET /api/v1/admin/evaluation/metrics
 */
const getEvaluationMetrics = async (req, res, next) => {
  try {
    const summary = await evaluationService.getEvaluationSummary(req.query);
    return sendSuccess(res, 200, summary);
  } catch (error) {
    next(error);
  }
};

/**
 * AI Evaluation Records with attached Prediction, Verification, and Feedback
 * @route GET /api/v1/admin/evaluation/records
 */
const getEvaluationRecords = async (req, res, next) => {
  try {
    const records = await evaluationService.getEvaluationRecords(req.query);
    return sendSuccess(res, 200, records);
  } catch (error) {
    next(error);
  }
};

// ====================================================
// PREDICTED PROBLEMS CONTROLLER ACTIONS
// ====================================================

/**
 * Admin Predicted Problems View (All departments & citywide)
 * @route GET /api/v1/admin/predictions
 */
const getPredictions = async (req, res, next) => {
  try {
    const result = await predictionService.getAllPredictions(req.query);
    return sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin Get Prediction by ID
 * @route GET /api/v1/admin/predictions/:id
 */
const getPredictionById = async (req, res, next) => {
  try {
    const result = await predictionService.getPredictionById(req.params.id);
    return sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin Create Predicted Problem (Ingestion endpoint)
 * @route POST /api/v1/admin/predictions
 */
const createPrediction = async (req, res, next) => {
  try {
    const prediction = await predictionService.createPrediction(req.body);
    return sendSuccess(res, 201, { prediction });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin Trigger Prediction Cycle (AI Service Integration)
 * @route POST /api/v1/admin/predictions/run-cycle
 */
const runPredictionCycle = async (req, res, next) => {
  try {
    const result = await aiService.ingestPredictionCycle(req.body);
    return sendSuccess(res, 201, result);
  } catch (error) {
    next(error);
  }
};

// ====================================================
// AI ASSIGNMENTS CONTROLLER ACTIONS
// ====================================================

/**
 * Admin AI Assignments View
 * @route GET /api/v1/admin/assignments
 */
const getAssignments = async (req, res, next) => {
  try {
    const result = await assignmentService.getAdminAssignments(req.query);
    return sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin Get Assignment by ID
 * @route GET /api/v1/admin/assignments/:id
 */
const getAssignmentById = async (req, res, next) => {
  try {
    const result = await assignmentService.getAssignmentById(req.params.id);
    return sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin Trigger Automated AI Assignment
 * @route POST /api/v1/admin/assignments/auto-assign/:predictionId
 */
const autoAssignPrediction = async (req, res, next) => {
  try {
    const assignment = await assignmentService.assignPrediction(req.params.predictionId, {
      reassign: req.query.reassign === 'true',
    });
    return sendSuccess(res, 200, { assignment });
  } catch (error) {
    next(error);
  }
};

// ====================================================
// VERIFICATION MONITORING CONTROLLER ACTIONS
// ====================================================

/**
 * Admin Verifications View (Monitor all field verifications)
 * @route GET /api/v1/admin/verifications
 */
const getVerifications = async (req, res, next) => {
  try {
    const result = await verificationService.getAdminVerifications(req.query);
    return sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin Get Verification by ID
 * @route GET /api/v1/admin/verifications/:id
 */
const getVerificationById = async (req, res, next) => {
  try {
    const result = await verificationService.getVerificationById(req.params.id);
    return sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
};

// ====================================================
// OFFICER MANAGEMENT CRUD CONTROLLER ACTIONS
// ====================================================

/**
 * List Officers with filters, search, and pagination
 * @route GET /api/v1/admin/officers
 */
const getOfficers = async (req, res, next) => {
  try {
    const result = await officerService.getOfficers(req.query);
    return sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get Officer by ID / employee code with summary counts
 * @route GET /api/v1/admin/officers/:id
 */
const getOfficerById = async (req, res, next) => {
  try {
    const result = await officerService.getOfficerById(req.params.id);
    const officerObj = result.officer
      ? result.officer.toObject
        ? result.officer.toObject()
        : { ...result.officer }
      : {};
    officerObj.assignmentSummary = result.assignmentSummary;
    officerObj.verificationSummary = result.verificationSummary;
    officerObj.recentAssignments = result.recentAssignments;
    officerObj.recentPredictions = result.recentPredictions;

    return sendSuccess(res, 200, {
      officer: officerObj,
      recentAssignments: result.recentAssignments,
      recentPredictions: result.recentPredictions,
      assignmentSummary: result.assignmentSummary,
      verificationSummary: result.verificationSummary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Officer Workload Breakdown
 * @route GET /api/v1/admin/officers/:id/workload
 */
const getOfficerWorkload = async (req, res, next) => {
  try {
    const workload = await officerService.getOfficerWorkload(req.params.id);
    return sendSuccess(res, 200, workload);
  } catch (error) {
    next(error);
  }
};

/**
 * Create Officer
 * @route POST /api/v1/admin/officers
 */
const createOfficer = async (req, res, next) => {
  try {
    const officer = await officerService.createOfficer(req.body);
    return sendSuccess(res, 201, { officer });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Officer
 * @route PATCH /api/v1/admin/officers/:id
 */
const updateOfficer = async (req, res, next) => {
  try {
    const officer = await officerService.updateOfficer(req.params.id, req.body);
    return sendSuccess(res, 200, { officer });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Officer Status (active / availability)
 * @route PATCH /api/v1/admin/officers/:id/status
 */
const updateOfficerStatus = async (req, res, next) => {
  try {
    const officer = await officerService.updateOfficerStatus(req.params.id, req.body);
    return sendSuccess(res, 200, { officer });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete / Soft Deactivate Officer
 * @route DELETE /api/v1/admin/officers/:id
 */
const deleteOfficer = async (req, res, next) => {
  try {
    const result = await officerService.deleteOfficer(req.params.id, {
      hard: req.query.hard === 'true',
    });
    return sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
};

// ====================================================
// MODEL TRAINING & RETRAINING CONTROLLER ACTIONS
// ====================================================

/**
 * Get model training status and history
 * @route GET /api/v1/admin/model/status
 */
const getModelStatus = async (req, res, next) => {
  try {
    const status = await retrainingService.getRetrainingStatus();
    return sendSuccess(res, 200, status);
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed model training run
 * @route GET /api/v1/admin/model/training-runs/:modelVersion
 */
const getTrainingRun = async (req, res, next) => {
  try {
    const { modelVersion } = req.params;
    const trainingRun = await modelTrainingService.getTrainingRun(modelVersion);
    if (!trainingRun) {
      return sendSuccess(res, 404, { message: 'Training run not found' });
    }
    return sendSuccess(res, 200, trainingRun);
  } catch (error) {
    next(error);
  }
};

/**
 * List all model training runs
 * @route GET /api/v1/admin/model/training-runs
 */
const getTrainingRuns = async (req, res, next) => {
  try {
    const runs = await modelTrainingService.getTrainingHistory();
    return sendSuccess(res, 200, runs);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin manual retraining trigger
 * @route POST /api/v1/admin/model/retrain
 */
const triggerManualRetraining = async (req, res, next) => {
  try {
    if (modelTrainingService.isTrainingActive()) {
      return sendSuccess(res, 409, { message: 'Training already in progress', trainingJobId: modelTrainingService.getActiveTrainingJobId() });
    }

    const modelVersion = req.body.modelVersion || `xgb-manual-${Date.now()}`;
    const result = await retrainingService.triggerRetraining('manual');

    return sendSuccess(res, 202, {
      message: 'Retraining triggered',
      modelVersion: result.modelVersion,
      status: result.status,
      trainingRunId: result.trainingRunId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get retraining configuration
 * @route GET /api/v1/admin/model/retraining-config
 */
const getRetrainingConfig = async (req, res, next) => {
  try {
    const config = await retrainingService.getRetrainingConfig();
    return sendSuccess(res, 200, config);
  } catch (error) {
    next(error);
  }
};

/**
 * Update retraining configuration
 * @route PATCH /api/v1/admin/model/retraining-config
 */
const updateRetrainingConfig = async (req, res, next) => {
  try {
    const config = await retrainingService.updateRetrainingConfig(req.body);
    return sendSuccess(res, 200, { message: 'Retraining configuration updated', config });
  } catch (error) {
    next(error);
  }
};

/**
 * Check retraining eligibility without triggering
 * @route GET /api/v1/admin/model/retraining-eligibility
 */
const checkRetrainingEligibility = async (req, res, next) => {
  try {
    const config = await retrainingService.getRetrainingConfig();
    const eligibility = await modelTrainingService.checkRetrainingEligibility({
      minNewVerifications: config.minNewVerifications,
      minNewFeedback: config.minNewFeedback,
      intervalDays: config.minDaysSinceTraining,
    });
    return sendSuccess(res, 200, eligibility);
  } catch (error) {
    next(error);
  }
};

/**
 * Get active model info
 * @route GET /api/v1/admin/model/active
 */
const getActiveModel = async (req, res, next) => {
  try {
    const modelInfo = await aiService.getAiModelInfo();
    return sendSuccess(res, 200, modelInfo);
  } catch (error) {
    next(error);
  }
};

/**
 * Validate historical complaints data quality
 * @route GET /api/v1/admin/model/validate-data
 */
const validateHistoricalData = async (req, res, next) => {
  try {
    const { DataValidationService } = require('../services/dataValidationService');
    const validationService = new DataValidationService();
    const report = await validationService.validateHistoricalComplaints({
      checkDuplicates: req.query.checkDuplicates !== 'false',
      checkBounds: req.query.checkBounds !== 'false',
      checkTemporalGaps: req.query.checkTemporalGaps !== 'false',
    });
    return sendSuccess(res, 200, report);
  } catch (error) {
    next(error);
  }
};

// ====================================================
// PREDICTION SCHEDULER CONTROLLER ACTIONS
// ====================================================

/**
 * Get prediction scheduler status
 * @route GET /api/v1/admin/prediction-scheduler/status
 */
const getPredictionSchedulerStatus = async (req, res, next) => {
  try {
    const status = await predictionSchedulerService.getSchedulerStatus();
    return sendSuccess(res, 200, status);
  } catch (error) {
    next(error);
  }
};

/**
 * Get prediction scheduler configuration
 * @route GET /api/v1/admin/prediction-scheduler/config
 */
const getPredictionSchedulerConfig = async (req, res, next) => {
  try {
    const config = await predictionSchedulerService.getSchedulerConfig();
    return sendSuccess(res, 200, config);
  } catch (error) {
    next(error);
  }
};

/**
 * Update prediction scheduler configuration
 * @route PATCH /api/v1/admin/prediction-scheduler/config
 */
const updatePredictionSchedulerConfig = async (req, res, next) => {
  try {
    const config = await predictionSchedulerService.updateSchedulerConfig(req.body);
    return sendSuccess(res, 200, { message: 'Prediction scheduler configuration updated', config });
  } catch (error) {
    next(error);
  }
};

/**
 * Manually trigger prediction cycle
 * @route POST /api/v1/admin/prediction-scheduler/trigger
 */
const triggerPredictionCycleManual = async (req, res, next) => {
  try {
    if (predictionSchedulerService.isRunning) {
      return sendSuccess(res, 409, { message: 'Prediction cycle already in progress' });
    }

    const areas = req.body.areas || [];
    const result = await predictionSchedulerService.triggerPredictionCycle(areas, 'manual');

    return sendSuccess(res, 202, {
      message: 'Prediction cycle triggered',
      cycleId: result.cycleId,
      predictionsCreated: result.predictionsCreated,
      source: result.source,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get verification selection configuration
 * @route GET /api/v1/admin/verification-selection/config
 */
const getVerificationSelectionConfig = async (req, res, next) => {
  try {
    const config = await predictionSchedulerService.getVerificationSelectionConfig();
    return sendSuccess(res, 200, config);
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
