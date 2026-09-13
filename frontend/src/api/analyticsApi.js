import axiosInstance from './axiosInstance';
import { heatmapFilterOptions } from '../data/heatmapMockData';

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
    if (/^all\s+/i.test(trimmed) || trimmed.toLowerCase() === 'all') {
      return undefined;
    }
    return trimmed;
  }
  return value;
}

/**
 * Build normalized query parameters for the /admin/heatmap endpoint
 *
 * @param {Object} params - Raw UI parameters
 * @returns {Object} Clean query parameters object
 */
function buildHeatmapQueryParams(params = {}) {
  let cleanWard = normalizeFilter(params.ward);
  if (cleanWard) {
    // If passed as number e.g. "14", backend matches regex ^Ward 14$ or ^14$
    if (/^\d+$/.test(cleanWard)) {
      cleanWard = `Ward ${cleanWard}`;
    }
  }

  let cleanCA = normalizeFilter(params.communityArea);
  if (cleanCA) {
    // Strip trailing parenthetical number e.g. "The Loop (32)" -> "The Loop"
    const match = cleanCA.match(/^(.+?)\s*\(\d+\)$/);
    if (match) {
      cleanCA = match[1].trim();
    }
  }

  const cleanRisk = normalizeFilter(params.riskLevel);
  const cleanComplaint = normalizeFilter(params.complaintType);
  const cleanSearch = params.search?.trim() || undefined;

  // Date range translation
  let startDate = undefined;
  let endDate = undefined;
  if (params.dateRange) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (params.dateRange === 'Today') {
      startDate = todayStr;
      endDate = todayStr;
    } else if (params.dateRange === 'Next 7 days') {
      const next7 = new Date(now.getTime() + 7 * 86400000);
      startDate = todayStr;
      endDate = next7.toISOString().split('T')[0];
    } else if (params.dateRange === 'Next 14 days') {
      const next14 = new Date(now.getTime() + 14 * 86400000);
      startDate = todayStr;
      endDate = next14.toISOString().split('T')[0];
    }
  }

  const candidate = {
    search: cleanSearch,
    complaintType: cleanComplaint,
    riskLevel: cleanRisk,
    ward: cleanWard,
    communityArea: cleanCA,
    startDate,
    endDate,
    limit: params.limit || 500,
  };

  // Strip undefined/null/empty keys
  const cleanParams = {};
  for (const [key, val] of Object.entries(candidate)) {
    if (val !== undefined && val !== null && val !== '') {
      cleanParams[key] = val;
    }
  }

  return cleanParams;
}

/**
 * Fetch high-level operational admin dashboard metrics
 */
export async function getAdminDashboard() {
  const response = await axiosInstance.get('/admin/dashboard');
  if (response.data && response.data.success && response.data.data) {
    return {
      data: response.data.data,
      isLive: true,
    };
  }
  throw new Error('Unexpected response format from admin dashboard API');
}

/**
 * Normalize backend FeatureCollection/points response into frontend Heatmap data contract
 *
 * @param {Object} rawData - Backend GeoJSON FeatureCollection payload
 * @returns {Object} Normalized locations, summary and distribution
 */
function normalizeBackendHeatmapData(rawData) {
  const points = rawData.points || rawData.features?.map((f) => f.properties) || [];

  const normalizedLocations = points.map((item, idx) => {
    const lat = item.latitude ?? (item.location?.coordinates ? item.location.coordinates[1] : 41.8781);
    const lng = item.longitude ?? (item.location?.coordinates ? item.location.coordinates[0] : -87.6298);

    const caName = typeof item.communityArea === 'string' ? item.communityArea : `Community Area ${item.communityArea}`;
    const caNum = typeof item.communityArea === 'number' ? item.communityArea : parseInt(item.communityArea, 10) || idx + 1;

    const riskScore = item.riskScore ?? Math.round((item.probability ?? 0.5) * 100);
    const probability = item.probability ?? ((item.riskScore ?? 50) / 100);
    const riskLevel = (item.riskLevel || 'LOW').toUpperCase();

    const officerData = item.assignedOfficer
      ? {
          id: item.assignedOfficer.officerId || item.assignedOfficer.id || item.assignedOfficer._id,
          name: item.assignedOfficer.name,
          department: item.assignedOfficer.department,
          distanceKm: item.assignedOfficer.distanceKm || 1.2,
        }
      : null;

    return {
      id: item.predictionId || item.id || item._id || `PRED-MAP-${idx + 1}`,
      area: {
        communityArea: isNaN(caNum) ? idx + 1 : caNum,
        communityAreaName: caName,
        ward: item.ward || 'Ward 1',
      },
      complaintType: item.complaintType || 'Civic Complaint',
      department: item.department || 'Municipal',
      location: {
        lat,
        lng,
        address: item.address || `${caName}, Chicago, IL`,
      },
      riskScore,
      probability,
      confidence: item.confidence ?? 0.88,
      riskLevel,
      predictionDate: item.predictionDate || item.predictionWindow?.start || new Date().toISOString().split('T')[0],
      predictionWindow: {
        start: item.predictionWindow?.start || new Date().toISOString().split('T')[0],
        end: item.predictionWindow?.end || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        display: item.predictionWindow?.display || 'Next 7 days',
        horizonDays: 7,
      },
      historicalCount: item.historicalCount ?? Math.floor(riskScore / 2),
      recentCount: item.recentCount ?? Math.floor(riskScore / 10),
      trend: item.trend || (riskScore >= 75 ? 'INCREASING (+24%)' : 'STABLE'),
      verificationStatus: (item.verificationStatus || 'PENDING_VERIFICATION').toUpperCase(),
      actualOutcome: item.actualOutcome || null,
      evaluation: item.evaluation || (item.verificationStatus === 'VERIFIED' ? 'TRUE_POSITIVE' : 'WAITING'),
      assignmentStatus: officerData ? 'ASSIGNED' : 'UNASSIGNED',
      officer: officerData,
    };
  });

  // Calculate high-level summary from normalized points
  const lowCount = normalizedLocations.filter((i) => i.riskLevel === 'LOW').length;
  const medCount = normalizedLocations.filter((i) => i.riskLevel === 'MEDIUM').length;
  const highCount = normalizedLocations.filter((i) => i.riskLevel === 'HIGH').length;
  const critCount = normalizedLocations.filter((i) => i.riskLevel === 'CRITICAL').length;

  const summary = {
    totalPredictedAreas: normalizedLocations.length,
    highRiskAreas: highCount,
    criticalAreas: critCount,
    pendingVerification: normalizedLocations.filter((i) => i.verificationStatus.includes('PENDING')).length,
    assigned: normalizedLocations.filter((i) => i.assignmentStatus === 'ASSIGNED' || Boolean(i.officer)).length,
  };

  const distribution = [
    { level: 'LOW', count: lowCount, fill: '#4dd6a8' },
    { level: 'MEDIUM', count: medCount, fill: '#ecd06f' },
    { level: 'HIGH', count: highCount, fill: '#f5a623' },
    { level: 'CRITICAL', count: critCount, fill: '#ff6b6b' },
  ];

  return {
    locations: normalizedLocations,
    summary,
    distribution,
  };
}

/**
 * Fetch predicted civic risk map data for Chicago
 * Queries the authoritative backend endpoint: GET /api/v1/admin/heatmap
 */
export async function getRiskMapData(params = {}) {
  const normalizedParams = buildHeatmapQueryParams(params);

  if (import.meta.env.DEV) {
    console.debug('[Heatmap API] normalized query params:', normalizedParams);
  }

  const response = await axiosInstance.get('/admin/heatmap', {
    params: normalizedParams,
  });

  if (response.data && response.data.success && response.data.data) {
    const normalized = normalizeBackendHeatmapData(response.data.data);
    return {
      data: normalized,
      isLive: true,
    };
  }

  throw new Error('Unexpected response format from risk map API');
}

/**
 * Retrieve heatmap filter options
 */
export async function getRiskMapFilters() {
  return heatmapFilterOptions;
}

/**
 * Fetch details for a specific risk prediction area
 */
export async function getAreaRiskDetails(areaId) {
  const response = await axiosInstance.get(`/admin/predictions/${areaId}`);
  if (response.data && response.data.success && response.data.data) {
    const item = response.data.data.prediction || response.data.data;
    return {
      data: {
        ...item,
        id: item.predictionId || item.id || item._id,
      },
      isLive: true,
    };
  }
  throw new Error('Unexpected response format from area risk detail API');
}

export default {
  getAdminDashboard,
  getRiskMapData,
  getRiskMapFilters,
  getAreaRiskDetails,
};