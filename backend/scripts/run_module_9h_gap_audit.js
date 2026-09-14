const mongoose = require('mongoose');
const http = require('http');

async function runGapAudit() {
  await mongoose.connect('mongodb://127.0.0.1:27017/civic_forecasting');
  const db = mongoose.connection.db;

  const TARGET_CYCLE_ID = 'CYCLE-2026-09-14-1789376320059';
  const cycle = await db.collection('predictioncycles').findOne({ cycleId: TARGET_CYCLE_ID });

  const predictions = await db.collection('predictions').find({ predictionCycleId: cycle._id }).toArray();
  const vcs = await db.collection('verificationcandidates').find({ predictionCycleId: cycle._id }).toArray();
  const assignments = await db.collection('assignments').find({
    predictionId: { $in: predictions.map(p => p._id) }
  }).toArray();
  const officers = await db.collection('officers').find().toArray();
  const historicalComplaints = await db.collection('historicalcomplaints').countDocuments();
  const centroids = await db.collection('communityareacentroids').find().toArray();

  // 1. Check feature engineering consistency & target types
  const { TARGET_COMPLAINT_TYPES, VALID_FEATURES, FORBIDDEN_COLUMNS } = require('../src/services/featureEngineeringService');
  const distinctSrTypesInPreds = new Set(predictions.map(p => p.complaintType));
  const distinctAreasInPreds = new Set(predictions.map(p => p.communityArea));

  // 2. Check 90/10 exploitation/exploration
  const exploitationCount = vcs.filter(v => v.selectionType === 'EXPLOITATION').length;
  const explorationCount = vcs.filter(v => v.selectionType === 'EXPLORATION').length;

  // 3. Check Assignment distance and weights
  const { haversine } = require('../src/utils/assignmentUtils');
  let invalidDistances = 0;
  let fallback100km = 0;
  for (const asgn of assignments) {
    if (typeof asgn.distanceKm !== 'number' || asgn.distanceKm < 0) invalidDistances++;
    if (asgn.distanceKm >= 100) fallback100km++;
  }

  // 4. Check officer workloads
  let overCapacityOfficers = 0;
  for (const o of officers) {
    if (o.currentWorkload > o.maxAssignments) overCapacityOfficers++;
  }

  // 5. Test Admin API vs Officer API vs DB
  const results = {
    database: 'civic_forecasting',
    targetCycleId: TARGET_CYCLE_ID,
    totalHistoricalComplaints: historicalComplaints,
    cyclePredictionsCount: predictions.length,
    distinctSrTypesCount: distinctSrTypesInPreds.size,
    distinctAreasCount: distinctAreasInPreds.size,
    targetComplaintTypesContractCount: TARGET_COMPLAINT_TYPES.length,
    validFeaturesCount: VALID_FEATURES.length,
    forbiddenColumnsCount: FORBIDDEN_COLUMNS.length,
    vcsCount: vcs.length,
    exploitationCount,
    explorationCount,
    assignmentsCount: assignments.length,
    invalidDistances,
    fallback100km,
    totalOfficers: officers.length,
    overCapacityOfficers
  };

  console.log('AUDIT CORE METRICS:', JSON.stringify(results, null, 2));

  await mongoose.disconnect();
}

runGapAudit().catch(console.error);
