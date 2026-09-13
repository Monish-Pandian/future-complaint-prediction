const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { ModelTrainingRun, TRAINING_STATUS } = require('../models/ModelTrainingRun');
const { VALID_FEATURES, FORBIDDEN_COLUMNS, TARGET_COMPLAINT_TYPES } = require('./featureEngineeringService');
const { DataValidationService } = require('./dataValidationService');
const ApiError = require('../utils/apiError');

const MODEL_DIR = path.join(__dirname, '..', '..', 'ai_service', 'data', 'models');
const PROCESSED_DIR = path.join(__dirname, '..', '..', 'ai_service', 'data', 'processed');
const FEATURE_ENGINEERING_SCRIPT = path.join(__dirname, '..', '..', 'ai_service', 'feature_engineering_mongodb.py');

class ModelTrainingService {
  constructor() {
    this.dataValidation = new DataValidationService();
    this.activeTrainingJob = null;
  }

  async trainModel(options = {}) {
    const {
      modelVersion = `xgb-${Date.now()}`,
      triggerSource = 'manual',
      forceRetrain = false,
    } = options;

    console.log(`[ModelTraining] Starting training for model version: ${modelVersion}`);

    if (this.activeTrainingJob && !forceRetrain) {
      throw new ApiError(409, 'Training job already in progress');
    }

    const existingRun = await ModelTrainingRun.findOne({ modelVersion });
    if (existingRun && existingRun.status !== TRAINING_STATUS.FAILED && existingRun.status !== TRAINING_STATUS.REJECTED) {
      throw new ApiError(409, `Model version ${modelVersion} already exists with status ${existingRun.status}`);
    }

    let trainingRun = await ModelTrainingRun.findOne({ modelVersion });
    if (!trainingRun) {
      trainingRun = await ModelTrainingRun.create({
        modelVersion,
        status: TRAINING_STATUS.QUEUED,
        triggerSource,
        featureVersion: 'v1',
      });
    } else {
      trainingRun.status = TRAINING_STATUS.QUEUED;
      trainingRun.triggerSource = triggerSource;
      await trainingRun.save();
    }

    this.activeTrainingJob = trainingRun._id.toString();

    try {
      await this._executeTraining(trainingRun);
      return trainingRun;
    } finally {
      this.activeTrainingJob = null;
    }
  }

  async _executeTraining(trainingRun) {
    const startTime = Date.now();
    const timing = {};

    try {
      console.log('[ModelTraining] Step 1: Data validation');
      trainingRun.status = TRAINING_STATUS.RUNNING;
      trainingRun.trainingStartedAt = new Date();
      await trainingRun.save();

      const validationReport = await this.dataValidation.validateHistoricalComplaints({
        checkDuplicates: true,
        checkBounds: true,
        checkTemporalGaps: true,
      });

      trainingRun.dataQualityReport = validationReport;
      await trainingRun.save();

      if (!validationReport.passed) {
        throw new Error(`Data validation failed: ${validationReport.criticalFailures.join('; ')}`);
      }

      console.log('[ModelTraining] Step 2: Feature engineering via Python (optimized)');
      const featureEngStart = Date.now();
      
      const trainingRunId = trainingRun._id.toString();
      const featureOutputPath = path.join(PROCESSED_DIR, `features_${trainingRunId}.json`);
      const timingOutputPath = path.join(PROCESSED_DIR, `timing_${trainingRunId}.json`);
      
      const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civic_forecasting';
      const dbName = 'civic_forecasting';
      
      await this._runFeatureEngineering(trainingRun, mongoUri, dbName, featureOutputPath, timingOutputPath);
      
      timing.feature_engineering = (Date.now() - featureEngStart) / 1000;
      console.log(`[Timing] Feature engineering: ${timing.feature_engineering.toFixed(2)}s`);

      // Load timing data from Python script
      if (fs.existsSync(timingOutputPath)) {
        const pythonTiming = JSON.parse(fs.readFileSync(timingOutputPath, 'utf8'));
        trainingRun.featureEngineeringMetadata = {
          ...trainingRun.featureEngineeringMetadata,
          timing: pythonTiming,
        };
      }

      console.log('[ModelTraining] Step 3: Loading prepared training data');
      const featureData = JSON.parse(fs.readFileSync(featureOutputPath, 'utf8'));
      
      const splits = featureData.splits;
      trainingRun.trainingStartDate = new Date(splits.train.start);
      trainingRun.trainingEndDate = new Date(splits.train.end);
      trainingRun.validationStartDate = new Date(splits.validation.start);
      trainingRun.validationEndDate = new Date(splits.validation.end);
      trainingRun.testStartDate = new Date(splits.test.start);
      trainingRun.testEndDate = new Date(splits.test.end);

      const X_train = featureData.train.X;
      const y_train = featureData.train.y;
      const X_val = featureData.validation.X;
      const y_val = featureData.validation.y;
      const X_test = featureData.test.X;
      const y_test = featureData.test.y;

      trainingRun.trainingRecordCount = X_train.length;
      trainingRun.validationRecordCount = X_val.length;
      trainingRun.testRecordCount = X_test.length;
      await trainingRun.save();

      console.log(`[ModelTraining] Split sizes - Train: ${X_train.length}, Val: ${X_val.length}, Test: ${X_test.length}`);

      console.log('[ModelTraining] Step 4: Saving training data for Python script');
      await this._saveTrainingData(X_train, y_train, X_val, y_val, X_test, y_test, trainingRun);

      console.log('[ModelTraining] Step 5: Running XGBoost training via Python');
      const trainingStart = Date.now();
      await this._runPythonTraining(trainingRun);
      timing.xgboost_training = (Date.now() - trainingStart) / 1000;
      console.log(`[Timing] XGBoost training: ${timing.xgboost_training.toFixed(2)}s`);

      console.log('[ModelTraining] Step 8: Validating model');
      trainingRun.status = TRAINING_STATUS.VALIDATING;
      await trainingRun.save();

      const valMetrics = await this._evaluateModel(trainingRun, X_val, y_val, 'validation');
      trainingRun.validationMetrics = valMetrics;
      await trainingRun.save();

      console.log('[ModelTraining] Step 9: Final test evaluation');
      trainingRun.status = TRAINING_STATUS.TESTING;
      await trainingRun.save();

      const testMetrics = await this._evaluateModel(trainingRun, X_test, y_test, 'test');
      trainingRun.testMetrics = testMetrics;
      await trainingRun.save();

      console.log('[ModelTraining] Step 10: Checking activation criteria');
      const shouldActivate = this._checkActivationCriteria(valMetrics, testMetrics, trainingRun);

      console.log('[ModelTraining] Step 11: Comparing with active model');
      const comparison = await this._compareWithActiveModel(valMetrics, testMetrics, trainingRun);

      const shouldActivateFinal = shouldActivate && comparison.overall.candidatePreferred;

      if (shouldActivateFinal) {
        await this._activateModel(trainingRun);
        trainingRun.status = TRAINING_STATUS.ACTIVATED;
        trainingRun.activatedAt = new Date();
      } else {
        trainingRun.status = TRAINING_STATUS.REJECTED;
        trainingRun.errorMessage = shouldActivate
          ? 'Model did not outperform active model'
          : 'Model did not meet activation criteria';
      }

      trainingRun.trainingCompletedAt = new Date();
      trainingRun.trainingMetrics = await this._evaluateModel(trainingRun, X_train, y_train, 'training');
      await trainingRun.save();

      console.log(`[ModelTraining] Training completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
      console.log(`[ModelTraining] Status: ${trainingRun.status}`);

      return trainingRun;
    } catch (error) {
      console.error('[ModelTraining] Training failed:', error);
      trainingRun.status = TRAINING_STATUS.FAILED;
      trainingRun.errorMessage = error.message;
      trainingRun.trainingCompletedAt = new Date();
      await trainingRun.save();
      throw error;
    }
  }

  async _saveTrainingData(X_train, y_train, X_val, y_val, X_test, y_test, trainingRun) {
    if (!fs.existsSync(PROCESSED_DIR)) {
      fs.mkdirSync(PROCESSED_DIR, { recursive: true });
    }

    const trainingRunId = trainingRun._id.toString();
    const trainPath = path.join(PROCESSED_DIR, `train_${trainingRunId}.json`);
    const valPath = path.join(PROCESSED_DIR, `val_${trainingRunId}.json`);
    const testPath = path.join(PROCESSED_DIR, `test_${trainingRunId}.json`);

    fs.writeFileSync(trainPath, JSON.stringify({ X: X_train, y: y_train }));
    fs.writeFileSync(valPath, JSON.stringify({ X: X_val, y: y_val }));
    fs.writeFileSync(testPath, JSON.stringify({ X: X_test, y: y_test }));

    trainingRun.featureEngineeringMetadata = {
      trainDataPath: trainPath,
      valDataPath: valPath,
      testDataPath: testPath,
      featureCount: VALID_FEATURES.length,
      features: VALID_FEATURES,
    };
    await trainingRun.save();
  }

  async _runFeatureEngineering(trainingRun, mongoUri, dbName, outputPath, timingOutputPath) {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', [
        FEATURE_ENGINEERING_SCRIPT,
        '--mongo-uri', mongoUri,
        '--db-name', dbName,
        '--output-path', outputPath,
        '--timing-output', timingOutputPath,
      ], {
        cwd: path.join(__dirname, '..', '..', 'ai_service'),
        stdio: 'pipe',
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log(`[FeatureEngineering] ${data.toString().trim()}`);
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error(`[FeatureEngineering] ${data.toString().trim()}`);
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Feature engineering failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  async _runPythonTraining(trainingRun) {
    const trainingRunId = trainingRun._id.toString();
    const scriptPath = path.join(__dirname, '..', '..', 'ai_service', 'train_from_mongodb.py');

    if (!fs.existsSync(scriptPath)) {
      await this._createPythonTrainingScript(scriptPath);
    }

    const modelPath = path.join(MODEL_DIR, `${trainingRun.modelVersion}_model.pkl`);
    const preprocessorPath = path.join(MODEL_DIR, `${trainingRun.modelVersion}_preprocessor.pkl`);

    if (!fs.existsSync(MODEL_DIR)) {
      fs.mkdirSync(MODEL_DIR, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', [
        scriptPath,
        '--train-path', path.join(PROCESSED_DIR, `train_${trainingRunId}.json`),
        '--val-path', path.join(PROCESSED_DIR, `val_${trainingRunId}.json`),
        '--model-path', modelPath,
        '--preprocessor-path', preprocessorPath,
        '--model-version', trainingRun.modelVersion,
      ], {
        cwd: path.join(__dirname, '..', '..', 'ai_service'),
        stdio: 'pipe',
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log(`[PythonTraining] ${data.toString().trim()}`);
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error(`[PythonTraining] ${data.toString().trim()}`);
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          trainingRun.modelFilePath = modelPath;
          trainingRun.preprocessorFilePath = preprocessorPath;
          resolve();
        } else {
          reject(new Error(`Python training failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  async _createPythonTrainingScript(scriptPath) {
    const scriptContent = `
import json
import joblib
import pandas as pd
import numpy as np
import argparse
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

def load_data(path):
    with open(path, 'r') as f:
        data = json.load(f)
    return pd.DataFrame(data['X']), np.array(data['y'])

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--train-path', required=True)
    parser.add_argument('--val-path', required=True)
    parser.add_argument('--model-path', required=True)
    parser.add_argument('--preprocessor-path', required=True)
    parser.add_argument('--model-version', required=True)
    args = parser.parse_args()

    print(f"Loading training data from {args.train_path}")
    X_train, y_train = load_data(args.train_path)
    print(f"Training data shape: {X_train.shape}")

    print(f"Loading validation data from {args.val_path}")
    X_val, y_val = load_data(args.val_path)
    print(f"Validation data shape: {X_val.shape}")

    # Drop datetime columns that can't be used as features
    datetime_cols = ['week_start', 'week_end', 'year_week']
    X_train = X_train.drop(columns=[c for c in datetime_cols if c in X_train.columns])
    X_val = X_val.drop(columns=[c for c in datetime_cols if c in X_val.columns])

    # Identify categorical and numerical columns
    categorical_cols = ['sr_type', 'season']
    numerical_cols = [c for c in X_train.columns if c not in categorical_cols]

    # Preprocessor
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numerical_cols),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_cols),
        ],
        remainder='drop'
    )

    # Model
    model = XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        eval_metric='logloss',
        n_jobs=-1
    )

    # Pipeline
    pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', model)
    ])

    print("Training model...")
    pipeline.fit(X_train, y_train)

    print("Evaluating on validation set...")
    y_pred = pipeline.predict(X_val)
    y_pred_proba = pipeline.predict_proba(X_val)[:, 1]

    metrics = {
        'accuracy': float(accuracy_score(y_val, y_pred)),
        'precision': float(precision_score(y_val, y_pred, zero_division=0)),
        'recall': float(recall_score(y_val, y_pred, zero_division=0)),
        'f1': float(f1_score(y_val, y_pred, zero_division=0)),
        'roc_auc': float(roc_auc_score(y_val, y_pred_proba)),
    }

    print(f"Validation metrics: {metrics}")

    # Save model and preprocessor
    joblib.dump(pipeline, args.model_path)
    joblib.dump(preprocessor, args.preprocessor_path)
    print(f"Model saved to {args.model_path}")
    print(f"Preprocessor saved to {args.preprocessor_path}")

    # Save metrics
    metrics_path = args.model_path.replace('_model.pkl', '_metrics.json')
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)

if __name__ == '__main__':
    main()
`;

    fs.writeFileSync(scriptPath, scriptContent);
    console.log(`[ModelTraining] Created Python training script at ${scriptPath}`);
  }

  async _evaluateModel(trainingRun, X, y, splitName) {
    const trainingRunId = trainingRun._id.toString();
    const scriptPath = path.join(__dirname, '..', '..', 'ai_service', 'evaluate_model.py');
    const modelPath = trainingRun.modelFilePath || path.join(MODEL_DIR, `${trainingRun.modelVersion}_model.pkl`);

    if (!fs.existsSync(scriptPath)) {
      await this._createEvaluationScript(scriptPath);
    }

    const dataPath = path.join(PROCESSED_DIR, `eval_${trainingRunId}_${splitName}.json`);
    fs.writeFileSync(dataPath, JSON.stringify({ X, y }));

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', [
        scriptPath,
        '--model-path', modelPath,
        '--data-path', dataPath,
      ], {
        cwd: path.join(__dirname, '..', '..', 'ai_service'),
        stdio: 'pipe',
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const metrics = JSON.parse(stdout.trim().split('\n').pop());
            resolve(metrics);
          } catch (e) {
            reject(new Error(`Failed to parse metrics: ${stdout}`));
          }
        } else {
          reject(new Error(`Evaluation failed: ${stderr}`));
        }
      });
    });
  }

  async _createEvaluationScript(scriptPath) {
    const scriptContent = `
import json
import joblib
import numpy as np
import argparse
import pandas as pd
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model-path', required=True)
    parser.add_argument('--data-path', required=True)
    args = parser.parse_args()

    with open(args.data_path, 'r') as f:
        data = json.load(f)

    X = pd.DataFrame(data['X'])
    y = np.array(data['y'])

    # Drop datetime columns that can't be used as features
    datetime_cols = ['week_start', 'week_end', 'year_week']
    X = X.drop(columns=[c for c in datetime_cols if c in X.columns])

    pipeline = joblib.load(args.model_path)
    y_pred = pipeline.predict(X)
    y_pred_proba = pipeline.predict_proba(X)[:, 1]

    metrics = {
        'accuracy': float(accuracy_score(y, y_pred)),
        'precision': float(precision_score(y, y_pred, zero_division=0)),
        'recall': float(recall_score(y, y_pred, zero_division=0)),
        'f1': float(f1_score(y, y_pred, zero_division=0)),
        'roc_auc': float(roc_auc_score(y, y_pred_proba)),
    }

    print(json.dumps(metrics))

if __name__ == '__main__':
    main()
`;

    fs.writeFileSync(scriptPath, scriptContent);
    console.log(`[ModelTraining] Created evaluation script at ${scriptPath}`);
  }

  _checkActivationCriteria(valMetrics, testMetrics, trainingRun) {
    const MIN_F1 = 0.3;
    const MIN_ROC_AUC = 0.55;
    const MIN_PRECISION = 0.25;
    const MIN_RECALL = 0.3;

    const checks = {
      valF1: valMetrics.f1 >= MIN_F1,
      valRocAuc: valMetrics.roc_auc >= MIN_ROC_AUC,
      valPrecision: valMetrics.precision >= MIN_PRECISION,
      valRecall: valMetrics.recall >= MIN_RECALL,
      testF1: testMetrics.f1 >= MIN_F1,
      testRocAuc: testMetrics.roc_auc >= MIN_ROC_AUC,
    };

    trainingRun.trainingMetrics = {
      ...trainingRun.trainingMetrics,
      activationChecks: checks,
      thresholds: { MIN_F1, MIN_ROC_AUC, MIN_PRECISION, MIN_RECALL },
    };

    const passed = Object.values(checks).every(v => v);
    console.log('[ModelTraining] Activation checks:', checks);
    console.log(`[ModelTraining] Activation: ${passed ? 'PASSED' : 'FAILED'}`);

    return passed;
  }

  async _compareWithActiveModel(valMetrics, testMetrics, trainingRun) {
    const activeModel = await this.getActiveModel();
    if (!activeModel) {
      console.log('[ModelTraining] No active model to compare with');
      return { better: true, reason: 'No active model exists' };
    }

    const activeValMetrics = activeModel.validationMetrics || {};
    const activeTestMetrics = activeModel.testMetrics || {};

    const comparison = {
      candidate: {
        validation: valMetrics,
        test: testMetrics,
      },
      active: {
        validation: activeValMetrics,
        test: activeTestMetrics,
      },
      improvements: {},
      regressions: {},
    };

    const metricsToCompare = ['accuracy', 'precision', 'recall', 'f1', 'roc_auc'];

    for (const metric of metricsToCompare) {
      const candidateVal = valMetrics[metric] || 0;
      const activeVal = activeValMetrics[metric] || 0;
      const candidateTest = testMetrics[metric] || 0;
      const activeTest = activeTestMetrics[metric] || 0;

      const valDiff = candidateVal - activeVal;
      const testDiff = candidateTest - activeTest;

      comparison.improvements[metric] = {
        validation: valDiff > 0.01,
        test: testDiff > 0.01,
        valDiff: Number(valDiff.toFixed(4)),
        testDiff: Number(testDiff.toFixed(4)),
      };

      comparison.regressions[metric] = {
        validation: valDiff < -0.01,
        test: testDiff < -0.01,
        valDiff: Number(valDiff.toFixed(4)),
        testDiff: Number(testDiff.toFixed(4)),
      };
    }

    const valBetter = Object.values(comparison.improvements).some(m => m.validation);
    const testBetter = Object.values(comparison.improvements).some(m => m.test);
    const valWorse = Object.values(comparison.regressions).some(m => m.validation);
    const testWorse = Object.values(comparison.regressions).some(m => m.test);

    comparison.overall = {
      validationBetter: valBetter,
      testBetter: testBetter,
      validationWorse: valWorse,
      testWorse: testWorse,
      candidatePreferred: (valBetter || testBetter) && !(valWorse || testWorse),
    };

    trainingRun.trainingMetrics = {
      ...trainingRun.trainingMetrics,
      modelComparison: comparison,
    };

    console.log('[ModelTraining] Model comparison:', JSON.stringify(comparison.overall, null, 2));

    return comparison;
  }

  async _activateModel(trainingRun) {
    console.log('[ModelTraining] Activating new model...');

    await ModelTrainingRun.updateMany(
      { isActive: true, _id: { $ne: trainingRun._id } },
      { $set: { isActive: false, status: TRAINING_STATUS.REJECTED } }
    );

    trainingRun.isActive = true;
    trainingRun.status = TRAINING_STATUS.ACTIVATED;
    trainingRun.activatedAt = new Date();
    await trainingRun.save();

    const modelPath = path.join(MODEL_DIR, 'xgboost_model.pkl');
    const preprocessorPath = path.join(MODEL_DIR, 'preprocessor.pkl');
    const activeModelPath = trainingRun.modelFilePath;
    const activePreprocessorPath = trainingRun.preprocessorFilePath;

    if (fs.existsSync(activeModelPath)) {
      fs.copyFileSync(activeModelPath, modelPath);
    }
    if (fs.existsSync(activePreprocessorPath)) {
      fs.copyFileSync(activePreprocessorPath, preprocessorPath);
    }

    const finalDatasetPath = path.join(PROCESSED_DIR, 'final_research_dataset.csv');
    await this._exportFinalDataset(trainingRun, finalDatasetPath);

    console.log('[ModelTraining] Model activated successfully');
  }

  async _exportFinalDataset(trainingRun, outputPath) {
    const trainingRunId = trainingRun._id.toString();
    const featureOutputPath = path.join(PROCESSED_DIR, `features_${trainingRunId}.json`);
    
    if (!fs.existsSync(featureOutputPath)) {
      console.log('[ModelTraining] Feature data not found, skipping final dataset export');
      return;
    }
    
    const featureData = JSON.parse(fs.readFileSync(featureOutputPath, 'utf8'));
    const allData = [
      ...featureData.train.X.map((x, i) => ({ ...x, future_complaint: featureData.train.y[i] })),
      ...featureData.validation.X.map((x, i) => ({ ...x, future_complaint: featureData.validation.y[i] })),
      ...featureData.test.X.map((x, i) => ({ ...x, future_complaint: featureData.test.y[i] })),
    ];
    
    const df = allData.filter(row => row.future_complaint !== undefined && !isNaN(row.future_complaint));

    const csvRows = [];
    if (df.length > 0) {
      const headers = Object.keys(df[0]);
      csvRows.push(headers.join(','));
      for (const row of df) {
        csvRows.push(headers.map(h => {
          const val = row[h];
          if (val === undefined || val === null) return '';
          if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
          return val;
        }).join(','));
      }
    }

    fs.writeFileSync(outputPath, csvRows.join('\n'));
    console.log(`[ModelTraining] Exported final dataset to ${outputPath} (${df.length} rows)`);
  }

  async getActiveModel() {
    return ModelTrainingRun.findOne({ isActive: true });
  }

  async getTrainingHistory() {
    return ModelTrainingRun.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
  }

  async getTrainingRun(modelVersion) {
    return ModelTrainingRun.findOne({ modelVersion }).lean();
  }

  async checkRetrainingEligibility(config = {}) {
    const {
      minNewVerifications = 100,
      minNewFeedback = 50,
      intervalDays = 30,
    } = config;

    const activeModel = await this.getActiveModel();
    if (!activeModel) {
      return { eligible: true, reason: 'No active model exists', shouldRetrain: true };
    }

    const { Feedback } = require('../models/Feedback');
    const { Verification } = require('../models/Verification');

    const sinceLastTraining = activeModel.activatedAt || activeModel.updatedAt;
    const daysSinceTraining = (Date.now() - new Date(sinceLastTraining).getTime()) / (1000 * 60 * 60 * 24);

    const newVerifications = await Verification.countDocuments({
      verifiedAt: { $gt: sinceLastTraining },
    });

    const newFeedback = await Feedback.countDocuments({
      createdAt: { $gt: sinceLastTraining },
    });

    const eligible = (
      daysSinceTraining >= intervalDays ||
      newVerifications >= minNewVerifications ||
      newFeedback >= minNewFeedback
    );

    return {
      eligible,
      reason: eligible ? 'Threshold met' : 'Thresholds not met',
      shouldRetrain: eligible,
      daysSinceTraining: Math.floor(daysSinceTraining),
      newVerifications,
      newFeedback,
      thresholds: { minNewVerifications, minNewFeedback, intervalDays },
    };
  }

  isTrainingActive() {
    return this.activeTrainingJob !== null;
  }

  getActiveTrainingJobId() {
    return this.activeTrainingJob;
  }
}

module.exports = {
  ModelTrainingService,
  MODEL_DIR,
  PROCESSED_DIR,
};