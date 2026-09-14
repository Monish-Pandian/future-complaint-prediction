import axiosInstance from './axiosInstance';
import { verificationFilterOptions } from '../data/verificationMockData';

/**
 * Normalize UI filter values for backend API requests.
 * Strips out human-readable placeholder labels like "All outcomes", "All severities", etc.
 *
 * @param {string|number|null|undefined} value - Raw UI filter value
 * @returns {string|number|undefined} Sanitized parameter value or undefined if omitted
 */
function normalizeFilter(value) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (/^all\s+/i.test(trimmed) || trimmed.toLowerCase() === 'all') {
      return undefined;
    }
    return trimmed;
  }
  return value;
}

/**
 * Build clean query parameters object omitting any undefined or empty values
 *
 * @param {Object} params - Raw parameters from component state
 * @returns {Object} Cleaned query parameters object
 */
function buildVerificationQueryParams(params = {}) {
  const cleanOutcome = normalizeFilter(params.outcome || params.verificationStatus);
  const cleanSeverity = normalizeFilter(params.severity || params.riskLevel);
  const cleanSearch = params.search?.trim() || undefined;

  const candidate = {
    search: cleanSearch,
    outcome: cleanOutcome,
    severity: cleanSeverity,
    officerId: normalizeFilter(params.officerId),
    predictionId: normalizeFilter(params.predictionId),
    sortBy: params.sortBy || 'verifiedAt',
    sortOrder: params.sortOrder || 'desc',
    page: params.page !== undefined ? Number(params.page) : 1,
    limit: params.limit !== undefined ? Number(params.limit) : 10,
  };

  const cleanParams = {};
  for (const [key, val] of Object.entries(candidate)) {
    if (val !== undefined && val !== null && val !== '') {
      cleanParams[key] = val;
    }
  }

  return cleanParams;
}

/**
 * Normalize backend Verification document into frontend interface contract
 *
 * @param {Object} item - Mongoose Verification document or plain object
 * @param {number} idx - Index fallback
 * @returns {Object} Normalized verification object
 */
function normalizeBackendVerification(item, idx = 0) {
  const pred = item.predictionId && typeof item.predictionId === 'object' ? item.predictionId : {};
  const off = item.officerId && typeof item.officerId === 'object' ? item.officerId : {};
  const asgn = item.assignmentId && typeof item.assignmentId === 'object' ? item.assignmentId : {};

  const coords = item.location?.coordinates || pred.location?.coordinates || [-87.6298, 41.8781];

  const outcome = item.outcome || 'PROBLEM_CONFIRMED';
  const isTP = outcome === 'PROBLEM_CONFIRMED';
  const classification = isTP ? 'TRUE_POSITIVE' : 'FALSE_POSITIVE';

  return {
    id: item.verificationId || item.id || item._id || `VERIF-GEN-${idx + 1}`,
    verificationId: item.verificationId || item.id || item._id || `VERIF-GEN-${idx + 1}`,
    _id: item._id || item.id,
    prediction: {
      id: pred.predictionId || pred.id || pred._id || 'PRED-UNKNOWN',
      predictionId: pred.predictionId || pred.id || pred._id || 'PRED-UNKNOWN',
      complaintType: pred.complaintType || 'Civic Infrastructure',
      department: pred.department || off.department || 'Municipal',
      riskLevel: (pred.riskLevel || 'LOW').toUpperCase(),
      riskScore: pred.riskScore ?? Math.round((pred.probability ?? 0.5) * 100),
      probability: pred.probability ?? ((pred.riskScore ?? 50) / 100),
      communityArea: pred.communityArea || 'Chicago Central',
      ward: pred.ward || 'Ward 1',
      location: {
        lat: coords[1] || 41.8781,
        lng: coords[0] || -87.6298,
        address: pred.address || `${pred.communityArea || 'Chicago'}, IL`,
      },
    },
    assignment: {
      id: asgn.assignmentId || asgn.id || asgn._id || 'ASGN-LINKED',
      assignmentId: asgn.assignmentId || asgn.id || asgn._id || 'ASGN-LINKED',
      status: asgn.status || 'COMPLETED',
      distanceKm: asgn.distanceKm ?? 1.2,
      assignedAt: asgn.assignedAt || item.createdAt,
      completedAt: asgn.completedAt || item.verifiedAt,
    },
    officer: {
      id: off.officerId || off.id || off._id || 'OFF-UNKNOWN',
      officerId: off.officerId || off.id || off._id || 'OFF-UNKNOWN',
      name: off.name || 'Verified Officer',
      employeeCode: off.employeeCode || 'EMP-N/A',
      department: off.department || pred.department || 'Municipal',
      phone: off.phone || '+1-312-555-0100',
    },
    outcome: outcome.toUpperCase(),
    severity: (item.severity || 'MEDIUM').toUpperCase(),
    notes: item.notes || 'Field verification logged by on-site inspector.',
    evidenceUrl: item.evidenceUrl || null,
    location: {
      lat: coords[1] || 41.8781,
      lng: coords[0] || -87.6298,
    },
    gpsAvailable: Boolean(item.gpsAvailable),
    verifiedAt: item.verifiedAt || item.createdAt || new Date().toISOString(),
    evaluation: item.evaluation || {
      evaluationId: `EVAL-${item.verificationId || idx + 1}`,
      classification,
      actualOutcome: outcome,
      evaluatedAt: item.verifiedAt || new Date().toISOString(),
    },
    feedback: item.feedback || {
      feedbackId: `FB-${item.verificationId || idx + 1}`,
      feedbackType: isTP ? 'FEEDBACK_TRUE_POSITIVE' : 'FEEDBACK_FALSE_POSITIVE',
      feedbackStatus: 'INGESTED_TO_FEATURE_STORE',
      notes: isTP
        ? 'Ground confirmation feedback ingested into training dataset buffer.'
        : 'False positive penalty signal logged for model threshold calibration.',
    },
  };
}

/**
 * Fetch list of field verifications with centralized filter normalization
 *
 * @param {Object} params - Raw UI parameters
 * @returns {Promise<Object>} Formatted verifications response
 */
export async function getVerifications(params = {}) {
  const normalizedParams = buildVerificationQueryParams(params);

  if (import.meta.env.DEV) {
    console.debug('[Verifications API] normalized params:', normalizedParams);
  }

  const response = await axiosInstance.get('/admin/verifications', {
    params: normalizedParams,
  });

  if (response.data && response.data.success && response.data.data) {
    const rawData = response.data.data;
    const rawList = rawData.verifications || [];
    const normalizedList = rawList.map((item, idx) =>
      normalizeBackendVerification(item, idx)
    );

    const total = rawData.pagination?.total ?? normalizedList.length;
    const limit = rawData.pagination?.limit ?? 10;
    const page = rawData.pagination?.page ?? 1;
    const totalPages = rawData.pagination?.totalPages ?? (Math.ceil(total / limit) || 1);

    const pendingCount = normalizedList.filter(v => (v.assignment?.status || '').toUpperCase() === 'PENDING_ASSIGNMENT' || (v.status || '').toUpperCase() === 'PENDING_ASSIGNMENT').length;
    const assignedCount = normalizedList.filter(v => (v.assignment?.status || '').toUpperCase() === 'ASSIGNED' || (v.status || '').toUpperCase() === 'ASSIGNED').length;
    const submittedCount = normalizedList.filter(v => (v.assignment?.status || '').toUpperCase() === 'VERIFICATION_SUBMITTED' || (v.status || '').toUpperCase() === 'VERIFICATION_SUBMITTED').length;
    const completedCount = normalizedList.filter(v => (v.assignment?.status || '').toUpperCase() === 'COMPLETED' || (v.status || '').toUpperCase() === 'COMPLETED').length;
    const cancelledCount = normalizedList.filter(v => (v.assignment?.status || '').toUpperCase() === 'CANCELLED' || (v.status || '').toUpperCase() === 'CANCELLED').length;

    return {
      data: {
        verifications: normalizedList,
        pagination: {
          total,
          limit,
          page,
          totalPages,
        },
        summary: {
          total,
          pendingAssignment: pendingCount,
          assigned: assignedCount,
          submitted: submittedCount,
          completed: completedCount,
          cancelled: cancelledCount,
          confirmed: normalizedList.filter(v => v.outcome === 'PROBLEM_CONFIRMED').length,
          notFound: normalizedList.filter(v => v.outcome === 'PROBLEM_NOT_FOUND').length,
          different: normalizedList.filter(v => v.outcome === 'DIFFERENT_PROBLEM').length,
          duplicate: normalizedList.filter(v => v.outcome === 'DUPLICATE').length,
          unable: normalizedList.filter(v => v.outcome === 'UNABLE_TO_VERIFY').length,
        },
        distribution: {
          PROBLEM_CONFIRMED: normalizedList.filter(v => v.outcome === 'PROBLEM_CONFIRMED').length,
          PROBLEM_NOT_FOUND: normalizedList.filter(v => v.outcome === 'PROBLEM_NOT_FOUND').length,
          DIFFERENT_PROBLEM: normalizedList.filter(v => v.outcome === 'DIFFERENT_PROBLEM').length,
          DUPLICATE: normalizedList.filter(v => v.outcome === 'DUPLICATE').length,
          UNABLE_TO_VERIFY: normalizedList.filter(v => v.outcome === 'UNABLE_TO_VERIFY').length,
        },
      },
      isLive: true,
    };
  }

  throw new Error('Unexpected response format from verifications API');
}

/**
 * Fetch single verification detail by ID
 */
export async function getVerificationById(id) {
  const response = await axiosInstance.get(`/admin/verifications/${id}`);
  if (response.data && response.data.success && response.data.data) {
    const item = response.data.data.verification || response.data.data;
    return {
      data: normalizeBackendVerification(item),
      isLive: true,
    };
  }
  throw new Error('Unexpected response format from verification detail API');
}

/**
 * Retrieve filter options for the verification page
 */
export async function getVerificationFilters() {
  return verificationFilterOptions;
}

export default {
  getVerifications,
  getVerificationById,
  getVerificationFilters,
};