const mongoose = require('mongoose');

async function finalAudit() {
  await mongoose.connect('mongodb://127.0.0.1:27017/civic_forecasting');
  const db = mongoose.connection.db;

  const TARGET_CYCLE_ID = 'CYCLE-2026-09-14-1789376320059';
  const cycle = await db.collection('predictioncycles').findOne({ cycleId: TARGET_CYCLE_ID });

  const predictionsCount = await db.collection('predictions').countDocuments({ predictionCycleId: cycle._id });
  const totalPredictions = await db.collection('predictions').countDocuments();
  const vcs = await db.collection('verificationcandidates').find({ predictionCycleId: cycle._id }).toArray();
  const assignments = await db.collection('assignments').find().toArray();
  const officers = await db.collection('officers').find().toArray();
  const historicalComplaints = await db.collection('historicalcomplaints').countDocuments();
  const centroids = await db.collection('communityareacentroids').countDocuments();

  const activeModelRun = await db.collection('modeltrainingruns').findOne({ status: 'ACTIVE' }) ||
                         await db.collection('modeltrainingruns').findOne({ modelVersion: 'xgb-test-v1' });

  console.log('=== MODULE 9G FINAL INVARIANT AUDIT ===');
  console.log('Database:', 'mongodb://127.0.0.1:27017/civic_forecasting');
  console.log('Active Model Version:', cycle.modelVersion, activeModelRun ? `(Run ID: ${activeModelRun.runId})` : '');
  console.log('Total Historical Complaints:', historicalComplaints);
  console.log('Total Predictions in DB:', totalPredictions);
  console.log('Target Cycle Predictions:', predictionsCount);
  console.log('Target Cycle Verification Candidates:', vcs.length);
  console.log('Candidates with assignedOfficer:', vcs.filter(v => v.assignedOfficer).length);
  console.log('Candidates with assignedAssignment:', vcs.filter(v => v.assignedAssignment).length);
  console.log('Total Assignments in assignments collection:', assignments.length);
  console.log('Community Area Centroids:', centroids);

  // Check unique predictions in assignments
  const predIdsInAsgn = new Set(assignments.map(a => a.predictionId.toString()));
  console.log('Unique predictions assigned:', predIdsInAsgn.size);

  // Check 90/10 ratio in candidate pool
  const exploitationCount = vcs.filter(v => v.selectionType === 'EXPLOITATION').length;
  const explorationCount = vcs.filter(v => v.selectionType === 'EXPLORATION').length;
  console.log(`90/10 Distribution: ${exploitationCount} Exploitation (${Math.round(exploitationCount/vcs.length*100)}%), ${explorationCount} Exploration (${Math.round(explorationCount/vcs.length*100)}%)`);

  // Check officer workloads
  let overCapacity = 0;
  for (const off of officers) {
    if (off.currentWorkload > off.maxAssignments) {
      overCapacity++;
    }
  }
  console.log('Officers Over Capacity:', overCapacity);

  await mongoose.disconnect();
}

finalAudit().catch(console.error);
