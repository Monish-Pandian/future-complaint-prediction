import axiosInstance from './axiosInstance';

/**
 * Fetch officer personal dashboard statistics & active workload
 */
export async function getOfficerDashboard() {
  const response = await axiosInstance.get('/officer/dashboard');
  if (response.data && response.data.success && response.data.data) {
    return {
      data: response.data.data,
      isLive: true,
    };
  }
  throw new Error('Unexpected response format from officer dashboard API');
}

/**
 * Fetch list of assignments dispatched to the authenticated officer
 */
export async function getMyAssignments() {
  const response = await axiosInstance.get('/officer/assignments');
  if (response.data && response.data.success && response.data.data) {
    const list = response.data.data.assignments || response.data.data || [];
    return {
      data: list,
      isLive: true,
    };
  }
  throw new Error('Unexpected response format from officer assignments API');
}

/**
 * Officer: Accept AI Dispatch Assignment
 */
export async function acceptAssignment(assignmentId) {
  try {
    const response = await axiosInstance.patch(`/officer/assignments/${assignmentId}/accept`);
    return response.data;
  } catch (error) {
    console.error('Failed to accept assignment:', error?.message);
    throw error;
  }
}

/**
 * Officer: Start Field Task (Transition to IN_PROGRESS)
 */
export async function startAssignment(assignmentId) {
  try {
    const response = await axiosInstance.patch(`/officer/assignments/${assignmentId}/start`);
    return response.data;
  } catch (error) {
    console.error('Failed to start assignment:', error?.message);
    throw error;
  }
}

/**
 * Officer: Reject Assignment
 */
export async function rejectAssignment(assignmentId, reason) {
  try {
    const response = await axiosInstance.patch(`/officer/assignments/${assignmentId}/reject`, { reason });
    return response.data;
  } catch (error) {
    console.error('Failed to reject assignment:', error?.message);
    throw error;
  }
}

/**
 * Officer: Submit Ground Truth Field Verification
 */
export async function submitOfficerVerification(payload) {
  try {
    const response = await axiosInstance.post('/officer/verifications', payload);
    return response.data;
  } catch (error) {
    console.error('Failed to submit verification:', error?.message);
    throw error;
  }
}

/**
 * Officer: Fetch Department-Scoped Spatial Activity Heatmap
 */
export async function getOfficerDepartmentHeatmap() {
  const response = await axiosInstance.get('/officer/heatmap');
  if (response.data && response.data.success && response.data.data) {
    return {
      data: response.data.data,
      isLive: true,
    };
  }
  throw new Error('Unexpected response format from officer heatmap API');
}

/**
 * Officer: Get assigned verification candidates
 * GET /verifications/officer/candidates
 */
export async function getOfficerVerificationCandidates(params = {}) {
  const response = await axiosInstance.get('/verifications/officer/candidates', { params });
  if (response.data?.success && response.data?.data) {
    return {
      data: response.data.data,
      isLive: true,
    };
  }
  throw new Error('Unexpected response format from verification candidates API');
}

/**
 * Officer: Accept assigned verification candidate
 * PATCH /verifications/officer/candidates/:id/accept
 */
export async function acceptVerificationCandidate(candidateId) {
  const response = await axiosInstance.patch(`/verifications/officer/candidates/${candidateId}/accept`);
  return response.data;
}

/**
 * Officer: Reject assigned verification candidate
 * PATCH /verifications/officer/candidates/:id/reject
 */
export async function rejectVerificationCandidate(candidateId, payload = {}) {
  const response = await axiosInstance.patch(`/verifications/officer/candidates/${candidateId}/reject`, payload);
  return response.data;
}

export default {
  getOfficerDashboard,
  getMyAssignments,
  acceptAssignment,
  startAssignment,
  rejectAssignment,
  submitOfficerVerification,
  getOfficerDepartmentHeatmap,
  getOfficerVerificationCandidates,
  acceptVerificationCandidate,
  rejectVerificationCandidate,
};
