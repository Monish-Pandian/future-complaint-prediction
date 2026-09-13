import axiosInstance from './axiosInstance';

/**
 * Authenticate user credentials against backend
 * @param {Object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @returns {Promise<Object>} Object containing { user, token }
 */
export async function loginUser(credentials) {
  try {
    const response = await axiosInstance.post('/auth/login', {
      email: credentials.email.trim(),
      password: credentials.password,
    });

    const data = response.data?.data || response.data;
    return data;
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0] ||
      (error.response?.status === 401 ? 'Invalid email or password.' : null) ||
      (error.response?.status === 429 ? 'Too many login attempts. Please try again later.' : null) ||
      error.message ||
      'Authentication failed. Please check your credentials.';
    throw new Error(message);
  }
}

/**
 * Verify current session and retrieve authenticated profile
 * @returns {Promise<Object>}
 */
export async function getMe() {
  try {
    const response = await axiosInstance.get('/auth/me');
    return response.data?.data || response.data;
  } catch (error) {
    throw error;
  }
}

export default {
  loginUser,
  getMe,
};
