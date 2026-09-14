const mongoose = require('mongoose');

async function inspectWorkloads() {
  await mongoose.connect('mongodb://127.0.0.1:27017/civic_forecasting');
  const db = mongoose.connection.db;

  const cycle = await db.collection('predictioncycles').findOne({ cycleId: 'CYCLE-2026-09-14-1789376320059' });
  const vcs = await db.collection('verificationcandidates').find({ predictionCycleId: cycle._id }).toArray();

  const officerCandidateCounts = {};
  for (const vc of vcs) {
    const offId = vc.assignedOfficer.toString();
    officerCandidateCounts[offId] = (officerCandidateCounts[offId] || 0) + 1;
  }

  console.log('Unique officers assigned to candidates:', Object.keys(officerCandidateCounts).length);

  const officerDocs = await db.collection('officers').find({
    _id: { $in: Object.keys(officerCandidateCounts).map(id => new mongoose.Types.ObjectId(id)) }
  }).toArray();

  console.log('Officer details:');
  for (const off of officerDocs) {
    const assignedCount = officerCandidateCounts[off._id.toString()];
    console.log(`Officer [${off.officerId}] ${off.name}: Department=${off.department}, CurrentWorkload=${off.currentWorkload}, MaxAssignments=${off.maxAssignments}, AssignedCandidatesCount=${assignedCount}`);
  }

  await mongoose.disconnect();
}

inspectWorkloads().catch(console.error);
