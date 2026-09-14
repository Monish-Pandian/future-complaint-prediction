const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/civic_forecasting');
  const db = mongoose.connection.db;

  // 1. Collections & Counts
  const collections = [
    'predictions', 'predictioncycles', 'assignments', 'officers',
    'verificationcandidates', 'verifications', 'evaluations', 'feedbacks',
    'communityareacentroids', 'users'
  ];
  const counts = {};
  for (const c of collections) {
    counts[c] = await db.collection(c).countDocuments();
  }

  // 2. Prediction cycles
  const allCycles = await db.collection('predictioncycles').find().sort({ createdAt: -1 }).toArray();
  const cyclesSummary = allCycles.slice(0, 10).map(c => ({
    _id: c._id.toString(),
    cycleId: c.cycleId,
    cycleNumber: c.cycleNumber,
    status: c.status,
    predictionCount: c.predictionCount,
    verificationCount: c.verificationCount,
    startDate: c.startDate,
    endDate: c.endDate,
    predictionWindowStart: c.predictionWindowStart,
    predictionWindowEnd: c.predictionWindowEnd,
    modelVersion: c.modelVersion,
    createdAt: c.createdAt
  }));

  // Find non-empty cycles
  const cyclesWithPreds = [];
  for (const c of allCycles) {
    const pCount = await db.collection('predictions').countDocuments({ predictionCycleId: c._id });
    const vcCount = await db.collection('verificationcandidates').countDocuments({ predictionCycleId: c._id });
    const asgnCount = await db.collection('assignments').countDocuments({ predictionCycleId: c._id });
    if (pCount > 0 || vcCount > 0 || asgnCount > 0) {
      cyclesWithPreds.push({
        _id: c._id.toString(),
        cycleId: c.cycleId,
        pCount,
        vcCount,
        asgnCount,
        status: c.status,
        createdAt: c.createdAt
      });
    }
  }

  // 3. Predictions analysis
  const latestPreds = await db.collection('predictions').find().sort({ createdAt: -1 }).limit(5).toArray();
  const predStats = await db.collection('predictions').aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        highRisk: { $sum: { $cond: [{ $eq: ['$riskLevel', 'HIGH'] }, 1, 0] } },
        mediumRisk: { $sum: { $cond: [{ $eq: ['$riskLevel', 'MEDIUM'] }, 1, 0] } },
        lowRisk: { $sum: { $cond: [{ $eq: ['$riskLevel', 'LOW'] }, 1, 0] } },
        assignedOfficerCount: { $sum: { $cond: [{ $ifNull: ['$assignedOfficer', false] }, 1, 0] } },
        avgProbability: { $avg: '$probability' },
        avgRiskScore: { $avg: '$riskScore' },
        modelVersions: { $addToSet: '$modelVersion' },
        verificationStatuses: { $addToSet: '$verificationStatus' }
      }
    }
  ]).toArray();

  // 4. Verification candidates analysis
  const vcStats = await db.collection('verificationcandidates').aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        exploitationCount: { $sum: { $cond: [{ $eq: ['$selectionType', 'EXPLOITATION'] }, 1, 0] } },
        explorationCount: { $sum: { $cond: [{ $eq: ['$selectionType', 'EXPLORATION'] }, 1, 0] } },
        withAssignedOfficer: { $sum: { $cond: [{ $ifNull: ['$assignedOfficer', false] }, 1, 0] } },
        withAssignedAssignment: { $sum: { $cond: [{ $ifNull: ['$assignedAssignment', false] }, 1, 0] } }
      }
    }
  ]).toArray();

  const sampleVCs = await db.collection('verificationcandidates').find().sort({ createdAt: -1 }).limit(5).toArray();

  // 5. Officers analysis
  const officerStats = await db.collection('officers').aggregate([
    {
      $group: {
        _id: '$department',
        total: { $sum: 1 },
        available: { $sum: { $cond: [{ $eq: ['$availability', 'AVAILABLE'] }, 1, 0] } },
        busy: { $sum: { $cond: [{ $eq: ['$availability', 'BUSY'] }, 1, 0] } },
        offDuty: { $sum: { $cond: [{ $eq: ['$availability', 'OFF_DUTY'] }, 1, 0] } },
        active: { $sum: { $cond: [{ $eq: ['$active', true] }, 1, 0] } },
        avgWorkload: { $avg: '$currentWorkload' },
        avgMaxAssignments: { $avg: '$maxAssignments' }
      }
    }
  ]).toArray();

  const totalActiveOfficers = await db.collection('officers').countDocuments({ active: true });
  const totalAvailableOfficers = await db.collection('officers').countDocuments({
    active: true,
    availability: { $in: ['AVAILABLE', 'BUSY'] }
  });

  // 6. CommunityAreaCentroids
  const centroidCount = await db.collection('communityareacentroids').countDocuments();
  const sampleCentroid = await db.collection('communityareacentroids').findOne();

  console.log(JSON.stringify({
    counts,
    cyclesSummary,
    cyclesWithPreds,
    predStats: predStats[0],
    latestPredSample: latestPreds[0],
    vcStats,
    sampleVCs: sampleVCs.slice(0, 3),
    officerStats,
    totalActiveOfficers,
    totalAvailableOfficers,
    centroidCount,
    sampleCentroid
  }, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
