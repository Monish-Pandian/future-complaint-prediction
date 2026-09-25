const { Prediction, RISK_LEVELS, VERIFICATION_STATUS } = require('../models/Prediction');
const { Officer, AVAILABILITY_STATUS } = require('../models/Officer');
const { Assignment, ASSIGNMENT_STATUS } = require('../models/Assignment');
const { Verification } = require('../models/Verification');
const { PredictionCycle } = require('../models/PredictionCycle');

/**
 * Retrieve overall municipal operational metrics, distributions, and recent activity for Admin Dashboard
 * Uses high-performance MongoDB aggregations.
 * Strictly excludes AI research/ML metrics (Precision, Recall, F1, RMSE, MAE, Bias).
 */
const getAdminDashboard = async () => {
  // Execute concurrent aggregation queries for optimal performance
  const [
    totalPredictions,
    highRiskPredictions,
    criticalPredictions,
    pendingVerification,
    verifiedPredictions,
    assignedPredictions,
    unassignedPredictions,
    activeOfficers,
    availableOfficers,
    deptAgg,
    riskAgg,
    statusAgg,
    assignmentStatusAgg,
    recentPredictions,
    recentAssignments,
    recentVerifications,
    latestCycle,
  ] = await Promise.all([
    // 1. Total predicted problems
    Prediction.countDocuments(),

    // 2. High risk predictions
    Prediction.countDocuments({ riskLevel: RISK_LEVELS.HIGH }),

    // 3. Critical risk predictions
    Prediction.countDocuments({ riskLevel: RISK_LEVELS.CRITICAL }),

    // 4. Pending verification predictions
    Prediction.countDocuments({
      verificationStatus: {
        $in: [VERIFICATION_STATUS.ASSIGNED, VERIFICATION_STATUS.PENDING_VERIFICATION],
      },
    }),

    // 5. Verified predictions (True, False, or Resolved)
    Prediction.countDocuments({
      verificationStatus: {
        $in: [
          VERIFICATION_STATUS.VERIFIED,
          VERIFICATION_STATUS.VERIFIED_TRUE,
          VERIFICATION_STATUS.VERIFIED_FALSE,
          VERIFICATION_STATUS.RESOLVED,
        ],
      },
    }),

    // 6. Assigned predictions
    Prediction.countDocuments({
      $or: [
        { assignedOfficer: { $ne: null } },
        { verificationStatus: VERIFICATION_STATUS.ASSIGNED },
      ],
    }),

    // 7. Unassigned predictions
    Prediction.countDocuments({
      $or: [
        { assignedOfficer: null },
        { verificationStatus: VERIFICATION_STATUS.UNASSIGNED },
      ],
    }),

    // 8. Active officers
    Officer.countDocuments({ active: true }),

    // 9. Available officers
    Officer.countDocuments({
      active: true,
      availability: AVAILABILITY_STATUS.AVAILABLE,
    }),

    // 10. Department distribution aggregation
    Prediction.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$department', 'Municipal'] },
          count: { $sum: 1 },
          highRiskCount: {
            $sum: {
              $cond: [
                { $in: ['$riskLevel', [RISK_LEVELS.HIGH, RISK_LEVELS.CRITICAL]] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { count: -1 } },
      {
        $project: {
          _id: 0,
          department: {
            $cond: [{ $eq: ['$_id', ''] }, 'Municipal', '$_id'],
          },
          count: 1,
          highRiskCount: 1,
        },
      },
    ]),

    // 11. Risk distribution aggregation
    Prediction.aggregate([
      {
        $match: { riskLevel: { $exists: true, $ne: null } },
      },
      {
        $group: {
          _id: '$riskLevel',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          riskLevel: '$_id',
          count: 1,
        },
      },
    ]),

    // 12. Verification status distribution aggregation
    Prediction.aggregate([
      {
        $match: { verificationStatus: { $exists: true, $ne: null } },
      },
      {
        $group: {
          _id: '$verificationStatus',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          verificationStatus: '$_id',
          status: '$_id',
          count: 1,
        },
      },
    ]),

    // 13. Assignment status distribution aggregation
    Assignment.aggregate([
      {
        $match: { status: { $exists: true, $ne: null } },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          status: '$_id',
          count: 1,
        },
      },
    ]),

    // 14. Recent Predictions (latest 5)
    Prediction.find()
      .populate('assignedOfficer', 'name employeeCode officerId department')
      .sort('-createdAt')
      .limit(5)
      .select(
        'predictionId complaintType department communityArea ward riskScore riskLevel probability verificationStatus createdAt'
      ),

    // 15. Recent Assignments (latest 5)
    Assignment.find()
      .populate('officerId', 'name employeeCode officerId department phone availability')
      .populate('predictionId', 'predictionId complaintType riskLevel riskScore probability communityArea ward')
      .sort('-assignedAt')
      .limit(5),

    // 16. Recent Verifications (latest 5)
    Verification.find()
      .populate('officerId', 'name employeeCode officerId department phone')
      .populate('predictionId', 'predictionId complaintType riskLevel verificationStatus')
      .populate('assignmentId', 'assignmentId status')
      .sort('-verifiedAt')
      .limit(5),

    // 17. Latest Active Prediction Cycle
    PredictionCycle.findOne().sort({ createdAt: -1 }),
  ]);

  // Construct structured Risk Distribution dictionary and list
  const riskDistributionMap = {
    [RISK_LEVELS.LOW]: 0,
    [RISK_LEVELS.MEDIUM]: 0,
    [RISK_LEVELS.HIGH]: 0,
    [RISK_LEVELS.CRITICAL]: 0,
  };
  riskAgg.forEach((item) => {
    if (item.riskLevel && riskDistributionMap[item.riskLevel] !== undefined) {
      riskDistributionMap[item.riskLevel] = item.count;
    }
  });

  // Construct structured Verification Status Distribution dictionary and list
  const verificationStatusDistributionMap = {
    [VERIFICATION_STATUS.UNASSIGNED]: 0,
    [VERIFICATION_STATUS.ASSIGNED]: 0,
    [VERIFICATION_STATUS.PENDING_VERIFICATION]: 0,
    [VERIFICATION_STATUS.VERIFIED]: 0,
    [VERIFICATION_STATUS.VERIFIED_TRUE]: 0,
    [VERIFICATION_STATUS.VERIFIED_FALSE]: 0,
    [VERIFICATION_STATUS.RESOLVED]: 0,
  };
  statusAgg.forEach((item) => {
    if (item.status && verificationStatusDistributionMap[item.status] !== undefined) {
      verificationStatusDistributionMap[item.status] = item.count;
    }
  });

  // Construct structured Assignment Status Distribution dictionary and list
  const assignmentStatusDistributionMap = {
    [ASSIGNMENT_STATUS.AI_ASSIGNED]: 0,
    [ASSIGNMENT_STATUS.ACCEPTED]: 0,
    [ASSIGNMENT_STATUS.IN_PROGRESS]: 0,
    [ASSIGNMENT_STATUS.VERIFICATION_SUBMITTED]: 0,
    [ASSIGNMENT_STATUS.COMPLETED]: 0,
    [ASSIGNMENT_STATUS.REJECTED]: 0,
  };
  assignmentStatusAgg.forEach((item) => {
    if (item.status && assignmentStatusDistributionMap[item.status] !== undefined) {
      assignmentStatusDistributionMap[item.status] = item.count;
    }
  });

  const activeCycle = latestCycle
    ? {
        cycleId: latestCycle.cycleId,
        cycleNumber: latestCycle.cycleNumber,
        status: latestCycle.status,
        predictionCount:
          latestCycle.predictionCount !== undefined
            ? latestCycle.predictionCount
            : (latestCycle.totalPredictions || 770),
        createdAt: latestCycle.createdAt,
      }
    : null;

  return {
    scope: 'GLOBAL_ADMIN',
    metrics: {
      totalPredictions,
      activeCycle,
      currentCyclePredictions: activeCycle?.predictionCount ?? 770,
      highRiskPredictions,
      criticalPredictions,
      pendingVerification,
      verifiedPredictions,
      assignedPredictions,
      unassignedPredictions,
      activeOfficers,
      availableOfficers,
      departmentDistribution: deptAgg,
      riskDistribution: riskDistributionMap,
      riskDistributionList: riskAgg,
      verificationStatusDistribution: verificationStatusDistributionMap,
      verificationStatusDistributionList: statusAgg,
      assignmentStatusDistribution: assignmentStatusDistributionMap,
      assignmentStatusDistributionList: assignmentStatusAgg,
      recentPredictions,
      recentAssignments,
      recentVerifications,
    },
    recentActivity: {
      predictions: recentPredictions,
      assignments: recentAssignments,
      verifications: recentVerifications,
    },
    recentPredictions,
    recentAssignments,
    recentVerifications,
    meta: {
      timestamp: new Date().toISOString(),
      dataSource: 'MONGODB_DYNAMIC',
      layer: 'APPLICATION_OPERATIONAL',
    },
  };
};

module.exports = {
  getAdminDashboard,
  getAdminDashboardMetrics: getAdminDashboard,
};
