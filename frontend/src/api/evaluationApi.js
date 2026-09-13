import axiosInstance from './axiosInstance';
import { evaluationFilterOptions } from '../data/evaluationMockData';

/**
 * Normalize UI filter values for backend API requests.
 * Strips out human-readable placeholder labels like "All classifications", "All departments", etc.
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
 * Build clean query parameters object omitting any undefined or placeholder values
 */
function buildEvaluationQueryParams(params = {}) {
  const cleanClassification = normalizeFilter(params.classification);
  const cleanDept = normalizeFilter(params.department);
  const cleanRisk = normalizeFilter(params.riskLevel);
  const cleanWard = normalizeFilter(params.ward);
  const cleanSearch = params.search?.trim() || undefined;

  const candidate = {
    search: cleanSearch,
    classification: cleanClassification,
    department: cleanDept,
    riskLevel: cleanRisk,
    ward: cleanWard,
    sortBy: params.sortBy || 'evaluatedAt',
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
 * Fetch aggregated AI Model evaluation and research metrics
 *
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Model evaluation metrics payload
 */
export async function getEvaluationMetrics(params = {}) {
  const normalizedParams = buildEvaluationQueryParams(params);

  if (import.meta.env.DEV) {
    console.debug('[Evaluation API] normalized metrics params:', normalizedParams);
  }

  const response = await axiosInstance.get('/admin/evaluation/metrics', {
    params: normalizedParams,
  });

  if (response.data && response.data.success && response.data.data) {
    return {
      data: response.data.data,
      isLive: true,
    };
  }

  throw new Error('Unexpected response format from evaluation metrics API');
}

/**
 * Fetch paginated list of evaluated prediction-verification pairs
 *
 * @param {Object} params - Raw UI parameters
 * @returns {Promise<Object>} Evaluated records response
 */
export async function getEvaluationRecords(params = {}) {
  const normalizedParams = buildEvaluationQueryParams(params);

  if (import.meta.env.DEV) {
    console.debug('[Evaluation API] normalized records params:', normalizedParams);
  }

  const response = await axiosInstance.get('/admin/evaluation/records', {
    params: normalizedParams,
  });

  if (response.data && response.data.success && response.data.data) {
    return {
      data: response.data.data,
      isLive: true,
    };
  }

  throw new Error('Unexpected response format from evaluation records API');
}

/**
 * Retrieve filter options for the evaluation page
 */
export async function getEvaluationFilters() {
  return evaluationFilterOptions;
}

export default {
  getEvaluationMetrics,
  getEvaluationRecords,
  getEvaluationFilters,
};
