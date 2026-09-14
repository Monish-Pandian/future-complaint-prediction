const verificationSelectionService = require('../services/verificationSelectionService');
const autoAssignmentService = require('../services/autoAssignmentService');
const { validatePagination, validateSort } = require('../utils/sanitizer');
const { sendSuccess } = require('../utils/responseHandler');
const ApiError = require('../utils/apiError');

/**
 * Admin: Trigger verification candidate selection for a completed prediction cycle
 * @route POST /api/v1/admin/verifications/select
 */
const selectCandidates = async (req, res, next) => {
  try {
    const { predictionCycleId, budgetPct } = req.body;

    if (!predictionCycleId) {
      throw new ApiError(400, 'predictionCycleId is required');
    }

    if (budgetPct === undefined || budgetPct === null) {
      throw new ApiError(400, 'budgetPct is required');
    }

    if (typeof budgetPct !== 'number' || budgetPct <= 0 || budgetPct > 1) {
      throw new ApiError(400, 'budgetPct must be a number between 0 and 1 (e.g., 0.05 for 5%)');
    }

    const result = await verificationSelectionService.selectVerificationCandidates(
      predictionCycleId,
      budgetPct,
      { randomSeed: req.body.randomSeed }
    );

    return sendSuccess(res, 201, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get verification candidates for a prediction cycle
 * @route GET /api/v1/admin/verifications/candidates
 */
const getCandidates = async (req, res, next) => {
  try {
    const { predictionCycleId } = req.query;

    if (!predictionCycleId) {
      throw new ApiError(400, 'predictionCycleId is required');
    }

    const result = await verificationSelectionService.getVerificationCandidates(predictionCycleId, req.query);

    return sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get verification selection summary for a prediction cycle
 * @route GET /api/v1/admin/verifications/summary
 */
const getSummary = async (req, res, next) => {
  try {
    const { predictionCycleId } = req.query;

    if (!predictionCycleId) {
      throw new ApiError(400, 'predictionCycleId is required');
    }

    const summary = await verificationSelectionService.getSelectionSummary(predictionCycleId);

    return sendSuccess(res, 200, summary);
  } catch (error) {
    next(error);
  }
};

/**
 * Officer: Get their assigned verification candidates
 * @route GET /api/v1/officer/verifications/candidates
 */
const getOfficerCandidates = async (req, res, next) => {
  try {
    const officerUser = req.user;

    // Officer can only see candidates assigned to them
    const filter = {
      assignedOfficer: officerUser.officerId || officerUser._id,
      status: { $in: ['ASSIGNED', 'VERIFICATION_SUBMITTED'] },
    };

    const { page, limit, skip } = validatePagination(req.query);
    const sortObj = validateSort(req.query, ['selectionRank', 'probability', 'riskScore', 'createdAt'], { selectionRank: 1 });

    const { VerificationCandidate } = require('../models/VerificationCandidate');

    const [candidates, total] = await Promise.all([
      VerificationCandidate.find(filter)
        .populate('predictionId', 'predictionId complaintType probability riskScore riskLevel communityArea ward department location')
        .populate('predictionCycleId', 'cycleId cycleNumber status')
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      VerificationCandidate.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return sendSuccess(res, 200, {
      candidates,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        pages: totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Assign officer to verification candidate(s)
 * @route PATCH /api/v1/admin/verifications/candidates/assign
 */
const assignCandidates = async (req, res, next) => {
  try {
    const { candidateIds, officerId } = req.body;

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      throw new ApiError(400, 'candidateIds array is required');
    }

    if (!officerId) {
      throw new ApiError(400, 'officerId is required');
    }

    // Validate officer exists
    const { Officer } = require('../models/Officer');
    const officer = await Officer.findById(officerId);
    if (!officer) {
      throw new ApiError(404, `Officer not found with ID '${officerId}'`);
    }

    const { VerificationCandidate } = require('../models/VerificationCandidate');
    const { Prediction } = require('../models/Prediction');
    const { Assignment, ASSIGNMENT_STATUS } = require('../models/Assignment');
    const { CommunityAreaCentroid } = require('../models/CommunityAreaCentroid');
    const { haversine } = require('../utils/assignmentUtils');

    const centroids = await CommunityAreaCentroid.find({}).lean();
    const centroidMap = new Map(centroids.map((c) => [c.communityArea, { lat: c.latitude, lon: c.longitude }]));

    const candidates = await VerificationCandidate.find({
      _id: { $in: candidateIds },
      status: 'PENDING_ASSIGNMENT',
    });

    let assignedCount = 0;
    const offCoords =
      officer.homeCommunityArea && centroidMap.has(officer.homeCommunityArea)
        ? centroidMap.get(officer.homeCommunityArea)
        : officer.location?.coordinates
        ? { lat: officer.location.coordinates[1], lon: officer.location.coordinates[0] }
        : null;

    for (const candidate of candidates) {
      const candCoords = centroidMap.get(candidate.communityArea);
      let distanceKm = 1.5;
      if (offCoords && candCoords) {
        distanceKm = haversine(offCoords.lat, offCoords.lon, candCoords.lat, candCoords.lon);
      }

      const predDocId = candidate.predictionId?._id || candidate.predictionId;

      // Idempotent assignment creation
      let assignment = await Assignment.findOne({ predictionId: predDocId });
      if (!assignment) {
        const assignmentId = `ASGN-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
        assignment = await Assignment.create({
          assignmentId,
          predictionId: predDocId,
          officerId: officer._id,
          department: candidate.department || officer.department,
          distanceKm: Math.round(distanceKm * 100) / 100,
          estimatedTravelMinutes: Math.round((distanceKm / 30) * 60),
          currentWorkload: officer.currentWorkload || 0,
          availability: officer.availability,
          departmentMatch: (candidate.department || '').toLowerCase() === (officer.department || '').toLowerCase(),
          assignmentScore: 85,
          status: ASSIGNMENT_STATUS.AI_ASSIGNED,
          assignedAt: new Date(),
          isAdminOverride: true,
          reasoning: `Admin manual assignment to officer ${officer.name} (${officer.officerId})`,
        });

        await Officer.findByIdAndUpdate(officer._id, {
          $inc: { currentWorkload: 1 },
        });
      }

      await VerificationCandidate.findByIdAndUpdate(candidate._id, {
        $set: {
          assignedOfficer: officer._id,
          assignedAssignment: assignment._id,
          assignedAt: new Date(),
          status: 'ASSIGNED',
        },
      });

      await Prediction.findByIdAndUpdate(predDocId, {
        $set: {
          assignedOfficer: officer._id,
          assignedOfficerId: officer._id,
          verificationStatus: 'ASSIGNED',
        },
      });

      assignedCount++;
    }

    return sendSuccess(res, 200, {
      modifiedCount: assignedCount,
      message: `Assigned ${assignedCount} candidates to officer ${officer.officerId}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Unassign officer from verification candidate(s)
 * @route PATCH /api/v1/admin/verifications/candidates/unassign
 */
const unassignCandidates = async (req, res, next) => {
  try {
    const { candidateIds } = req.body;

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      throw new ApiError(400, 'candidateIds array is required');
    }

    const { VerificationCandidate } = require('../models/VerificationCandidate');
    const { Assignment } = require('../models/Assignment');
    const { Officer } = require('../models/Officer');
    const { Prediction } = require('../models/Prediction');

    const candidates = await VerificationCandidate.find({
      _id: { $in: candidateIds },
      status: 'ASSIGNED',
    });

    let unassignedCount = 0;
    for (const candidate of candidates) {
      if (candidate.assignedOfficer) {
        await Officer.findByIdAndUpdate(candidate.assignedOfficer, [
          {
            $set: {
              currentWorkload: {
                $max: [0, { $subtract: ['$currentWorkload', 1] }],
              },
            },
          },
        ]);
      }

      if (candidate.assignedAssignment) {
        await Assignment.findByIdAndDelete(candidate.assignedAssignment);
      } else if (candidate.predictionId) {
        await Assignment.deleteOne({ predictionId: candidate.predictionId });
      }

      if (candidate.predictionId) {
        await Prediction.findByIdAndUpdate(candidate.predictionId, {
          $set: {
            assignedOfficer: null,
            assignedOfficerId: null,
            verificationStatus: 'UNASSIGNED',
          },
        });
      }

      await VerificationCandidate.findByIdAndUpdate(candidate._id, {
        $set: {
          assignedOfficer: null,
          assignedAssignment: null,
          assignedAt: null,
          status: 'PENDING_ASSIGNMENT',
        },
      });

      unassignedCount++;
    }

    return sendSuccess(res, 200, {
      modifiedCount: unassignedCount,
      message: `Unassigned ${unassignedCount} candidates`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Officer: Accept assigned verification candidate
 * @route PATCH /api/v1/officer/verifications/candidates/:id/accept
 */
const acceptCandidate = async (req, res, next) => {
  try {
    const officerUser = req.user;
    const { VerificationCandidate } = require('../models/VerificationCandidate');

    const candidate = await VerificationCandidate.findById(req.params.id);
    if (!candidate) {
      throw new ApiError(404, 'Verification candidate not found');
    }

    // Check ownership
    const officerDoc = await require('../models/Officer').findOne({
      $or: [{ userId: officerUser._id }, { officerId: officerUser.officerId }],
    });

    if (!officerDoc || !candidate.assignedOfficer || candidate.assignedOfficer.toString() !== officerDoc._id.toString()) {
      throw new ApiError(403, 'Forbidden: You are not authorized to accept this verification candidate');
    }

    if (candidate.status !== 'ASSIGNED') {
      throw new ApiError(400, `Cannot accept candidate with status '${candidate.status}'`);
    }

    candidate.status = 'VERIFICATION_SUBMITTED';
    await candidate.save();

    return sendSuccess(res, 200, { candidate, message: 'Verification candidate accepted' });
  } catch (error) {
    next(error);
  }
};

/**
 * Officer: Reject assigned verification candidate
 * @route PATCH /api/v1/officer/verifications/candidates/:id/reject
 */
const rejectCandidate = async (req, res, next) => {
  try {
    const officerUser = req.user;
    const { VerificationCandidate } = require('../models/VerificationCandidate');

    const candidate = await VerificationCandidate.findById(req.params.id);
    if (!candidate) {
      throw new ApiError(404, 'Verification candidate not found');
    }

    // Check ownership
    const officerDoc = await require('../models/Officer').findOne({
      $or: [{ userId: officerUser._id }, { officerId: officerUser.officerId }],
    });

    if (!officerDoc || !candidate.assignedOfficer || candidate.assignedOfficer.toString() !== officerDoc._id.toString()) {
      throw new ApiError(403, 'Forbidden: You are not authorized to reject this verification candidate');
    }

    if (candidate.status !== 'ASSIGNED' && candidate.status !== 'VERIFICATION_SUBMITTED') {
      throw new ApiError(400, `Cannot reject candidate with status '${candidate.status}'`);
    }

    candidate.status = 'CANCELLED';
    await candidate.save();

    return sendSuccess(res, 200, { candidate, message: 'Verification candidate rejected' });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get automatic assignment preview for a prediction cycle
 * @route GET /api/v1/admin/verifications/assign-auto/preview
 */
const getAssignmentPreview = async (req, res, next) => {
  try {
    const { predictionCycleId } = req.query;

    if (!predictionCycleId) {
      throw new ApiError(400, 'predictionCycleId is required');
    }

    const preview = await autoAssignmentService.getAssignmentPreview(predictionCycleId);

    return sendSuccess(res, 200, preview);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Automatically assign verification candidates to officers using research logic
 * @route POST /api/v1/admin/verifications/assign-auto
 */
const autoAssignCandidates = async (req, res, next) => {
  try {
    const { predictionCycleId, options } = req.body;

    if (!predictionCycleId) {
      throw new ApiError(400, 'predictionCycleId is required');
    }

    const result = await autoAssignmentService.autoAssignCandidates(predictionCycleId, options || {});

    return sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  selectCandidates,
  getCandidates,
  getSummary,
  getOfficerCandidates,
  assignCandidates,
  unassignCandidates,
  acceptCandidate,
  rejectCandidate,
  getAssignmentPreview,
  autoAssignCandidates,
};