import axiosInstance from './axiosInstance';

/**
 * Normalize UI filter values for backend API requests.
 * Strips out human-readable placeholder labels like "All complaint types", "All wards", etc.
 *
 * @param {string|number|null|undefined} value - Raw UI filter value
 * @returns {string|number|undefined} Sanitized parameter value or undefined if omitted
 */
function normalizeFilter(value) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    // Strip UI labels starting with "All " (e.g., "All complaint types", "All wards")
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
function buildNormalizedQueryParams(params = {}) {
  const candidate = {
    search: params.search?.trim() || undefined,
    complaintType: normalizeFilter(params.complaintType),
    communityArea: normalizeFilter(params.communityArea),
    ward: normalizeFilter(params.ward),
    riskLevel: normalizeFilter(params.riskLevel),
    verificationStatus: normalizeFilter(params.verificationStatus),
    assignmentStatus: normalizeFilter(params.assignmentStatus),
    predictionCycleId: params.predictionCycleId,
    sortBy: params.sortBy || 'riskScore',
    sortOrder: params.sortOrder || 'desc',
    page: params.page !== undefined ? Number(params.page) : 1,
    limit: params.limit !== undefined ? Number(params.limit) : 10,
  };

  // Strip out undefined keys so Axios only serializes active parameters
  const cleanParams = {};
  for (const [key, val] of Object.entries(candidate)) {
    if (val !== undefined && val !== null && val !== '') {
      cleanParams[key] = val;
    }
  }

  return cleanParams;
}

/**
 * Fetch list of predictions with centralized filter normalization, search, sorting and pagination
 * NO MOCK FALLBACK - errors propagate to caller
 *
 * @param {Object} params - Raw UI parameters
 * @returns {Promise<Object>} Formatted predictions response { predictions, pagination }
 */
export async function getPredictions(params = {}) {
  const normalizedParams = buildNormalizedQueryParams(params);

  if (import.meta.env.DEV) {
    console.debug('[Predictions API] normalized params:', normalizedParams);
  }

  const response = await axiosInstance.get('/admin/predictions', {
    params: normalizedParams,
  });

  // Backend returns: { success: true, data: { predictions: [...], pagination: {...} } }
  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }

  throw new Error('Unexpected response format from predictions API');
}

/**
 * Fetch single prediction details by ID
 * NO MOCK FALLBACK - errors propagate to caller
 */
export async function getPredictionById(id) {
  const response = await axiosInstance.get(`/admin/predictions/${id}`);

  if (response.data && response.data.success && response.data.data) {
    // Backend returns: { prediction, predictionCycle, assignedOfficer, assignment, verification, evaluation, feedback }
    return response.data.data;
  }

  throw new Error('Unexpected response format from prediction detail API');
}

/**
 * Trigger a new prediction cycle via AI service
 * @param {Object} payload - Request body for run-cycle
 * @returns {Promise<Object>} Cycle result with predictions
 */
export async function runPredictionCycle(payload = {}) {
  const response = await axiosInstance.post('/admin/predictions/run-cycle', payload);

  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }

  throw new Error('Unexpected response format from run cycle API');
}

/**
 * Retrieve selectable filter options (static for now, could be dynamic later)
 */
export async function getPredictionFilters() {
  // These match backend filter options
  return {
    complaintTypes: [
      'All complaint types',
      'Pothole & Asphalt Break',
      'Garbage & Sanitation Accumulation',
      'Rodent Complaint',
      'Street Light Outage',
      'Illegal Waste Dumping',
      'Water Service & Pressure Disruption',
      'Traffic Signal Fault',
    ],
    communityAreas: [
      'All community areas',
      '3 - Uptown',
      '8 - Near North Side',
      '14 - Albany Park',
      '22 - Logan Square',
      '24 - West Town',
      '25 - Austin',
      '28 - Near West Side',
      '32 - The Loop',
      '41 - Hyde Park',
      '57 - Archer Heights',
      '61 - New City',
      '68 - Englewood',
    ],
    wards: [
      'All wards',
      '1',
      '5',
      '14',
      '16',
      '20',
      '27',
      '29',
      '32',
      '33',
      '35',
      '42',
      '43',
      '46',
    ],
    riskLevels: ['All risk levels', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    verificationStatuses: [
      'All verification statuses',
      'UNASSIGNED',
      'ASSIGNED',
      'PENDING_VERIFICATION',
      'VERIFIED',
      'VERIFIED_TRUE',
      'VERIFIED_FALSE',
      'UNABLE_TO_VERIFY',
      'RESOLVED',
    ],
    assignmentStatuses: [
      'All assignment statuses',
      'UNASSIGNED',
      'AI_ASSIGNED',
      'ACCEPTED',
      'IN_PROGRESS',
      'COMPLETED',
      'REJECTED',
    ],
  };
}

export default {
  getPredictions,
  getPredictionById,
  runPredictionCycle,
  getPredictionFilters,
};