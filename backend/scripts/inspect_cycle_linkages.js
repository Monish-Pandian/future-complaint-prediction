const mongoose = require('mongoose');
require('../src/models');

async function inspectCyclesAndPreds() {
  await mongoose.connect('mongodb://127.0.0.1:27017/civic_forecasting');
  const Prediction = mongoose.model('Prediction');
  const PredictionCycle = mongoose.model('PredictionCycle');
  const VerificationCandidate = mongoose.model('VerificationCandidate');

  console.log('=== PREDICTION CYCLES WITH PREDICTIONS ===');
  const predCycleAgg = await Prediction.aggregate([
    { $group: { _id: '$predictionCycleId', count: { $sum: 1 }, latestDate: { $max: '$predictionDate' }, modelVersion: { $first: '$modelVersion' } } },
    { $sort: { latestDate: -1 } }
  ]);
  console.log('Cycles grouped by predictionCount in predictions:');
  for (const c of predCycleAgg) {
    let cycleDoc = null;
    if (c._id) {
      cycleDoc = await PredictionCycle.findById(c._id);
    }
    console.log({
      predictionCycleId: c._id ? c._id.toString() : null,
      predictionCount: c.count,
      latestDate: c.latestDate,
      modelVersion: c.modelVersion,
      cycleDocExists: !!cycleDoc,
      cycleId: cycleDoc?.cycleId,
      cycleStatus: cycleDoc?.status,
    });
  }

  // Also check verification candidates
  console.log('\n=== VERIFICATION CANDIDATES CYCLES ===');
  const candCycleAgg = await VerificationCandidate.aggregate([
    { $group: { _id: '$predictionCycleId', count: { $sum: 1 }, assignedCount: { $sum: { $cond: [{ $eq: ['$status', 'ASSIGNED'] }, 1, 0] } } } }
  ]);
  console.log('Candidates grouped by predictionCycleId:', candCycleAgg);

  // Check how assignment generation works in backend
  await mongoose.disconnect();
}

inspectCyclesAndPreds().catch(console.error);
