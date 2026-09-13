require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/database');
const { ModelTrainingService } = require('../src/services/modelTrainingService');

async function trainModel() {
  try {
    await connectDB();
    console.log('[TrainModel] Database connected');

    const trainingService = new ModelTrainingService();

    console.log('[TrainModel] Starting model training...');
    const result = await trainingService.trainModel({
      modelVersion: `xgb-test-${Date.now()}`,
      triggerSource: 'initial',
    });

    console.log(`[TrainModel] Training completed:`);
    console.log(`  Model Version: ${result.modelVersion}`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Training Records: ${result.trainingRecordCount}`);
    console.log(`  Validation Records: ${result.validationRecordCount}`);
    console.log(`  Test Records: ${result.testRecordCount}`);
    console.log(`  Training Metrics:`, JSON.stringify(result.trainingMetrics, null, 2));
    console.log(`  Validation Metrics:`, JSON.stringify(result.validationMetrics, null, 2));
    console.log(`  Test Metrics:`, JSON.stringify(result.testMetrics, null, 2));
    console.log(`  Is Active: ${result.isActive}`);

    if (result.errorMessage) {
      console.log(`  Error: ${result.errorMessage}`);
    }

  } catch (error) {
    console.error('[TrainModel] Error:', error);
  } finally {
    await disconnectDB();
  }
}

trainModel();