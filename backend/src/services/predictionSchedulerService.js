const mongoose = require('mongoose');
const { PredictionCycle, CYCLE_STATUS } = require('../models/PredictionCycle');
const { SystemSetting } = require('../models/SystemSetting');
const aiService = require('./aiService');
const { ModelTrainingRun } = require('../models/ModelTrainingRun');
const { HistoricalComplaint } = require('../models/HistoricalComplaint');

class PredictionSchedulerService {
  constructor() {
    this.scheduledJob = null;
    this.isRunning = false;
  }

  async initializeScheduler() {
    console.log('[PredictionScheduler] Initializing prediction scheduler...');

    const config = await this.getSchedulerConfig();

    if (!config.enabled) {
      console.log('[PredictionScheduler] Prediction scheduler disabled via config');
      return;
    }

    if (this.scheduledJob) {
      clearInterval(this.scheduledJob);
    }

    const intervalMs = this._parseInterval(config.interval);
    console.log(`[PredictionScheduler] Scheduling prediction cycle every ${config.interval} (${intervalMs}ms)`);

    this.scheduledJob = setInterval(async () => {
      await this.checkAndTriggerPredictionCycle(config);
    }, intervalMs);

    this.scheduledJob.unref();
    console.log('[PredictionScheduler] Scheduler started');
  }

  _parseInterval(interval) {
    if (!interval) return 7 * 24 * 60 * 60 * 1000;

    const normalized = typeof interval === 'string' ? interval.trim().toLowerCase() : '';
    if (normalized === 'weekly' || normalized === '1 week' || normalized === '7 days') {
      return 7 * 24 * 60 * 60 * 1000;
    }
    if (normalized === 'daily' || normalized === '1 day' || normalized === '24 hours') {
      return 24 * 60 * 60 * 1000;
    }

    const match = normalized.match(/^(\d+)\s*(minutes?|hours?|days?|weeks?)$/i);
    if (!match) return 7 * 24 * 60 * 60 * 1000;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'minute':
      case 'minutes':
        return value * 60 * 1000;
      case 'hour':
      case 'hours':
        return value * 60 * 60 * 1000;
      case 'day':
      case 'days':
        return value * 24 * 60 * 60 * 1000;
      case 'week':
      case 'weeks':
        return value * 7 * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  async getSchedulerConfig() {
    try {
      const settings = await SystemSetting.findOne({ key: 'predictionSchedulerConfig' });
      if (settings && settings.value) {
        return {
          enabled: settings.value.enabled ?? false,
          interval: settings.value.interval ?? 'weekly',
          areas: settings.value.areas ?? [],
        };
      }
    } catch (e) {
      console.log('[PredictionScheduler] No config found, using defaults');
    }

    return {
      enabled: process.env.PREDICTION_SCHEDULER_ENABLED === 'true',
      interval: process.env.PREDICTION_SCHEDULER_INTERVAL || 'weekly',
      areas: [],
    };
  }

  async updateSchedulerConfig(config) {
    await SystemSetting.findOneAndUpdate(
      { key: 'predictionSchedulerConfig' },
      { key: 'predictionSchedulerConfig', value: config },
      { upsert: true, new: true }
    );

    if (this.scheduledJob) {
      await this.initializeScheduler();
    }

    return config;
  }

  async checkAndTriggerPredictionCycle(config) {
    if (this.isRunning) {
      console.log('[PredictionScheduler] Prediction cycle already in progress, skipping');
      return { skipped: true, reason: 'already_running' };
    }

    const runningCycle = await PredictionCycle.findOne({ status: CYCLE_STATUS.RUNNING });
    if (runningCycle) {
      console.log('[PredictionScheduler] Previous prediction cycle still running, skipping');
      return { skipped: true, reason: 'cycle_running', cycleId: runningCycle.cycleId };
    }

    console.log('[PredictionScheduler] Triggering scheduled prediction cycle...');
    return this.triggerPredictionCycle(config.areas || [], 'scheduled');
  }

  async triggerPredictionCycle(areas = [], source = 'manual') {
    if (this.isRunning) {
      throw new Error('Prediction cycle already in progress');
    }

    const runningCycle = await PredictionCycle.findOne({ status: CYCLE_STATUS.RUNNING });
    if (runningCycle) {
      throw new Error(`Prediction cycle ${runningCycle.cycleId} is already running`);
    }

    this.isRunning = true;

    try {
      console.log(`[PredictionScheduler] Starting ${source} prediction cycle...`);

      // Get active model version dynamically
      const modelVersion = await this.getActiveModelVersion();

      // Get prediction areas - use provided areas or derive dynamically
      const cycleAreas = areas.length > 0 ? areas : await this.getDynamicPredictionAreas();

      const result = await aiService.ingestPredictionCycle({
        areas: cycleAreas,
        modelVersion,
      });

      console.log(`[PredictionScheduler] Prediction cycle completed: ${result.cycle.cycleId}`);
      console.log(`[PredictionScheduler] Predictions created: ${result.predictions.length}`);

      // Automatically trigger verification candidate selection
      await this.triggerAutomaticVerificationSelection(result.cycle.cycleId);

      return {
        triggered: true,
        cycleId: result.cycle.cycleId,
        predictionsCreated: result.predictions.length,
        source,
      };
    } catch (error) {
      console.error('[PredictionScheduler] Prediction cycle failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  async triggerAutomaticVerificationSelection(cycleId) {
    try {
      console.log(`[PredictionScheduler] Triggering automatic verification candidate selection for cycle ${cycleId}`);

      const { selectVerificationCandidates } = require('./verificationSelectionService');

      // Get budget config
      const config = await this.getVerificationSelectionConfig();

      const result = await selectVerificationCandidates(cycleId, config.budgetPct);
      console.log(`[PredictionScheduler] Verification candidates selected: ${result.totalSelected} (${result.exploitationSelected} exploitation, ${result.explorationSelected} exploration)`);

      // Automatically trigger officer assignment
      await this.triggerAutomaticOfficerAssignment(cycleId);

      return result;
    } catch (error) {
      console.error('[PredictionScheduler] Automatic verification selection failed:', error);
      // Don't throw - let the cycle complete even if selection fails
      return { error: error.message };
    }
  }

  async getVerificationSelectionConfig() {
    try {
      const settings = await SystemSetting.findOne({ key: 'verificationSelectionConfig' });
      if (settings && settings.value) {
        return {
          budgetPct: settings.value.budgetPct ?? 0.05,
          exploitationFraction: settings.value.exploitationFraction ?? 0.90,
        };
      }
    } catch (e) {
      console.log('[PredictionScheduler] No verification selection config found, using defaults');
    }

    return {
      budgetPct: process.env.VERIFICATION_BUDGET_PCT || 0.05,
      exploitationFraction: process.env.EXPLOITATION_FRACTION || 0.90,
    };
  }

  async triggerAutomaticOfficerAssignment(cycleId) {
    try {
      console.log(`[PredictionScheduler] Triggering automatic officer assignment for cycle ${cycleId}`);

      const { autoAssignCandidates } = require('./autoAssignmentService');

      const result = await autoAssignCandidates(cycleId);
      console.log(`[PredictionScheduler] Officer assignment completed: ${result.assignedCount}/${result.totalCandidates} assigned, ${result.officersUsed} officers used`);

      return result;
    } catch (error) {
      console.error('[PredictionScheduler] Automatic officer assignment failed:', error);
      // Don't throw - let the process continue
      return { error: error.message };
    }
  }

  async getSchedulerStatus() {
    const config = await this.getSchedulerConfig();
    const runningCycle = await PredictionCycle.findOne({ status: CYCLE_STATUS.RUNNING });
    const recentCycles = await PredictionCycle.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return {
      schedulerEnabled: config.enabled,
      schedulerInterval: config.interval,
      isRunning: this.isRunning,
      runningCycle: runningCycle ? {
        cycleId: runningCycle.cycleId,
        status: runningCycle.status,
        startedAt: runningCycle.startDate,
      } : null,
      recentCycles: recentCycles.map(c => ({
        cycleId: c.cycleId,
        status: c.status,
        predictionCount: c.predictionCount,
        createdAt: c.createdAt,
        completedAt: c.completedAt,
      })),
    };
  }

  stopScheduler() {
    if (this.scheduledJob) {
      clearInterval(this.scheduledJob);
      this.scheduledJob = null;
      console.log('[PredictionScheduler] Scheduler stopped');
    }
  }

  /**
   * Get the active model version from ModelTrainingRun
   * This replaces hardcoded model version strings
   */
  async getActiveModelVersion() {
    try {
      const activeModel = await ModelTrainingRun.findOne({ isActive: true });
      if (activeModel && activeModel.modelVersion) {
        console.log(`[PredictionScheduler] Using active model version: ${activeModel.modelVersion}`);
        return activeModel.modelVersion;
      }
    } catch (error) {
      console.error('[PredictionScheduler] Failed to get active model version:', error.message);
    }
    // Fallback to environment variable or default
    return process.env.AI_MODEL_VERSION || 'xgb-test-v1';
  }

  /**
   * Get dynamic prediction areas from MongoDB
   * Returns all community area / complaint type combinations that have historical data
   * Falls back to all 77 community areas × 10 complaint types if no historical data
   */
  async getDynamicPredictionAreas() {
    try {
      // Get distinct community areas and complaint types from historical data
      const historicalAreas = await HistoricalComplaint.aggregate([
        { $match: { complaintType: { $in: await this.getTargetComplaintTypes() } } },
        {
          $group: {
            _id: { communityArea: '$communityArea', complaintType: '$complaintType' },
            count: { $sum: 1 }
          }
        },
        { $match: { count: { $gt: 0 } } },
        {
          $project: {
            _id: 0,
            communityArea: '$_id.communityArea',
            complaintType: '$_id.complaintType'
          }
        }
      ]);

      if (historicalAreas.length > 0) {
        // Add ward mapping
        const { WARD_MAPPING } = require('./featureEngineeringService');
        const { _getDepartmentForSrType } = require('./mongoPredictionService');
        
        const areas = historicalAreas.map(h => ({
          communityArea: h.communityArea.toString(),
          ward: `Ward ${WARD_MAPPING[parseInt(h.communityArea)] || 1}`,
          department: _getDepartmentForSrType(h.complaintType),
          complaintType: h.complaintType
        }));
        console.log(`[PredictionScheduler] Using ${areas.length} dynamic prediction areas from historical data`);
        return areas;
      }
    } catch (error) {
      console.error('[PredictionScheduler] Failed to get dynamic prediction areas:', error.message);
    }

    // Fallback: all 77 community areas × 10 complaint types
    console.log('[PredictionScheduler] Falling back to all 77 community areas × 10 complaint types');
    return this.getAllCommunityAreaCombinations();
  }

  /**
   * Get all 77 community areas × 10 complaint types combinations
   * Used as fallback when no historical data is available
   */
  getAllCommunityAreaCombinations() {
    const { TARGET_COMPLAINT_TYPES, WARD_MAPPING } = require('./featureEngineeringService');
    const { _getDepartmentForSrType } = require('./mongoPredictionService');
    
    const areas = [];
    for (let ca = 1; ca <= 77; ca++) {
      for (const srType of TARGET_COMPLAINT_TYPES) {
        areas.push({
          communityArea: ca.toString(),
          ward: `Ward ${WARD_MAPPING[ca] || 1}`,
          department: _getDepartmentForSrType(srType),
          complaintType: srType
        });
      }
    }
    return areas;
  }

  /**
   * Get target complaint types from feature engineering service
   */
  async getTargetComplaintTypes() {
    const { TARGET_COMPLAINT_TYPES } = require('./featureEngineeringService');
    return TARGET_COMPLAINT_TYPES;
  }
}

module.exports = {
  PredictionSchedulerService,
};