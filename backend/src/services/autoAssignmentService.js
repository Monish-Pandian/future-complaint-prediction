const mongoose = require('mongoose');
const { VerificationCandidate, VERIFICATION_CANDIDATE_STATUS } = require('../models/VerificationCandidate');
const { Officer, AVAILABILITY_STATUS } = require('../models/Officer');
const { PredictionCycle, CYCLE_STATUS } = require('../models/PredictionCycle');
const { CommunityAreaCentroid } = require('../models/CommunityAreaCentroid');
const { Prediction } = require('../models/Prediction');
const { Assignment, ASSIGNMENT_STATUS } = require('../models/Assignment');
const {
  getRequiredDepartment,
  computeDistanceMatrix,
  findEligibleOfficersForCandidate,
  selectBestOfficer,
} = require('../utils/assignmentUtils');
const ApiError = require('../utils/apiError');

const ASSIGNMENT_POLICY = 'RISK_DISTANCE_WORKLOAD_ASSIGNMENT';
const ASSIGNMENT_WEIGHTS = { risk: 0.4, distance: 0.3, workload: 0.3 };

const UNASSIGNED_REASONS = {
  NO_COMPATIBLE_DEPT: 'no_compatible_dept',
  NO_AVAILABLE_OFFICER: 'no_available_officer',
  ALL_AT_CAPACITY: 'all_at_capacity',
  NO_ELIGIBLE_OFFICER: 'no_eligible_officer',
};

async function autoAssignCandidates(predictionCycleId, options = {}) {
  const { assignAllEligible = true } = options;

  const cycle = await PredictionCycle.findOne({ cycleId: predictionCycleId });
  if (!cycle) {
    throw new ApiError(404, `Prediction cycle not found with ID '${predictionCycleId}'`);
  }

  if (cycle.status !== CYCLE_STATUS.COMPLETED) {
    throw new ApiError(400, `Prediction cycle must be COMPLETED. Current status: ${cycle.status}`);
  }

  const unassignedCandidates = await VerificationCandidate.find({
    predictionCycleId: cycle._id,
    status: VERIFICATION_CANDIDATE_STATUS.PENDING_ASSIGNMENT,
  })
    .populate('predictionId', 'predictionId complaintType probability riskScore riskLevel communityArea ward department location')
    .sort({ weekStart: 1, selectionRank: 1 })
    .lean();

  if (unassignedCandidates.length === 0) {
    return {
      cycle: { _id: cycle._id, cycleId: cycle.cycleId },
      totalCandidates: 0,
      assignedCount: 0,
      unassignedCount: 0,
      officersUsed: 0,
      assignmentPolicy: ASSIGNMENT_POLICY,
      assignments: [],
      unassigned: [],
      message: 'No unassigned candidates found for this cycle',
    };
  }

  const officers = await Officer.find({
    active: true,
    availability: { $in: [AVAILABILITY_STATUS.AVAILABLE, AVAILABILITY_STATUS.BUSY] },
  }).lean();

  if (officers.length === 0) {
    return {
      cycle: { _id: cycle._id, cycleId: cycle.cycleId },
      totalCandidates: unassignedCandidates.length,
      assignedCount: 0,
      unassignedCount: unassignedCandidates.length,
      officersUsed: 0,
      assignmentPolicy: ASSIGNMENT_POLICY,
      assignments: [],
      unassigned: unassignedCandidates.map((c) => ({
        candidateId: c._id,
        candidateIdStr: c.candidateId,
        communityArea: c.communityArea,
        srType: c.srType,
        reason: UNASSIGNED_REASONS.NO_AVAILABLE_OFFICER,
      })),
      message: 'No active officers available for assignment',
    };
  }

  const centroids = await CommunityAreaCentroid.find({}).lean();
  if (centroids.length === 0) {
    throw new ApiError(500, 'Community area centroids not found. Cannot compute distances.');
  }

  const distances = computeDistanceMatrix(officers, centroids);

  const srTypeToDeptMap = new Map();
  for (const candidate of unassignedCandidates) {
    if (!srTypeToDeptMap.has(candidate.srType)) {
      srTypeToDeptMap.set(candidate.srType, getRequiredDepartment(candidate.srType));
    }
  }

  const officerWorkloadMap = new Map();
  for (const officer of officers) {
    officerWorkloadMap.set(officer._id.toString(), officer.currentWorkload || 0);
  }

  const assignments = [];
  const unassigned = [];
  const officersUsed = new Set();

  for (const candidate of unassignedCandidates) {
    const requiredDept = srTypeToDeptMap.get(candidate.srType) || '';

    const eligible = findEligibleOfficersForCandidate(officers, candidate, srTypeToDeptMap);

    if (eligible.length === 0) {
      let reason = UNASSIGNED_REASONS.NO_ELIGIBLE_OFFICER;
      const deptOfficers = officers.filter(
        (o) => (o.department || '').trim().toLowerCase() === requiredDept.trim().toLowerCase()
      );
      if (deptOfficers.length === 0) {
        reason = UNASSIGNED_REASONS.NO_COMPATIBLE_DEPT;
      } else if (!deptOfficers.some((o) => o.availability === AVAILABILITY_STATUS.AVAILABLE || o.availability === AVAILABILITY_STATUS.BUSY)) {
        reason = UNASSIGNED_REASONS.NO_AVAILABLE_OFFICER;
      } else if (!deptOfficers.some((o) => (o.currentWorkload || 0) < (o.maxAssignments || 5))) {
        reason = UNASSIGNED_REASONS.ALL_AT_CAPACITY;
      }

      unassigned.push({
        candidateId: candidate._id,
        candidateIdStr: candidate.candidateId,
        communityArea: candidate.communityArea,
        srType: candidate.srType,
        reason,
      });
      continue;
    }

    const selection = selectBestOfficer(eligible, candidate, distances, ASSIGNMENT_WEIGHTS);

    if (!selection) {
      unassigned.push({
        candidateId: candidate._id,
        candidateIdStr: candidate.candidateId,
        communityArea: candidate.communityArea,
        srType: candidate.srType,
        reason: UNASSIGNED_REASONS.NO_ELIGIBLE_OFFICER,
      });
      continue;
    }

    const { officer, distanceKm, score } = selection;
    const workloadBefore = officerWorkloadMap.get(officer._id.toString()) || 0;
    const workloadAfter = workloadBefore + 1;

    officerWorkloadMap.set(officer._id.toString(), workloadAfter);
    officersUsed.add(officer._id.toString());

    // Update VerificationCandidate
    await VerificationCandidate.findByIdAndUpdate(candidate._id, {
      $set: {
        assignedOfficer: officer._id,
        assignedAt: new Date(),
        status: VERIFICATION_CANDIDATE_STATUS.ASSIGNED,
      },
    });

    // Update Prediction with assigned officer
    await Prediction.findByIdAndUpdate(candidate.predictionId, {
      $set: {
        assignedOfficer: officer._id,
        assignedOfficerId: officer._id,
        verificationStatus: 'ASSIGNED',
      },
    });

    // Create Assignment record
    const assignmentId = `ASGN-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    await Assignment.create({
      assignmentId,
      predictionId: candidate.predictionId,
      officerId: officer._id,
      department: candidate.department,
      distanceKm: Math.round(distanceKm * 100) / 100,
      estimatedTravelMinutes: Math.round((distanceKm / 30) * 60), // Assume 30 km/h average speed
      currentWorkload: workloadBefore,
      availability: officer.availability,
      departmentMatch: true,
      assignmentScore: Math.round(score * 1000) / 1000,
      status: ASSIGNMENT_STATUS.AI_ASSIGNED,
      assignedAt: new Date(),
      reasoning: 'Automated heuristic decision engine assignment',
    });

    await Officer.findByIdAndUpdate(officer._id, {
      $set: { currentWorkload: workloadAfter },
    });

    assignments.push({
      candidateId: candidate._id,
      candidateIdStr: candidate.candidateId,
      communityArea: candidate.communityArea,
      srType: candidate.srType,
      officerId: officer._id,
      officerIdStr: officer.officerId,
      officerDepartment: officer.department,
      distanceKm: Math.round(distanceKm * 100) / 100,
      workloadBefore,
      workloadAfter,
      assignmentScore: Math.round(score * 1000) / 1000,
      departmentCompatible: true,
    });
  }

  return {
    cycle: { _id: cycle._id, cycleId: cycle.cycleId },
    totalCandidates: unassignedCandidates.length,
    assignedCount: assignments.length,
    unassignedCount: unassigned.length,
    officersUsed: officersUsed.size,
    assignmentPolicy: ASSIGNMENT_POLICY,
    assignments,
    unassigned,
    message: `Assigned ${assignments.length} of ${unassignedCandidates.length} candidates to ${officersUsed.size} officers`,
  };
}

async function getAssignmentPreview(predictionCycleId) {
  const cycle = await PredictionCycle.findOne({ cycleId: predictionCycleId });
  if (!cycle) {
    throw new ApiError(404, `Prediction cycle not found with ID '${predictionCycleId}'`);
  }

  const unassignedCandidates = await VerificationCandidate.find({
    predictionCycleId: cycle._id,
    status: VERIFICATION_CANDIDATE_STATUS.PENDING_ASSIGNMENT,
  })
    .populate('predictionId', 'predictionId complaintType probability riskScore riskLevel communityArea ward department location')
    .sort({ weekStart: 1, selectionRank: 1 })
    .lean();

  const officers = await Officer.find({
    active: true,
    availability: { $in: [AVAILABILITY_STATUS.AVAILABLE, AVAILABILITY_STATUS.BUSY] },
  }).lean();

  const centroids = await CommunityAreaCentroid.find({}).lean();

  const srTypeToDeptMap = new Map();
  for (const candidate of unassignedCandidates) {
    if (!srTypeToDeptMap.has(candidate.srType)) {
      srTypeToDeptMap.set(candidate.srType, getRequiredDepartment(candidate.srType));
    }
  }

  const distances = computeDistanceMatrix(officers, centroids);

  const preview = [];
  for (const candidate of unassignedCandidates) {
    const requiredDept = srTypeToDeptMap.get(candidate.srType) || '';
    const eligible = findEligibleOfficersForCandidate(officers, candidate, srTypeToDeptMap);

    if (eligible.length === 0) {
      let reason = UNASSIGNED_REASONS.NO_ELIGIBLE_OFFICER;
      const deptOfficers = officers.filter(
        (o) => (o.department || '').trim().toLowerCase() === requiredDept.trim().toLowerCase()
      );
      if (deptOfficers.length === 0) reason = UNASSIGNED_REASONS.NO_COMPATIBLE_DEPT;
      else if (!deptOfficers.some((o) => o.availability === AVAILABILITY_STATUS.AVAILABLE || o.availability === AVAILABILITY_STATUS.BUSY)) reason = UNASSIGNED_REASONS.NO_AVAILABLE_OFFICER;
      else if (!deptOfficers.some((o) => (o.currentWorkload || 0) < (o.maxAssignments || 5))) reason = UNASSIGNED_REASONS.ALL_AT_CAPACITY;

      preview.push({
        candidate: {
          candidateId: candidate._id,
          candidateIdStr: candidate.candidateId,
          communityArea: candidate.communityArea,
          srType: candidate.srType,
          probability: candidate.probability,
          requiredDepartment: requiredDept,
        },
        eligibleOfficers: 0,
        wouldAssign: false,
        unassignedReason: reason,
      });
      continue;
    }

    const selection = selectBestOfficer(eligible, candidate, distances, ASSIGNMENT_WEIGHTS);

    preview.push({
      candidate: {
        candidateId: candidate._id,
        candidateIdStr: candidate.candidateId,
        communityArea: candidate.communityArea,
        srType: candidate.srType,
        probability: candidate.probability,
        requiredDepartment: requiredDept,
      },
      eligibleOfficers: eligible.length,
      wouldAssign: true,
      bestOfficer: selection
        ? {
            officerId: selection.officer._id,
            officerIdStr: selection.officer.officerId,
            department: selection.officer.department,
            distanceKm: Math.round(selection.distanceKm * 100) / 100,
            currentWorkload: selection.officer.currentWorkload,
            maxAssignments: selection.officer.maxAssignments,
            assignmentScore: Math.round(selection.score * 1000) / 1000,
          }
        : null,
    });
  }

  return {
    cycle: { _id: cycle._id, cycleId: cycle.cycleId },
    totalCandidates: unassignedCandidates.length,
    assignmentPolicy: ASSIGNMENT_POLICY,
    preview,
  };
}

module.exports = {
  autoAssignCandidates,
  getAssignmentPreview,
  ASSIGNMENT_POLICY,
  ASSIGNMENT_WEIGHTS,
  UNASSIGNED_REASONS,
};