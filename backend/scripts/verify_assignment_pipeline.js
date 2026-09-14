const mongoose = require('mongoose');
const { Assignment } = require('../src/models/Assignment');
const { Prediction } = require('../src/models/Prediction');
const { Officer } = require('../src/models/Officer');
const { VerificationCandidate } = require('../src/models/VerificationCandidate');
const { PredictionCycle } = require('../src/models/PredictionCycle');

async function verify() {
  await mongoose.connect('mongodb://127.0.0.1:27017/civic_forecasting');

  const TARGET_CYCLE_ID = 'CYCLE-2026-09-14-1789376320059';
  const cycle = await PredictionCycle.findOne({ cycleId: TARGET_CYCLE_ID });

  const predictionsCount = await Prediction.countDocuments({ predictionCycleId: cycle._id });
  const vcs = await VerificationCandidate.find({ predictionCycleId: cycle._id }).lean();
  const vcsWithOfficer = vcs.filter((v) => v.assignedOfficer);
  const vcsWithAssignment = vcs.filter((v) => v.assignedAssignment);

  const assignments = await Assignment.find()
    .populate('officerId', 'officerId name department currentWorkload maxAssignments active availability')
    .populate('predictionId', 'predictionId complaintType riskLevel riskScore probability communityArea ward location')
    .lean();

  console.log('=== PHASE 9: VERIFICATION METRICS ===');
  console.log('Predictions in cycle:', predictionsCount);
  console.log('Verification Candidates in cycle:', vcs.length);
  console.log('Candidates with assignedOfficer:', vcsWithOfficer.length);
  console.log('Candidates with assignedAssignment:', vcsWithAssignment.length);
  console.log('Total Assignments in database:', assignments.length);

  // Checks
  let missingPrediction = 0;
  let missingOfficer = 0;
  let duplicateCount = 0;
  let deptMismatches = 0;
  let invalidDistances = 0;
  let fallbackDistances = 0;
  let overCapacityCount = 0;

  const seenPredictionIds = new Set();

  for (const asgn of assignments) {
    if (!asgn.predictionId) missingPrediction++;
    if (!asgn.officerId) missingOfficer++;

    const predIdStr = asgn.predictionId?._id ? asgn.predictionId._id.toString() : asgn.predictionId?.toString();
    if (seenPredictionIds.has(predIdStr)) {
      duplicateCount++;
    } else if (predIdStr) {
      seenPredictionIds.add(predIdStr);
    }

    if (asgn.predictionId && asgn.officerId) {
      const predDept = (asgn.department || asgn.predictionId.department || '').toLowerCase().trim();
      const offDept = (asgn.officerId.department || '').toLowerCase().trim();
      if (predDept !== offDept) {
        deptMismatches++;
      }
    }

    if (typeof asgn.distanceKm !== 'number' || asgn.distanceKm < 0) {
      invalidDistances++;
    }
    if (asgn.distanceKm >= 100) {
      fallbackDistances++;
    }

    if (asgn.officerId && (asgn.officerId.currentWorkload > asgn.officerId.maxAssignments)) {
      overCapacityCount++;
    }
  }

  console.log('\n--- DATA INTEGRITY CHECKS ---');
  console.log('Assignments without prediction:', missingPrediction);
  console.log('Assignments without officer:', missingOfficer);
  console.log('Duplicate assignments:', duplicateCount);
  console.log('Department mismatches:', deptMismatches);
  console.log('Invalid distances (<0):', invalidDistances);
  console.log('100 km fallback distances:', fallbackDistances);
  console.log('Officers over capacity:', overCapacityCount);

  console.log('\n=== PHASE 10: SAMPLE ASSIGNMENTS (10 Records) ===');
  console.table(
    assignments.slice(0, 10).map((a) => ({
      Assignment_ID: a.assignmentId,
      Prediction_ID: a.predictionId?.predictionId || 'N/A',
      Officer_ID: a.officerId?.officerId || 'N/A',
      Officer_Name: a.officerId?.name || 'N/A',
      Community_Area: a.predictionId?.communityArea || 'N/A',
      Complaint_Type: a.predictionId?.complaintType || 'N/A',
      Risk_Level: a.predictionId?.riskLevel || 'N/A',
      Department: a.department,
      Distance_Km: a.distanceKm,
      Workload: `${a.officerId?.currentWorkload || 0}/${a.officerId?.maxAssignments || 0}`,
      Score: a.assignmentScore,
      Status: a.status,
      Assigned_At: a.assignedAt ? new Date(a.assignedAt).toISOString() : 'N/A',
    }))
  );

  console.log('\n=== PHASE 11: ASSIGNED OFFICERS VALIDATION (All 21 Distinct Officers) ===');
  const distinctOfficersMap = new Map();
  for (const asgn of assignments) {
    const off = asgn.officerId;
    if (off && !distinctOfficersMap.has(off.officerId)) {
      distinctOfficersMap.set(off.officerId, {
        id: off.officerId,
        name: off.name,
        department: off.department,
        workload: off.currentWorkload,
        maxAssignments: off.maxAssignments,
        active: off.active,
        availability: off.availability,
        withinCapacity: off.currentWorkload <= off.maxAssignments,
      });
    }
  }

  console.table(Array.from(distinctOfficersMap.values()));

  await mongoose.disconnect();
}

verify().catch(console.error);
