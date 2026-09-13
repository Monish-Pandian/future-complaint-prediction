const authService = require('../services/authService');
const { sendSuccess } = require('../utils/responseHandler');

/**
 * Register new user
 * @route POST /api/v1/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, officerId, department } = req.body;
    const result = await authService.register({
      name,
      email,
      password,
      role,
      officerId,
      department,
    });
    return sendSuccess(res, 201, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * @route POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user
 * @route GET /api/v1/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const result = await authService.getMe(req.user._id);
    return sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * @route POST /api/v1/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, {
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
};
