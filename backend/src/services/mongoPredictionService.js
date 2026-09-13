const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { ModelTrainingRun } = require('../models/ModelTrainingRun');
const { HistoricalComplaint } = require('../models/HistoricalComplaint');
const { FeatureEngineeringService, VALID_FEATURES, FORBIDDEN_COLUMNS, TARGET_COMPLAINT_TYPES, WARD_MAPPING, SEASON_MAP } = require('./featureEngineeringService');
const { ModelTrainingService } = require('./modelTrainingService');
const ApiError = require('../utils/apiError');

const MODEL_DIR = path.join(__dirname, '..', '..', 'ai_service', 'data', 'models');

class MongoPredictionService {
  constructor() {
    this.featureEngineering = new FeatureEngineeringService();
    this.modelTrainingService = new ModelTrainingService();
    this._cachedModel = null;
    this._cachedPreprocessor = null;
    this._cachedModelVersion = null;
    this._modelLoadedAt = null;
  }

  async loadActiveModel() {
    const activeModel = await ModelTrainingRun.findOne({ isActive: true });

    if (!activeModel) {
      throw new ApiError(503, 'No active model available. Please train a model first.');
    }

    if (this._cachedModelVersion === activeModel.modelVersion && this._cachedModel) {
      return { model: this._cachedModel, preprocessor: this._cachedPreprocessor, modelVersion: activeModel.modelVersion };
    }

    const modelPath = activeModel.modelFilePath || path.join(MODEL_DIR, `${activeModel.modelVersion}_model.pkl`);
    const preprocessorPath = activeModel.preprocessorFilePath || path.join(MODEL_DIR, `${activeModel.modelVersion}_preprocessor.pkl`);

    if (!fs.existsSync(modelPath) || !fs.existsSync(preprocessorPath)) {
      throw new ApiError(503, `Model artifacts not found for version ${activeModel.modelVersion}`);
    }

    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, '..', '..', 'ai_service', 'load_model.py');

      if (!fs.existsSync(scriptPath)) {
        this._createLoadModelScript(scriptPath);
      }

      const pythonProcess = spawn('python', [
        scriptPath,
        '--model-path', modelPath,
        '--preprocessor-path', preprocessorPath,
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
            const result = JSON.parse(stdout.trim().split('\n').pop());
            this._cachedModel = result.modelBase64;
            this._cachedPreprocessor = result.preprocessorBase64;
            this._cachedModelVersion = activeModel.modelVersion;
            this._modelLoadedAt = new Date();
            resolve({ modelVersion: activeModel.modelVersion, loaded: true });
          } catch (e) {
            reject(new Error(`Failed to parse model load result: ${e.message}`));
          }
        } else {
          reject(new Error(`Model loading failed: ${stderr}`));
        }
      });
    });
  }

  _createLoadModelScript(scriptPath) {
    const scriptContent = `
import json
import joblib
import base64
import argparse
import io

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model-path', required=True)
    parser.add_argument('--preprocessor-path', required=True)
    args = parser.parse_args()

    model = joblib.load(args.model_path)
    preprocessor = joblib.load(args.preprocessor_path)

    model_buffer = io.BytesIO()
    joblib.dump(model, model_buffer)
    model_b64 = base64.b64encode(model_buffer.getvalue()).decode('utf-8')

    preprocessor_buffer = io.BytesIO()
    joblib.dump(preprocessor, preprocessor_buffer)
    preprocessor_b64 = base64.b64encode(preprocessor_buffer.getvalue()).decode('utf-8')

    result = {
        'modelBase64': model_b64,
        'preprocessorBase64': preprocessor_b64
    }
    print(json.dumps(result))

if __name__ == '__main__':
    main()
`;

    fs.writeFileSync(scriptPath, scriptContent);
  }

  async predictFromMongoDB(options = {}) {
    const {
      predictionWeek,
      communityAreas,
      srTypes,
      modelVersion,
    } = options;

    if (!predictionWeek) {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      predictionWeek = monday.toISOString().split('T')[0];
    }

    await this.loadActiveModel();

    const activeModel = await ModelTrainingRun.findOne({ isActive: true });
    if (!activeModel) {
      throw new ApiError(503, 'No active model available');
    }

    const features = await this.getPredictionFeatures(predictionWeek, {
      communityAreas,
      srTypes,
    });

    if (features.length === 0) {
      return {
        modelVersion: activeModel.modelVersion,
        predictionWeek,
        predictions: [],
        metadata: {
          predictionCount: 0,
          threshold: 0.38,
          featureGeneratedAt: new Date().toISOString(),
          historicalDataStartDate: activeModel.trainingStartDate,
          historicalDataEndDate: activeModel.trainingEndDate,
          historicalRecordCount: activeModel.trainingRecordCount,
        },
      };
    }

    const X = this.featureEngineering.prepareFeaturesForModelPrediction(features);

    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, '..', '..', 'ai_service', 'predict_from_mongodb.py');

      if (!fs.existsSync(scriptPath)) {
        this._createPredictScript(scriptPath);
      }

      const inputData = {
        X,
        modelBase64: this._cachedModel,
        preprocessorBase64: this._cachedPreprocessor,
      };

      const inputPath = path.join(__dirname, '..', '..', 'ai_service', 'data', 'predict_input.json');
      fs.writeFileSync(inputPath, JSON.stringify(inputData));

      const pythonProcess = spawn('python', [
        scriptPath,
        '--input-path', inputPath,
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
            const result = JSON.parse(stdout.trim().split('\n').pop());
            const predictions = result.predictions.map((p, i) => {
              const feature = features[i];
              const riskScore = p.risk_score;
              let riskLevel;
              if (riskScore >= 85) riskLevel = 'CRITICAL';
              else if (riskScore >= 70) riskLevel = 'HIGH';
              else if (riskScore >= 40) riskLevel = 'MEDIUM';
              else riskLevel = 'LOW';

              const srType = feature.sr_type;
              const department = this._getDepartmentForSrType(srType);

              return {
                complaintType: srType,
                department,
                communityArea: feature.community_area.toString(),
                ward: feature.ward.toString(),
                location: {
                  type: 'Point',
                  coordinates: this._getCommunityAreaCoordinates(feature.community_area),
                },
                probability: p.probability,
                riskScore,
                riskLevel,
                historicalCount: feature.complaint_count || 0,
                recentCount: feature.complaints_last_1_week || 0,
                trend: feature.complaints_last_1_week > feature.complaints_last_2_week ? 'INCREASING' :
                       feature.complaints_last_1_week < feature.complaints_last_2_week ? 'DECREASING' : 'STABLE',
                confidence: 0.85,
                predictionDate: feature.week_start,
                predictionWindowStart: feature.week_start,
                predictionWindowEnd: feature.week_end,
                modelVersion: activeModel.modelVersion,
                verificationStatus: 'UNASSIGNED',
              };
            });

            predictions.sort((a, b) => b.probability - a.probability);

            resolve({
              modelVersion: activeModel.modelVersion,
              predictionWeek,
              predictions,
              metadata: {
                predictionCount: predictions.length,
                threshold: 0.38,
                featureGeneratedAt: new Date().toISOString(),
                historicalDataStartDate: activeModel.trainingStartDate,
                historicalDataEndDate: activeModel.trainingEndDate,
                historicalRecordCount: activeModel.trainingRecordCount,
                featureCount: VALID_FEATURES.length,
              },
            });
          } catch (e) {
            reject(new Error(`Failed to parse prediction result: ${e.message}`));
          }
        } else {
          reject(new Error(`Prediction failed: ${stderr}`));
        }
      });
    });
  }

  _createPredictScript(scriptPath) {
    const scriptContent = `
import json
import joblib
import base64
import io
import pandas as pd
import numpy as np
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input-path', required=True)
    args = parser.parse_args()

    with open(args.input_path, 'r') as f:
        data = json.load(f)

    X = pd.DataFrame(data['X'])
    model_bytes = base64.b64decode(data['modelBase64'])
    preprocessor_bytes = base64.b64decode(data['preprocessorBase64'])

    model = joblib.load(io.BytesIO(model_bytes))
    preprocessor = joblib.load(io.BytesIO(preprocessor_bytes))

    X_processed = preprocessor.transform(X)
    probabilities = model.predict_proba(X_processed)[:, 1]

    predictions = []
    for i, prob in enumerate(probabilities):
        risk_score = float(prob * 100.0)
        predicted_class = 1 if prob >= 0.38 else 0
        predictions.append({
            'probability': float(prob),
            'risk_score': risk_score,
            'predicted_class': predicted_class,
        })

    result = {'predictions': predictions}
    print(json.dumps(result))

if __name__ == '__main__':
    main()
`;

    fs.writeFileSync(scriptPath, scriptContent);
  }

  async getPredictionFeatures(predictionWeek, filters = {}) {
    const predWeekStart = new Date(predictionWeek);
    const predWeekEnd = new Date(predWeekStart);
    predWeekEnd.setDate(predWeekEnd.getDate() + 6);

    const weekOfYear = this._getWeekOfYear(predWeekStart);
    const year = predWeekStart.getFullYear();

    const matchQuery = {
      complaintType: { $in: TARGET_COMPLAINT_TYPES },
      createdAt: { $gte: predWeekStart, $lte: predWeekEnd },
    };

    if (filters.communityAreas && filters.communityAreas.length > 0) {
      matchQuery.communityArea = { $in: filters.communityAreas };
    }

    if (filters.srTypes && filters.srTypes.length > 0) {
      matchQuery.complaintType = { $in: filters.srTypes };
    }

    const weeklyCounts = await HistoricalComplaint.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { communityArea: '$communityArea', srType: '$complaintType' },
          complaint_count: { $sum: 1 },
        }
      },
      {
        $project: {
          _id: 0,
          communityArea: '$_id.communityArea',
          srType: '$_id.srType',
          complaint_count: 1,
        }
      }
    ]);

    const allCommunities = filters.communityAreas || Array.from({ length: 77 }, (_, i) => String(i + 1));
    const allTypes = filters.srTypes || TARGET_COMPLAINT_TYPES;

    const features = [];
    const weeklyCountMap = new Map();
    for (const wc of weeklyCounts) {
      weeklyCountMap.set(`${wc.communityArea}|${wc.srType}`, wc.complaint_count);
    }

    for (const communityArea of allCommunities) {
      for (const srType of allTypes) {
        const complaintCount = weeklyCountMap.get(`${communityArea}|${srType}`) || 0;

        const lagFeatures = await this._getLagFeatures(communityArea, srType, year, weekOfYear);
        const rollingFeatures = await this._getRollingFeatures(communityArea, srType, year, weekOfYear);
        const seasonalFeatures = this._getSeasonalFeatures(predWeekStart);
        const spatialFeatures = await this._getSpatialFeatures(communityArea, srType, year, weekOfYear);

        features.push({
          community_area: parseInt(communityArea),
          week_start: predWeekStart,
          week_end: predWeekEnd,
          year,
          week_of_year: weekOfYear,
          year_week: `${year}-W${String(weekOfYear).padStart(2, '0')}`,
          sr_type: srType,
          complaint_count: complaintCount,
          ...lagFeatures,
          ...rollingFeatures,
          ...seasonalFeatures,
          ...spatialFeatures,
        });
      }
    }

    return features;
  }

  _getWeekOfYear(date) {
    const jan4 = new Date(date.getFullYear(), 0, 4);
    const jan4Day = jan4.getDay();
    const week1Start = new Date(jan4);
    week1Start.setDate(jan4.getDate() - jan4Day + (jan4Day === 0 ? -6 : 1));
    const diffDays = Math.floor((date - week1Start) / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
  }

  async _getLagFeatures(communityArea, srType, year, weekOfYear) {
    const lagPeriods = [1, 2, 4, 8, 12];
    const features = {};

    for (const lag of lagPeriods) {
      let prevWeek = weekOfYear - lag;
      let prevYear = year;
      if (prevWeek <= 0) {
        prevYear = year - 1;
        prevWeek = 52 + prevWeek;
      }

      const count = await HistoricalComplaint.countDocuments({
        communityArea,
        complaintType: srType,
        createdAt: {
          $gte: this._getWeekStart(prevYear, prevWeek),
          $lt: this._getWeekStart(prevYear, prevWeek + 1),
        },
      });

      features[`complaints_last_${lag}_week`] = count;
    }

    return features;
  }

  async _getRollingFeatures(communityArea, srType, year, weekOfYear) {
    const windows = [4, 8, 12];
    const features = {};

    for (const w of windows) {
      const counts = [];
      for (let offset = 1; offset <= w; offset++) {
        let prevWeek = weekOfYear - offset;
        let prevYear = year;
        if (prevWeek <= 0) {
          prevYear = year - 1;
          prevWeek = 52 + prevWeek;
        }

        const count = await HistoricalComplaint.countDocuments({
          communityArea,
          complaintType: srType,
          createdAt: {
            $gte: this._getWeekStart(prevYear, prevWeek),
            $lt: this._getWeekStart(prevYear, prevWeek + 1),
          },
        });
        counts.push(count);
      }

      if (counts.length === w) {
        const mean = counts.reduce((a, b) => a + b, 0) / w;
        features[`rolling_mean_${w}_weeks`] = mean;
        features[`rolling_max_${w}_weeks`] = Math.max(...counts);
        features[`rolling_std_${w}_weeks`] = Math.sqrt(counts.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / w);
      } else {
        features[`rolling_mean_${w}_weeks`] = 0;
        features[`rolling_max_${w}_weeks`] = 0;
        features[`rolling_std_${w}_weeks`] = 0;
      }
    }

    return features;
  }

  _getSeasonalFeatures(predWeekStart) {
    const month = predWeekStart.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    const season = SEASON_MAP[month];

    return {
      month,
      quarter,
      season,
    };
  }

  async _getSpatialFeatures(communityArea, srType, year, weekOfYear) {
    const ward = WARD_MAPPING[parseInt(communityArea)] || 0;

    const windows = [1, 4, 8, 12];
    const features = { ward };

    for (const w of windows) {
      const counts = [];
      const distinctTypes = new Set();

      for (let offset = 1; offset <= w; offset++) {
        let prevWeek = weekOfYear - offset;
        let prevYear = year;
        if (prevWeek <= 0) {
          prevYear = year - 1;
          prevWeek = 52 + prevWeek;
        }

        const weekStart = this._getWeekStart(prevYear, prevWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const totalCount = await HistoricalComplaint.countDocuments({
          communityArea,
          createdAt: { $gte: weekStart, $lte: weekEnd },
        });
        counts.push(totalCount);

        const distinct = await HistoricalComplaint.distinct('complaintType', {
          communityArea,
          createdAt: { $gte: weekStart, $lte: weekEnd },
        });
        distinct.forEach(d => distinctTypes.add(d));
      }

      if (w === 1) {
        features[`total_complaints_all_types_last_1_week`] = counts[0] || 0;
      } else {
        features[`total_complaints_all_types_last_${w}_weeks`] = counts.reduce((a, b) => a + b, 0);
      }

      if (w >= 4) {
        features[`distinct_complaint_types_last_${w}_weeks`] = distinctTypes.size;
      }
    }

    return features;
  }

  _getWeekStart(year, weekOfYear) {
    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay();
    const week1Start = new Date(jan4);
    week1Start.setDate(jan4.getDate() - jan4Day + (jan4Day === 0 ? -6 : 1));
    const targetWeekStart = new Date(week1Start);
    targetWeekStart.setDate(week1Start.getDate() + (weekOfYear - 1) * 7);
    return targetWeekStart;
  }

  _getDepartmentForSrType(srType) {
    const srToDept = {
      'Rodent Baiting/Rat Complaint': 'Vector Control',
      'Abandoned Vehicle Complaint': 'Vehicle & Traffic Operations',
      'Garbage Cart Maintenance': 'Sanitation & Recycling',
      'Graffiti Removal Request': 'Community Maintenance',
      'Traffic Signal Out Complaint': 'Electrical & Lighting',
      'Blue Recycling Cart': 'Sanitation & Recycling',
      'Building Violation': 'Building & Safety Inspections',
      'Street Light Out Complaint': 'Electrical & Lighting',
      'Pothole in Street Complaint': 'Infrastructure Repair',
      'Tree Debris Clean-Up Request': 'Community Maintenance',
    };
    return srToDept[srType] || 'Municipal';
  }

  _getCommunityAreaCoordinates(communityArea) {
    const coords = {
      1: [-87.6701, 42.0094], 2: [-87.6945, 42.0012], 3: [-87.6588, 41.9658],
      4: [-87.6883, 41.9722], 5: [-87.6827, 41.9480], 6: [-87.6397, 41.9658],
      7: [-87.6097, 41.9658], 8: [-87.6175, 41.8781], 9: [-87.6355, 41.8781],
      10: [-87.6366, 41.8512], 11: [-87.6621, 41.8512], 12: [-87.6298, 41.8781],
      13: [-87.6097, 41.8781], 14: [-87.5897, 41.8781], 15: [-87.5697, 41.8781],
      16: [-87.5497, 41.8781], 17: [-87.5297, 41.8781], 18: [-87.5097, 41.8781],
      19: [-87.4897, 41.8781], 20: [-87.4697, 41.8781], 21: [-87.4497, 41.8781],
      22: [-87.4297, 41.8781], 23: [-87.4097, 41.8781], 24: [-87.3897, 41.8781],
      25: [-87.3697, 41.8781], 26: [-87.3497, 41.8781], 27: [-87.3297, 41.8781],
      28: [-87.6701, 41.9218], 29: [-87.6501, 41.9218], 30: [-87.6301, 41.9218],
      31: [-87.6101, 41.9218], 32: [-87.5901, 41.9218], 33: [-87.5701, 41.9218],
      34: [-87.5501, 41.9218], 35: [-87.5301, 41.9218], 36: [-87.5101, 41.9218],
      37: [-87.4901, 41.9218], 38: [-87.4701, 41.9218], 39: [-87.4501, 41.9218],
      40: [-87.4301, 41.9218], 41: [-87.4101, 41.9218], 42: [-87.3901, 41.9218],
      43: [-87.3701, 41.9218], 44: [-87.3501, 41.9218], 45: [-87.3301, 41.9218],
      46: [-87.3101, 41.9218], 47: [-87.2901, 41.9218], 48: [-87.2701, 41.9218],
      49: [-87.2501, 41.9218], 50: [-87.2301, 41.9218], 51: [-87.2101, 41.9218],
      52: [-87.1901, 41.9218], 53: [-87.1701, 41.9218], 54: [-87.1501, 41.9218],
      55: [-87.1301, 41.9218], 56: [-87.1101, 41.9218], 57: [-87.0901, 41.9218],
      58: [-87.0701, 41.9218], 59: [-87.0501, 41.9218], 60: [-87.0301, 41.9218],
      61: [-87.0101, 41.9218], 62: [-86.9901, 41.9218], 63: [-86.9701, 41.9218],
      64: [-86.9501, 41.9218], 65: [-86.9301, 41.9218], 66: [-86.9101, 41.9218],
      67: [-86.8901, 41.9218], 68: [-86.8701, 41.9218], 69: [-86.8501, 41.9218],
      70: [-86.8301, 41.9218], 71: [-86.8101, 41.9218], 72: [-86.7901, 41.9218],
      73: [-86.7701, 41.9218], 74: [-86.7501, 41.9218], 75: [-86.7301, 41.9218],
      76: [-86.7101, 41.9218], 77: [-86.6901, 41.9218],
    };
    return coords[communityArea] || [-87.6298, 41.8781];
  }

  async getModelInfo() {
    const activeModel = await ModelTrainingRun.findOne({ isActive: true });

    if (!activeModel) {
      return {
        modelVersion: 'none',
        modelType: 'XGBClassifier',
        requiredFeatureCount: VALID_FEATURES.length,
        predictionMode: 'batch',
        threshold: 0.38,
        supportedSrTypes: TARGET_COMPLAINT_TYPES,
        status: 'no_active_model',
      };
    }

    if (this._cachedModelVersion === activeModel.modelVersion && this._cachedModel) {
      return {
        modelVersion: activeModel.modelVersion,
        modelType: activeModel.algorithm || 'XGBClassifier',
        requiredFeatureCount: VALID_FEATURES.length,
        predictionMode: 'batch',
        threshold: 0.38,
        supportedSrTypes: TARGET_COMPLAINT_TYPES,
        status: 'active',
        trainingDate: activeModel.trainingCompletedAt,
        validationMetrics: activeModel.validationMetrics,
        testMetrics: activeModel.testMetrics,
        trainingRecordCount: activeModel.trainingRecordCount,
        validationRecordCount: activeModel.validationRecordCount,
        testRecordCount: activeModel.testRecordCount,
        dataQualityReport: activeModel.dataQualityReport,
      };
    }

    return {
      modelVersion: activeModel.modelVersion,
      modelType: activeModel.algorithm || 'XGBClassifier',
      requiredFeatureCount: VALID_FEATURES.length,
      predictionMode: 'batch',
      threshold: 0.38,
      supportedSrTypes: TARGET_COMPLAINT_TYPES,
      status: 'active',
      trainingDate: activeModel.trainingCompletedAt,
      validationMetrics: activeModel.validationMetrics,
      testMetrics: activeModel.testMetrics,
      trainingRecordCount: activeModel.trainingRecordCount,
      validationRecordCount: activeModel.validationRecordCount,
      testRecordCount: activeModel.testRecordCount,
      dataQualityReport: activeModel.dataQualityReport,
    };
  }

  async checkModelHealth() {
    try {
      const activeModel = await ModelTrainingRun.findOne({ isActive: true });
      if (!activeModel) {
        return { status: 'no_active_model', healthy: false };
      }

      const modelPath = activeModel.modelFilePath || path.join(MODEL_DIR, `${activeModel.modelVersion}_model.pkl`);
      const preprocessorPath = activeModel.preprocessorFilePath || path.join(MODEL_DIR, `${activeModel.modelVersion}_preprocessor.pkl`);

      const modelExists = fs.existsSync(modelPath);
      const preprocessorExists = fs.existsSync(preprocessorPath);

      return {
        status: modelExists && preprocessorExists ? 'healthy' : 'degraded',
        modelLoaded: modelExists,
        preprocessorLoaded: preprocessorExists,
        featureSourceAvailable: true,
        modelVersion: activeModel.modelVersion,
        activatedAt: activeModel.activatedAt,
      };
    } catch (error) {
      return { status: 'error', healthy: false, error: error.message };
    }
  }
}

module.exports = {
  MongoPredictionService,
  TARGET_COMPLAINT_TYPES,
  VALID_FEATURES,
  FORBIDDEN_COLUMNS,
  WARD_MAPPING,
  SEASON_MAP,
};