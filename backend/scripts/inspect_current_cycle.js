const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://127.0.0.1:27017/civic_forecasting');
  const db = mongoose.connection.db;

  const cycle = await db.collection('predictioncycles').findOne({ cycleId: 'CYCLE-2026-09-14-1789376320059' });
  console.log('Cycle:', cycle ? cycle._id.toString() : 'Not found');

  const vcs = await db.collection('verificationcandidates').find({ predictionCycleId: cycle._id }).toArray();
  console.log('VCs count:', vcs.length);
  console.log('VCs status breakdown:', vcs.reduce((acc, v) => { acc[v.status] = (acc[v.status] || 0) + 1; return acc; }, {}));
  console.log('VCs with assignedOfficer:', vcs.filter(v => v.assignedOfficer).length);
  console.log('VCs with assignedAssignment:', vcs.filter(v => v.assignedAssignment).length);

  const officerIds = vcs.map(v => v.assignedOfficer).filter(Boolean);
  const officers = await db.collection('officers').find({ _id: { $in: officerIds } }).toArray();
  console.log('Assigned Officers count in DB:', officers.length);
  console.log('Officers sample workload:', officers.slice(0, 5).map(o => ({
    id: o.officerId,
    name: o.name,
    dept: o.department,
    workload: o.currentWorkload,
    max: o.maxAssignments,
    active: o.active
  })));

  const asgns = await db.collection('assignments').find().toArray();
  console.log('Existing assignments total in DB:', asgns.length);

  await mongoose.disconnect();
}

check().catch(console.error);
