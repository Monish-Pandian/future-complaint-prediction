const mongoose = require('mongoose');
const { PredictionCycle } = require('../src/models/PredictionCycle');
const { VerificationCandidate, VERIFICATION_CANDIDATE_STATUS } = require('../src/models/VerificationCandidate');
const { Officer, AVAILABILITY_STATUS } = require('../src/models/Officer');
const { Prediction, VERIFICATION_STATUS } = require('../src/models/Prediction');
const { Assignment, ASSIGNMENT_STATUS } = require('../src/models/Assignment');
const { CommunityAreaCentroid } = require('../src/models/CommunityAreaCentroid');
const { haversine, getRequiredDepartment } = require('../src/utils/assignmentUtils');

async function main() {
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/civic_forecasting';
  await mongoose.connect(MONGO_URI);
  console.log(`Connected to MongoDB: ${MONGO_URI}`);

  const TARGET_CYCLE_ID = 'CYCLE-2026-09-14-1789376320059';

  // 1. Locate Target Prediction Cycle
  const cycle = await PredictionCycle.findOne({ cycleId: TARGET_CYCLE_ID });
  if (!cycle) {
    console.error(`Prediction cycle '${TARGET_CYCLE_ID}' not found!`);
    await mongoose.disconnect();
    process.exit(1);
  }

  // 2. Fetch candidates
  const candidates = await VerificationCandidate.find({ predictionCycleId: cycle._id })
    .populate('predictionId', 'predictionId complaintType probability riskScore riskLevel communityArea ward department location')
    .sort({ selectionRank: 1 })
    .lean();

  const candidatesWithOfficer = candidates.filter((c) => c.assignedOfficer);
  const existingAssignments = await Assignment.find({
    predictionId: { $in: candidates.map((c) => c.predictionId?._id || c.predictionId) },
  }).lean();

  const missingAssignmentsCount = candidatesWithOfficer.length - existingAssignments.length;

  console.log('Candidates found:', candidates.length);
  console.log('Candidates with assignedOfficer:', candidatesWithOfficer.length);
  console.log('Existing assignments:', existingAssignments.length);
  console.log('Missing assignments:', missingAssignmentsCount);

  if (missingAssignmentsCount === 0) {
    console.log('All candidates already have assignments. Nothing to backfill.');
    await mongoose.disconnect();
    return;
  }

  // 3. Load centroids and officers for distance & score calculations
  const centroids = await CommunityAreaCentroid.find({}).lean();
  const centroidMap = new Map();
  for (const c of centroids) {
    centroidMap.set(c.communityArea, { lat: c.latitude, lon: c.longitude });
  }

  const officerIds = candidatesWithOfficer.map((c) => c.assignedOfficer);
  const officers = await Officer.find({ _id: { $in: officerIds } }).lean();
  const officerMap = new Map(officers.map((o) => [o._id.toString(), o]));

  console.log('\n--- EXECUTING SAFE NON-DESTRUCTIVE BACKFILL ---');
  let createdCount = 0;

  for (const candidate of candidatesWithOfficer) {
    const predDocId = candidate.predictionId?._id || candidate.predictionId;

    // Check if assignment already exists for this prediction
    const existing = await Assignment.findOne({ predictionId: predDocId });
    if (existing) {
      // Ensure candidate has link
      if (!candidate.assignedAssignment) {
        await VerificationCandidate.findByIdAndUpdate(candidate._id, {
          $set: { assignedAssignment: existing._id },
        });
      }
      continue;
    }

    const officer = officerMap.get(candidate.assignedOfficer.toString());
    if (!officer) {
      console.warn(`Officer ${candidate.assignedOfficer} not found for candidate ${candidate.candidateId}`);
      continue;
    }

    // Compute Haversine distance from officer home area centroid / officer coords to candidate community area centroid
    let distanceKm = 1.5;
    const candCoords = centroidMap.get(candidate.communityArea);
    let offCoords = null;

    if (officer.homeCommunityArea && centroidMap.has(officer.homeCommunityArea)) {
      offCoords = centroidMap.get(officer.homeCommunityArea);
    } else if (officer.location?.coordinates && officer.location.coordinates.length === 2) {
      offCoords = { lat: officer.location.coordinates[1], lon: officer.location.coordinates[0] };
    }

    if (offCoords && candCoords) {
      distanceKm = Math.round(haversine(offCoords.lat, offCoords.lon, candCoords.lat, candCoords.lon) * 100) / 100;
    }

    const estimatedTravelMinutes = Math.max(5, Math.round((distanceKm / 30) * 60));
    const isDeptMatch = (officer.department || '').trim().toLowerCase() === (candidate.department || '').trim().toLowerCase();

    // Composite score based on risk (0.4), distance (0.3), workload (0.3)
    const riskScore = candidate.riskScore || (candidate.probability ? candidate.probability * 100 : 50);
    const assignmentScore = Math.round((0.4 * (riskScore / 100) + 0.3 * Math.max(0, 1 - distanceKm / 50) + 0.3 * Math.max(0, 1 - (officer.currentWorkload || 0) / (officer.maxAssignments || 10))) * 1000) / 1000;

    const assignmentId = `ASGN-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const assignment = await Assignment.create({
      assignmentId,
      predictionId: predDocId,
      officerId: officer._id,
      department: candidate.department,
      distanceKm,
      estimatedTravelMinutes,
      currentWorkload: officer.currentWorkload || 0,
      availability: officer.availability || 'AVAILABLE',
      departmentMatch: isDeptMatch,
      assignmentScore,
      status: ASSIGNMENT_STATUS.AI_ASSIGNED,
      assignedAt: candidate.assignedAt || new Date(),
      reasoning: `Automated heuristic dispatch allocation based on capacity (${officer.currentWorkload}/${officer.maxAssignments}) and proximity (${distanceKm} km).`,
    });

    // Link VerificationCandidate to the newly created Assignment
    await VerificationCandidate.findByIdAndUpdate(candidate._id, {
      $set: {
        assignedAssignment: assignment._id,
        status: VERIFICATION_CANDIDATE_STATUS.ASSIGNED,
      },
    });

    // Ensure Prediction verificationStatus is ASSIGNED
    await Prediction.findByIdAndUpdate(predDocId, {
      $set: {
        assignedOfficer: officer._id,
        assignedOfficerId: officer._id,
        verificationStatus: VERIFICATION_STATUS.ASSIGNED,
      },
    });

    createdCount++;
    console.log(`Created Assignment [${assignmentId}] -> Candidate [${candidate.candidateId}], Officer [${officer.officerId}] ${officer.name}, Distance: ${distanceKm} km`);
  }

  console.log(`\nBackfill Completed Successfully! Created ${createdCount} Assignment documents.`);

  // Verify final count
  const totalAssignments = await Assignment.countDocuments();
  console.log(`Total assignments now in civic_forecasting.assignments: ${totalAssignments}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Backfill error:', err);
  process.exit(1);
});
