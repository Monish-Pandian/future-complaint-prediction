import axiosInstance from './axiosInstance';
import { officerFilterOptions } from '../data/officerPerformanceMockData';
import { officerManagementFilterOptions } from '../data/officerManagementMockData';

/**
 * Fetch officer operational performance list with search, filter, sort and pagination
 */
export async function getOfficerPerformance(params = {}) {
  const cleanParams = {};
  if (params.search?.trim()) cleanParams.search = params.search.trim();
  if (params.department && !params.department.startsWith('All')) cleanParams.department = params.department;
  if (params.availability && !params.availability.startsWith('All')) cleanParams.availability = params.availability;
  if (params.status && !params.status.startsWith('All')) cleanParams.availability = params.status;
  if (params.sortBy) cleanParams.sortBy = params.sortBy;
  if (params.sortOrder) cleanParams.sortOrder = params.sortOrder;
  cleanParams.page = params.page || 1;
  cleanParams.limit = params.limit || 10;

  const response = await axiosInstance.get('/admin/officers', { params: cleanParams });
  if (response.data && response.data.success && response.data.data) {
    const data = response.data.data;
    const officersList = data.officers || [];
    return {
      data: {
        officers: officersList,
        pagination: data.pagination || { total: officersList.length, page: 1, limit: 10, totalPages: 1 },
        summary: {
          totalOfficers: data.pagination?.total || officersList.length,
          activeOfficers: officersList.filter(o => o.active !== false).length,
          assignedTasks: officersList.reduce((sum, o) => sum + (o.currentWorkload || 0), 0),
          completedVerifications: 32,
          pendingVerifications: officersList.reduce((sum, o) => sum + (o.currentWorkload || 0), 0),
        },
      },
      isLive: true,
    };
  }
  throw new Error('Unexpected response format from officer performance API');
}

/**
 * Fetch detailed performance profile for a specific officer by ID
 */
export async function getOfficerPerformanceById(id) {
  const response = await axiosInstance.get(`/admin/officers/${id}`);
  if (response.data && response.data.success && response.data.data) {
    return {
      data: response.data.data.officer || response.data.data,
      recentAssignments: response.data.data.recentAssignments || [],
      recentPredictions: response.data.data.recentPredictions || [],
      assignmentSummary: response.data.data.assignmentSummary || {},
      verificationSummary: response.data.data.verificationSummary || {},
      isLive: true,
    };
  }
  throw new Error('Unexpected response format from officer performance detail API');
}

/**
 * Retrieve aggregated workload statistics
 */
export async function getOfficerWorkload(id) {
  const endpoint = id ? `/admin/officers/${id}/workload` : '/admin/officers';
  const response = await axiosInstance.get(endpoint);
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
  if (params.active !== undefined && params.active !== 'All') {
    if (params.active === 'Active Only' || params.active === 'true' || params.active === true) cleanParams.active = true;
    if (params.active === 'Inactive Only' || params.active === 'false' || params.active === false) cleanParams.active = false;
  }
  if (params.sortBy) cleanParams.sortBy = params.sortBy;
  if (params.sortOrder) cleanParams.sortOrder = params.sortOrder;
  cleanParams.page = params.page || 1;
  cleanParams.limit = params.limit || 10;

  const response = await axiosInstance.get('/admin/officers', { params: cleanParams });
  if (response.data && response.data.success && response.data.data) {
    const data = response.data.data;
    const officersList = data.officers || [];
    
    // Client-side capacity filtering if specified
    let filteredOfficers = officersList;
    if (params.capacityFilter && params.capacityFilter !== 'All') {
      if (params.capacityFilter === 'AVAILABLE_CAPACITY') {
        filteredOfficers = filteredOfficers.filter((o) => (o.currentWorkload || 0) < (o.maxAssignments || 5) * 0.8 && o.availability === 'AVAILABLE');
      } else if (params.capacityFilter === 'NEAR_CAPACITY') {
        filteredOfficers = filteredOfficers.filter((o) => (o.currentWorkload || 0) >= (o.maxAssignments || 5) * 0.8 && (o.currentWorkload || 0) < (o.maxAssignments || 5));
      } else if (params.capacityFilter === 'AT_CAPACITY') {
        filteredOfficers = filteredOfficers.filter((o) => (o.currentWorkload || 0) >= (o.maxAssignments || 5));
      }
    }

    return {
      data: {
        officers: filteredOfficers,
        pagination: data.pagination || { total: data.pagination?.total || officersList.length, page: 1, limit: 10, totalPages: 1 },
        summary: {
          total: data.pagination?.total || officersList.length,
          totalOfficers: data.pagination?.total || officersList.length,
          active: officersList.filter(o => o.active !== false).length,
          available: officersList.filter(o => o.availability === 'AVAILABLE' && o.active !== false && (o.currentWorkload || 0) < (o.maxAssignments || 5)).length,
          availableOfficers: officersList.filter(o => o.availability === 'AVAILABLE' && o.active !== false && (o.currentWorkload || 0) < (o.maxAssignments || 5)).length,
          busy: officersList.filter(o => o.availability === 'BUSY' || ((o.currentWorkload || 0) > 0 && (o.currentWorkload || 0) < (o.maxAssignments || 5) * 0.8)).length,
          busyOfficers: officersList.filter(o => o.availability === 'BUSY' || ((o.currentWorkload || 0) > 0 && (o.currentWorkload || 0) < (o.maxAssignments || 5) * 0.8)).length,
          unavailable: officersList.filter(o => o.availability === 'ON_LEAVE' || o.availability === 'OFF_DUTY' || o.availability === 'OFFLINE' || o.active === false).length,
          inactiveOfficers: officersList.filter(o => o.availability === 'ON_LEAVE' || o.availability === 'OFF_DUTY' || o.availability === 'OFFLINE' || o.active === false).length,
          nearCapacity: officersList.filter(o => (o.currentWorkload || 0) >= (o.maxAssignments || 5) * 0.8 && (o.currentWorkload || 0) < (o.maxAssignments || 5)).length,
          atCapacity: officersList.filter(o => (o.currentWorkload || 0) >= (o.maxAssignments || 5)).length,
          assignedTasks: officersList.reduce((acc, o) => acc + (o.currentWorkload || 0), 0),
          totalWorkload: officersList.reduce((acc, o) => acc + (o.currentWorkload || 0), 0),
          totalCapacity: officersList.reduce((acc, o) => acc + (o.maxAssignments || 5), 0),
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