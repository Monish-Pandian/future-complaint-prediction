const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/civic_forecasting');
  const db = mongoose.connection.db;

  console.log('=== STEP 1: DATABASE AUDIT ===');
  const collections = [
    'predictions',
    'predictioncycles',
    'assignments',
    'officers',
    'verificationcandidates',
    'verifications',
    'evaluations',
    'feedbacks',
    'communityareacentroids',
    'historicalcomplaints'
  ];

  const counts = {};
  for (const name of collections) {
    counts[name] = await db.collection(name).countDocuments();
  }
  console.log('Collection Counts:', JSON.stringify(counts, null, 2));

  console.log('\n=== STEP 2: LATEST PREDICTION CYCLES ===');
  const latestCycles = await db.collection('predictioncycles').find().sort({ createdAt: -1 }).limit(5).toArray();
  for (const cycle of latestCycles) {
    const pCount = await db.collection('predictions').countDocuments({ predictionCycleId: cycle._id });
    const vcCount = await db.collection('verificationcandidates').countDocuments({ predictionCycleId: cycle._id });
    const asgnCount = await db.collection('assignments').countDocuments({ predictionCycleId: cycle._id });
    console.log(`Cycle [${cycle.cycleId}] (_id: ${cycle._id}):`);
    console.log(`  Status: ${cycle.status}`);
    console.log(`  Model Version: ${cycle.modelVersion}`);
    console.log(`  Window: ${cycle.startDate} to ${cycle.endDate}`);
    console.log(`  Predictions: ${pCount}`);
    console.log(`  Verification Candidates: ${vcCount}`);
    console.log(`  Assignments: ${asgnCount}`);
    console.log(`  Created At: ${cycle.createdAt}`);
  }

  // Find the latest cycle with real predictions (770)
  const fullCycle = await db.collection('predictioncycles').findOne({
    cycleId: 'CYCLE-2026-09-14-1789376320059'
  });

  if (fullCycle) {
    console.log('\n=== LATEST REAL PREDICTION CYCLE DETAILS ===');
    console.log(`Cycle ID: ${fullCycle.cycleId}`);
    console.log(`_id: ${fullCycle._id}`);
    const vcs = await db.collection('verificationcandidates').find({ predictionCycleId: fullCycle._id }).toArray();
    const exploitation = vcs.filter(v => v.selectionType === 'EXPLOITATION');
    const exploration = vcs.filter(v => v.selectionType === 'EXPLORATION');
    const withOfficer = vcs.filter(v => v.assignedOfficer);
    const withAssignment = vcs.filter(v => v.assignedAssignment);

    console.log(`Total VCs in cycle: ${vcs.length}`);
    console.log(`Exploitation: ${exploitation.length}`);
    console.log(`Exploration: ${exploration.length}`);
    console.log(`With assignedOfficer in VC doc: ${withOfficer.length}`);
    console.log(`With assignedAssignment in VC doc: ${withAssignment.length}`);
    console.log(`Status breakdown:`, vcs.reduce((acc, v) => { acc[v.status] = (acc[v.status] || 0) + 1; return acc; }, {}));

    console.log('\nSample VC:');
    console.log(JSON.stringify(vcs[0], null, 2));
  }

  console.log('\n=== STEP 4: OFFICER ELIGIBILITY AUDIT ===');
  const officers = await db.collection('officers').find().toArray();
  const deptBreakdown = {};
  const availBreakdown = {};
  let activeCount = 0;
  let withLocation = 0;
  let withValidCentroidCoords = 0;

  for (const o of officers) {
    deptBreakdown[o.department] = (deptBreakdown[o.department] || 0) + 1;
    availBreakdown[o.availability] = (availBreakdown[o.availability] || 0) + 1;
    if (o.active) activeCount++;
    if (o.location && o.location.coordinates && o.location.coordinates.length === 2) withLocation++;
  }

  console.log(`Total Officers: ${officers.length}`);
  console.log(`Active Officers: ${activeCount}`);
  console.log(`With Geo Location: ${withLocation}`);
  console.log('Department Breakdown:', JSON.stringify(deptBreakdown, null, 2));
  console.log('Availability Breakdown:', JSON.stringify(availBreakdown, null, 2));

  console.log('\n=== STEP 5: ASSIGNMENT SERVICE SIMULATION / TRACE ===');
  // Check SR to Dept mapping in assignmentUtils
  const { SR_TO_DEPT, getRequiredDepartment, computeDistanceMatrix, findEligibleOfficersForCandidate, selectBestOfficer } = require('../src/utils/assignmentUtils');
  console.log('SR_TO_DEPT mapping entries:', Object.keys(SR_TO_DEPT).length);
  console.log(JSON.stringify(SR_TO_DEPT, null, 2));

  // Check centroids
  const centroids = await db.collection('communityareacentroids').find().toArray();
  console.log(`Community Area Centroids Count: ${centroids.length}`);

  // Test eligible officers matching for sample VC
  if (fullCycle) {
    const sampleVC = await db.collection('verificationcandidates').findOne({ predictionCycleId: fullCycle._id });
    if (sampleVC) {
      const requiredDept = getRequiredDepartment(sampleVC.srType);
      const activeOfficers = officers.filter(o => o.active && (o.availability === 'AVAILABLE' || o.availability === 'BUSY'));
      const srTypeToDeptMap = new Map([[sampleVC.srType, requiredDept]]);
      const eligible = findEligibleOfficersForCandidate(activeOfficers, sampleVC, srTypeToDeptMap);
      console.log(`\nSample VC candidateId: ${sampleVC.candidateId}, srType: '${sampleVC.srType}', requiredDept: '${requiredDept}'`);
      console.log(`Eligible Officers Found: ${eligible.length}`);
      if (eligible.length > 0) {
        const distances = computeDistanceMatrix(activeOfficers, centroids);
        const weights = { risk: 0.4, distance: 0.3, workload: 0.3 };
        const best = selectBestOfficer(eligible, sampleVC, distances, weights);
        console.log('Best officer selected by algorithm:');
        console.log(`  Officer Name: ${best.officer.name} (${best.officer.officerId})`);
        console.log(`  Distance: ${best.distanceKm} km`);
        console.log(`  Composite Score: ${best.score}`);
      }
    }
  }

  console.log('\n=== STEP 6 & 7: CHECK ASSIGNMENTS API AND NORMALIZATION ===');
  const assignmentService = require('../src/services/assignmentService');
  const apiResultEmptyFilter = await assignmentService.getAdminAssignments({});
  console.log('API getAdminAssignments({}) count:', apiResultEmptyFilter.assignments.length);
  console.log('API getAdminAssignments pagination:', JSON.stringify(apiResultEmptyFilter.pagination));

  await mongoose.disconnect();
}

main().catch(console.error);
