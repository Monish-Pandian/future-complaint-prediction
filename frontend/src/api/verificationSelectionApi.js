import axiosInstance from './axiosInstance';

/**
 * Normalize UI filter values for backend API requests.
 * Strips out human-readable placeholder labels like "All selection types", "All candidate statuses", etc.
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
 */
function buildCandidateQueryParams(params = {}) {
  const candidate = {
    search: params.search?.trim() || undefined,
    predictionCycleId: params.predictionCycleId,
    selectionType: normalizeFilter(params.selectionType),
    status: normalizeFilter(params.status),
    riskLevel: normalizeFilter(params.riskLevel),
    communityArea: normalizeFilter(params.communityArea),
    ward: normalizeFilter(params.ward),
    sortBy: params.sortBy || 'selectionRank',
    sortOrder: params.sortOrder || 'asc',
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
 * Transform backend VerificationCandidate document into frontend interface
 */
function normalizeBackendCandidate(item, idx = 0) {
  const pred = item.predictionId && typeof item.predictionId === 'object' ? item.predictionId : {};
  const off = item.assignedOfficer && typeof item.assignedOfficer === 'object' ? item.assignedOfficer : {};

  return {
    id: item.candidateId || item._id || `CAND-${idx + 1}`,
    candidateId: item.candidateId || item._id || `CAND-${idx + 1}`,
    _id: item._id,
    prediction: {
      id: pred.predictionId || pred.id || pred._id || 'PRED-UNKNOWN',
      predictionId: pred.predictionId || pred.id || pred._id || 'PRED-UNKNOWN',
      complaintType: pred.complaintType || 'Civic Complaint',
      department: pred.department || item.department || 'Municipal',
      riskLevel: (pred.riskLevel || item.riskLevel || 'LOW').toUpperCase(),
      riskScore: pred.riskScore ?? item.riskScore ?? Math.round((pred.probability ?? item.probability ?? 0.5) * 100),
      probability: pred.probability ?? item.probability ?? ((pred.riskScore ?? item.riskScore ?? 50) / 100),
      communityArea: pred.communityArea || item.communityArea || 'Chicago Central',
      ward: pred.ward || item.ward || 'Ward 1',
      location: pred.location || { coordinates: [-87.6298, 41.8781] },
    },
    selectionType: item.selectionType || 'EXPLOITATION',
    selectionPolicy: item.selectionPolicy || '90_10_EXPLOITATION_EXPLORATION',
    selectionRank: item.selectionRank || idx + 1,
    status: item.status || 'PENDING_ASSIGNMENT',
    budgetPct: item.budgetPct || 0,
    weekStart: item.weekStart,
    assignedOfficer: off ? {
      id: off.officerId || off.id || off._id,
      officerId: off.officerId || off.id || off._id,
      name: off.name || 'Assigned Officer',
      employeeCode: off.employeeCode || 'EMP-N/A',
      department: off.department || 'Municipal',
      phone: off.phone || '+1-312-555-0100',
    } : null,
    assignedAt: item.assignedAt,
  };
}

/**
 * Trigger verification candidate selection for a prediction cycle
 * @param {Object} payload - { predictionCycleId, budgetPct, randomSeed? }
 */
export async function selectCandidates(payload) {
  const response = await axiosInstance.post('/verifications/admin/select', payload);

  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error('Unexpected response format from select candidates API');
}

/**
 * Get verification candidates for a prediction cycle
 * @param {Object} params - { predictionCycleId, selectionType, status, ... }
 */
export async function getCandidates(params = {}) {
  const normalizedParams = buildCandidateQueryParams(params);

  if (import.meta.env.DEV) {
    console.debug('[VerificationSelection API] normalized params:', normalizedParams);
  }

  const response = await axiosInstance.get('/verifications/admin/candidates', {
    params: normalizedParams,
  });

  if (response.data && response.data.success && response.data.data) {
    const rawData = response.data.data;
    const rawList = rawData.candidates || [];
    const normalizedList = rawList.map((item, idx) => normalizeBackendCandidate(item, idx));

    return {
      candidates: normalizedList,
      pagination: rawData.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  }
  throw new Error('Unexpected response format from candidates API');
}

/**
 * Get verification selection summary for a prediction cycle
 * @param {string} predictionCycleId
 */
export async function getSummary(predictionCycleId) {
  if (!predictionCycleId) {
    throw new Error('predictionCycleId is required');
  }

  const response = await axiosInstance.get('/verifications/admin/summary', {
    params: { predictionCycleId },
  });

  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error('Unexpected response format from summary API');
}

/**
 * Manually assign officer to verification candidates
 * @param {Object} payload - { candidateIds: string[], officerId: string }
 */
export async function assignCandidates(payload) {
  const response = await axiosInstance.patch('/verifications/admin/candidates/assign', payload);

  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error('Unexpected response format from assign candidates API');
}

/**
 * Unassign officer from verification candidates
 * @param {string[]} candidateIds
 */
export async function unassignCandidates(candidateIds) {
  const response = await axiosInstance.patch('/verifications/admin/candidates/unassign', { candidateIds });

  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error('Unexpected response format from unassign candidates API');
}

/**
 * Get automatic assignment preview
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
 * Execute automatic assignment
 * @param {Object} payload - { predictionCycleId, options? }
 */
export async function autoAssignCandidates(payload) {
  const response = await axiosInstance.post('/verifications/admin/assign-auto', payload);

  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error('Unexpected response format from auto assign API');
}

/**
 * Get available filter options for candidates
 */
export async function getCandidateFilters() {
  return {
    selectionTypes: [
      'All selection types',
      'EXPLOITATION',
      'EXPLORATION',
    ],
    statuses: [
      'All candidate statuses',
      'PENDING_ASSIGNMENT',
      'ASSIGNED',
      'VERIFICATION_SUBMITTED',
      'COMPLETED',
      'CANCELLED',
    ],
    riskLevels: ['All risk levels', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
  };
}

export default {
  selectCandidates,
  getCandidates,
  getSummary,
  assignCandidates,
  unassignCandidates,
  getAssignmentPreview,
  autoAssignCandidates,
  getCandidateFilters,
};