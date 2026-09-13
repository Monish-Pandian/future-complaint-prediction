const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/database');
const { ModelTrainingRun, TRAINING_STATUS } = require('../src/models/ModelTrainingRun');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function cleanupStuckRuns() {
  await connectDB();
  
  const result = await ModelTrainingRun.updateMany(
    { status: TRAINING_STATUS.RUNNING },
    { $set: { status: TRAINING_STATUS.FAILED, errorMessage: 'Stuck in RUNNING - cleanup' } }
  );
  console.log('Cleaned up:', result.modifiedCount, 'runs');
  
  await disconnectDB();
}

cleanupStuckRuns().catch(console.error);