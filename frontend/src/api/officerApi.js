import axiosInstance from './axiosInstance';
import { officerFilterOptions } from '../data/officerPerformanceMockData';
import { officerManagementFilterOptions } from '../data/officerManagementMockData';

/**
 * Fetch officer operational performance list with search, filter, sort and pagination
 */
export async function getOfficerPerformance(params = {}) {
  const response = await axiosInstance.get('/admin/officers/performance', { params });
  if (response.data && response.data.success && response.data.data) {
    return {
      data: response.data.data,
      isLive: true,
    };
  }
  throw new Error('Unexpected response format from officer performance API');
}

/**
 * Fetch detailed performance profile for a specific officer by ID
 */
export async function getOfficerPerformanceById(id) {
  const response = await axiosInstance.get(`/admin/officers/${id}/performance`);
  if (response.data && response.data.success && response.data.data) {
    return {
      data: response.data.data.officer || response.data.data,
      isLive: true,
    };
  }
  throw new Error('Unexpected response format from officer performance detail API');
}

/**
 * Retrieve aggregated workload statistics
 */
export async function getOfficerWorkload() {
  const response = await axiosInstance.get('/admin/officers/workload');
  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error('Unexpected response format from officer workload API');
}

/**
 * Get available filter dropdown values for Performance
 */
export async function getOfficerPerformanceFilters() {
  return officerFilterOptions;
}

/**
 * Admin: Get Officer Management Registry List
 */
export async function getAdminOfficers(params = {}) {
  const cleanParams = {};
  if (params.search?.trim()) cleanParams.search = params.search.trim();
  if (params.department && !params.department.startsWith('All')) cleanParams.department = params.department;
  if (params.availability && !params.availability.startsWith('All')) cleanParams.availability = params.availability;
  cleanParams.page = params.page || 1;
  cleanParams.limit = params.limit || 10;

  const response = await axiosInstance.get('/admin/officers', { params: cleanParams });
  if (response.data && response.data.success && response.data.data) {
    const data = response.data.data;
    return {
      data: {
        officers: data.officers || [],
        pagination: data.pagination || { total: data.officers?.length || 0, page: 1, limit: 10, totalPages: 1 },
        summary: {
          total: data.officers?.length || 0,
          active: data.officers?.filter(o => o.active).length || 0,
          available: data.officers?.filter(o => o.availability === 'AVAILABLE').length || 0,
        },
      },
      isLive: true,
    };
  }
  throw new Error('Unexpected response format from admin officers API');
}

/**
 * Admin: Create New Officer Record
 */
export async function createAdminOfficer(payload) {
  try {
    const response = await axiosInstance.post('/admin/officers', payload);
    return response.data;
  } catch (error) {
    console.error('Failed to create officer on server:', error?.message);
    throw error;
  }
}

/**
 * Admin: Update Officer Record
 */
export async function updateAdminOfficer(id, payload) {
  try {
    const response = await axiosInstance.patch(`/admin/officers/${id}`, payload);
    return response.data;
  } catch (error) {
    console.error('Failed to update officer on server:', error?.message);
    throw error;
  }
}

/**
 * Admin: Delete Officer Record
 */
export async function deleteAdminOfficer(id) {
  try {
    const response = await axiosInstance.delete(`/admin/officers/${id}`);
    return response.data;
  } catch (error) {
    console.error('Failed to delete officer on server:', error?.message);
    throw error;
  }
}

/**
 * Admin: Get Officer Management Filter Options
 */
export async function getAdminOfficerFilters() {
  return officerManagementFilterOptions;
}

export default {
  getOfficerPerformance,
  getOfficerPerformanceById,
  getOfficerWorkload,
  getOfficerPerformanceFilters,
  getAdminOfficers,
  createAdminOfficer,
  updateAdminOfficer,
  deleteAdminOfficer,
  getAdminOfficerFilters,
};