import axiosInstance from './axiosInstance';
import { assignmentFilterOptions } from '../data/assignmentMockData';
/**
 * Normalize UI filter values for backend API requests.
 * Strips out human-readable placeholder labels like "All departments", "All assignment statuses", etc.
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
function buildAssignmentQueryParams(params = {}) {
  const cleanStatus = normalizeFilter(params.status || params.assignmentStatus);
  const cleanDepartment = normalizeFilter(params.department);
  const cleanSearch = params.search?.trim() || undefined;

  const candidate = {
    search: cleanSearch,
    status: cleanStatus,
    department: cleanDepartment,
    officerId: normalizeFilter(params.officerId),
    predictionId: normalizeFilter(params.predictionId),
    sortBy: params.sortBy || 'assignedAt',
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
 * Normalize backend Assignment document into frontend interface contract
 *
 * @param {Object} item - Mongoose Assignment document or plain object
 * @param {number} idx - Index fallback
 * @returns {Object} Normalized assignment object
 */
function normalizeBackendAssignment(item, idx = 0) {
  const pred = item.predictionId && typeof item.predictionId === 'object' ? item.predictionId : {};
  const off = item.officerId && typeof item.officerId === 'object' ? item.officerId : {};

  const predCoords = pred.location?.coordinates || [-87.6298, 41.8781];

  return {
    id: item.assignmentId || item.id || item._id || `ASGN-GEN-${idx + 1}`,
    assignmentId: item.assignmentId || item.id || item._id || `ASGN-GEN-${idx + 1}`,
    _id: item._id || item.id,
    prediction: {
      id: pred.predictionId || pred.id || pred._id || 'PRED-UNKNOWN',
      predictionId: pred.predictionId || pred.id || pred._id || 'PRED-UNKNOWN',
      complaintType: pred.complaintType || 'Civic Infrastructure',
      riskLevel: (pred.riskLevel || 'LOW').toUpperCase(),
      riskScore: pred.riskScore ?? Math.round((pred.probability ?? 0.5) * 100),
      probability: pred.probability ?? ((pred.riskScore ?? 50) / 100),
      communityArea: pred.communityArea || 'Chicago Central',
      ward: pred.ward || 'Ward 1',
      location: {
        lat: predCoords[1] || 41.8781,
        lng: predCoords[0] || -87.6298,
        address: pred.address || `${pred.communityArea || 'Chicago'}, IL`,
      },
    },
    officer: {
      id: off.officerId || off.id || off._id || 'OFF-UNASSIGNED',
      officerId: off.officerId || off.id || off._id || 'OFF-UNASSIGNED',
      name: off.name || 'Unassigned Officer',
      employeeCode: off.employeeCode || 'EMP-N/A',
      department: off.department || item.department || 'Municipal',
      phone: off.phone || '+1-312-555-0100',
      availability: off.availability || item.availability || 'AVAILABLE',
      currentWorkload: off.currentWorkload ?? item.currentWorkload ?? 0,
    },
    department: item.department || off.department || 'Municipal',
    distanceKm: item.distanceKm ?? 1.5,
    estimatedTravelMinutes: item.estimatedTravelMinutes ?? 15,
    currentWorkload: item.currentWorkload ?? off.currentWorkload ?? 0,
    availability: item.availability || off.availability || 'AVAILABLE',
    departmentMatch: item.departmentMatch ?? true,
    assignmentScore: item.assignmentScore ?? 88.5,
    reasoning: item.reasoning || 'Automated heuristic dispatch allocation based on capacity and proximity.',
    status: (item.status || 'AI_ASSIGNED').toUpperCase(),
    assignedAt: item.assignedAt || item.createdAt || new Date().toISOString(),
    acceptedAt: item.acceptedAt || null,
    completedAt: item.completedAt || null,
    verification: {
      status: item.status === 'COMPLETED' ? 'VERIFIED' : item.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING',
      outcome: item.status === 'COMPLETED' ? 'PROBLEM_CONFIRMED' : null,
      notes: item.notes || 'Dispatch queue monitored by Command Center.',
    },
  };
}

/**
 * Fetch list of automated assignments with normalized parameters
 *
 * @param {Object} params - Raw UI parameters
 * @returns {Promise<Object>} Formatted assignments response
 */
export async function getAssignments(params = {}) {
  const normalizedParams = buildAssignmentQueryParams(params);

  if (import.meta.env.DEV) {
    console.debug('[Assignments API] normalized params:', normalizedParams);
  }

  const response = await axiosInstance.get('/admin/assignments', {
    params: normalizedParams,
  });

  if (response.data && response.data.success && response.data.data) {
    const rawData = response.data.data;
    const rawList = rawData.assignments || [];
    const normalizedList = rawList.map((item, idx) =>
      normalizeBackendAssignment(item, idx)
    );

    const total = rawData.pagination?.total ?? normalizedList.length;
    const limit = rawData.pagination?.limit ?? 10;
    const page = rawData.pagination?.page ?? 1;
    const totalPages = rawData.pagination?.totalPages ?? (Math.ceil(total / limit) || 1);

    return {
      data: {
        assignments: normalizedList,
        pagination: {
          total,
          limit,
          page,
          totalPages,
        },
        summary: {
          total: total,
          active: normalizedList.filter(a => a.status === 'AI_ASSIGNED' || a.status === 'ACCEPTED' || a.status === 'IN_PROGRESS').length,
          completed: normalizedList.filter(a => a.status === 'COMPLETED').length,
          rejected: normalizedList.filter(a => a.status === 'REJECTED').length,
        },
        distribution: {
          AI_ASSIGNED: normalizedList.filter(a => a.status === 'AI_ASSIGNED').length,
          ACCEPTED: normalizedList.filter(a => a.status === 'ACCEPTED').length,
          IN_PROGRESS: normalizedList.filter(a => a.status === 'IN_PROGRESS').length,
          COMPLETED: normalizedList.filter(a => a.status === 'COMPLETED').length,
          REJECTED: normalizedList.filter(a => a.status === 'REJECTED').length,
        },
      },
      isLive: true,
    };
  }

  throw new Error('Unexpected response format from assignments API');
}

/**
 * Fetch single assignment detail by ID
 */
export async function getAssignmentById(id) {
  const response = await axiosInstance.get(`/admin/assignments/${id}`);
  if (response.data && response.data.success && response.data.data) {
    const item = response.data.data.assignment || response.data.data;
    return {
      data: normalizeBackendAssignment(item),
      isLive: true,
    };
  }
  throw new Error('Unexpected response format from assignment detail API');
}

/**
 * Trigger backend AI automated dispatch for a prediction
 */
export async function autoAssignPrediction(predictionId, options = {}) {
  try {
    const response = await axiosInstance.post(
      `/admin/assignments/auto-assign/${predictionId}`,
      {},
      { params: options }
    );
    if (response.data && response.data.success && response.data.data) {
      return {
        data: normalizeBackendAssignment(response.data.data.assignment),
        isLive: true,
      };
    }
    return {
      data: null,
      isLive: false,
      message: 'Failed to auto-assign prediction.',
    };
  } catch (error) {
    console.warn('Auto-assign failed:', error?.message);
    throw error;
  }
}

/**
 * Get automatic assignment preview for a prediction cycle
 * Uses verification-selection backend for research-based assignment preview
 * @param {string} predictionCycleId
 */
export async function getAssignmentPreview(predictionCycleId) {
  const response = await axiosInstance.get('/verifications/admin/assign-auto/preview', {
    params: { predictionCycleId },
  });

  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error('Unexpected response format from assignment preview API');
}

/**
 * Execute automatic assignment for a prediction cycle
 * Uses verification-selection backend for research-based assignment
 * @param {Object} payload - { predictionCycleId, options? }
 */
export async function executeAutoAssignment(payload) {
  const response = await axiosInstance.post('/verifications/admin/assign-auto', payload);

  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error('Unexpected response format from auto-assign execution API');
}

/**
 * Retrieve filter options for the assignments page
 */
export async function getAssignmentFilters() {
  return assignmentFilterOptions;
}

export default {
  getAssignments,
  getAssignmentById,
  autoAssignPrediction,
  getAssignmentPreview,
  executeAutoAssignment,
  getAssignmentFilters,
};
