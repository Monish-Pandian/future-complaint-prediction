require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/database');
const { ModelTrainingRun, TRAINING_STATUS } = require('../src/models/ModelTrainingRun');
const fs = require('fs');
const path = require('path');

async function registerExistingModel() {
  try {
    await connectDB();
    console.log('[RegisterModel] Database connected');

const MODEL_DIR = path.join(__dirname, '..', 'ai_service', 'data', 'models');
const PROCESSED_DIR = path.join(__dirname, '..', 'ai_service', 'data', 'processed');

    const modelPath = path.join(MODEL_DIR, 'xgboost_model.pkl');
    const preprocessorPath = path.join(MODEL_DIR, 'preprocessor.pkl');
    const finalDatasetPath = path.join(PROCESSED_DIR, 'final_research_dataset.csv');

    if (!fs.existsSync(modelPath) || !fs.existsSync(preprocessorPath)) {
      console.error('[RegisterModel] Model artifacts not found');
      return;
    }

    console.log('[RegisterModel] Found existing model artifacts');

    const modelVersion = 'baseline-spatial-v1';

    let trainingRun = await ModelTrainingRun.findOne({ modelVersion });
    if (!trainingRun) {
      trainingRun = await ModelTrainingRun.create({
        modelVersion,
        status: TRAINING_STATUS.ACTIVATED,
        algorithm: 'XGBClassifier',
        featureVersion: 'v1',
        trainingStartDate: new Date('2020-01-01'),
        trainingEndDate: new Date('2022-12-31'),
        validationStartDate: new Date('2023-01-01'),
        validationEndDate: new Date('2023-12-31'),
        testStartDate: new Date('2024-01-01'),
        testEndDate: new Date('2024-08-30'),
        trainingRecordCount: 0,
        validationRecordCount: 0,
        testRecordCount: 0,
        modelFilePath: modelPath,
        preprocessorFilePath: preprocessorPath,
        isActive: true,
        activatedAt: new Date(),
        triggerSource: 'initial',
      });
    } else {
      trainingRun.status = TRAINING_STATUS.ACTIVATED;
      trainingRun.modelFilePath = modelPath;
      trainingRun.preprocessorFilePath = preprocessorPath;
      trainingRun.isActive = true;
      trainingRun.activatedAt = new Date();
      await trainingRun.save();
    }

    await ModelTrainingRun.updateMany(
      { _id: { $ne: trainingRun._id }, isActive: true },
      { $set: { isActive: false, status: TRAINING_STATUS.REJECTED } }
    );

    trainingRun.isActive = true;
    await trainingRun.save();

    const targetPath = path.join(MODEL_DIR, 'xgboost_model.pkl');
    const targetPreprocessorPath = path.join(MODEL_DIR, 'preprocessor.pkl');

    fs.copyFileSync(modelPath, targetPath);
    fs.copyFileSync(preprocessorPath, targetPreprocessorPath);

    console.log('[RegisterModel] Model registered as active:');
    console.log(`  Model Version: ${trainingRun.modelVersion}`);
    console.log(`  Status: ${trainingRun.status}`);
    console.log(`  Model Path: ${modelPath}`);
    console.log(`  Preprocessor Path: ${preprocessorPath}`);
    console.log(`  Is Active: ${trainingRun.isActive}`);

  } catch (error) {
    console.error('[RegisterModel] Error:', error);
  } finally {
    await disconnectDB();
  }
}

registerExistingModel();