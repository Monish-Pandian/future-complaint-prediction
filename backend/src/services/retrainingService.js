const mongoose = require('mongoose');
const { ModelTrainingRun, TRAINING_STATUS } = require('../models/ModelTrainingRun');
const { ModelTrainingService } = require('./modelTrainingService');
const { Verification } = require('../models/Verification');
const { Feedback } = require('../models/Feedback');
const { SystemSetting } = require('../models/SystemSetting');

class RetrainingService {
  constructor() {
    this.modelTrainingService = new ModelTrainingService();
    this.scheduledJob = null;
    this.isRunning = false;
  }

  async initializeScheduler() {
    console.log('[RetrainingService] Initializing retraining scheduler...');

    const config = await this.getRetrainingConfig();

    if (!config.enabled) {
      console.log('[RetrainingService] Retraining scheduler disabled via config');
      return;
    }

    if (this.scheduledJob) {
      clearInterval(this.scheduledJob);
    }

    const intervalMs = this._parseInterval(config.interval);
    console.log(`[RetrainingService] Scheduling retraining check every ${config.interval} (${intervalMs}ms)`);

    this.scheduledJob = setInterval(async () => {
      await this.checkAndTriggerRetraining(config);
    }, intervalMs);

    this.scheduledJob.unref();
    console.log('[RetrainingService] Scheduler started');
  }

  _parseInterval(interval) {
    const match = interval.match(/^(\d+)\s*(minutes?|hours?|days?|weeks?)$/i);
    if (!match) return 24 * 60 * 60 * 1000;

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
        return 24 * 60 * 60 * 1000;
    }
  }

  async getRetrainingConfig() {
    try {
      const settings = await SystemSetting.findOne({ key: 'retrainingConfig' });
      if (settings && settings.value) {
        return {
          enabled: settings.value.enabled ?? true,
          interval: settings.value.interval ?? 'daily',
          minNewVerifications: settings.value.minNewVerifications ?? 100,
          minNewFeedback: settings.value.minNewFeedback ?? 50,
          minDaysSinceTraining: settings.value.minDaysSinceTraining ?? 7,
        };
      }
    } catch (e) {
      console.log('[RetrainingService] No config found, using defaults');
    }

    return {
      enabled: process.env.MODEL_RETRAIN_ENABLED === 'true',
      interval: process.env.MODEL_RETRAIN_INTERVAL || 'daily',
      minNewVerifications: parseInt(process.env.MODEL_MIN_NEW_VERIFICATIONS || '100'),
      minNewFeedback: parseInt(process.env.MODEL_MIN_NEW_FEEDBACK || '50'),
      minDaysSinceTraining: parseInt(process.env.MODEL_MIN_DAYS_SINCE_TRAINING || '7'),
    };
  }

  async updateRetrainingConfig(config) {
    await SystemSetting.findOneAndUpdate(
      { key: 'retrainingConfig' },
      { key: 'retrainingConfig', value: config },
      { upsert: true, new: true }
    );

    if (this.scheduledJob) {
      await this.initializeScheduler();
    }

    return config;
  }

  async checkAndTriggerRetraining(config) {
    if (this.isRunning) {
      console.log('[RetrainingService] Retraining already in progress, skipping check');
      return { skipped: true, reason: 'already_running' };
    }

    if (this.modelTrainingService.isTrainingActive()) {
      console.log('[RetrainingService] Model training already active, skipping check');
      return { skipped: true, reason: 'training_active' };
    }

    const eligibility = await this.modelTrainingService.checkRetrainingEligibility({
      minNewVerifications: config.minNewVerifications,
      minNewFeedback: config.minNewFeedback,
      intervalDays: config.minDaysSinceTraining,
    });

    console.log('[RetrainingService] Retraining eligibility check:', eligibility);

    if (!eligibility.eligible) {
      return { triggered: false, reason: eligibility.reason, details: eligibility };
    }

    console.log('[RetrainingService] Thresholds met, triggering retraining...');
    return this.triggerRetraining('threshold', eligibility);
  }

  async triggerRetraining(source = 'manual', eligibility = {}) {
    if (this.isRunning) {
      throw new Error('Retraining already in progress');
    }

    if (this.modelTrainingService.isTrainingActive()) {
      throw new Error('Model training already active');
    }

    this.isRunning = true;

    try {
      const modelVersion = `xgb-${Date.now()}`;
      console.log(`[RetrainingService] Starting ${source} retraining: ${modelVersion}`);

      const trainingRun = await this.modelTrainingService.trainModel({
        modelVersion,
        triggerSource: source,
      });

      console.log(`[RetrainingService] Retraining completed with status: ${trainingRun.status}`);
      return {
        triggered: true,
        modelVersion,
        status: trainingRun.status,
        trainingRunId: trainingRun._id,
      };
    } catch (error) {
      console.error('[RetrainingService] Retraining failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  async getRetrainingStatus() {
    const config = await this.getRetrainingConfig();
    const activeModel = await ModelTrainingRun.findOne({ isActive: true });
    const recentRuns = await ModelTrainingRun.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const eligibility = await this.modelTrainingService.checkRetrainingEligibility({
      minNewVerifications: config.minNewVerifications,
      minNewFeedback: config.minNewFeedback,
      intervalDays: config.minDaysSinceTraining,
    });

    return {
      schedulerEnabled: config.enabled,
      schedulerInterval: config.interval,
      isRunning: this.isRunning,
      activeModel: activeModel ? {
        modelVersion: activeModel.modelVersion,
        status: activeModel.status,
        activatedAt: activeModel.activatedAt,
        trainingRecordCount: activeModel.trainingRecordCount,
      } : null,
      eligibility,
      recentRuns: recentRuns.map(r => ({
        modelVersion: r.modelVersion,
        status: r.status,
        triggerSource: r.triggerSource,
        createdAt: r.createdAt,
        activatedAt: r.activatedAt,
        trainingRecordCount: r.trainingRecordCount,
      })),
    };
  }

  stopScheduler() {
    if (this.scheduledJob) {
      clearInterval(this.scheduledJob);
      this.scheduledJob = null;
      console.log('[RetrainingService] Scheduler stopped');
    }
  }
}

module.exports = {
  RetrainingService,
};