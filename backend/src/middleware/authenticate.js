const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const ApiError = require('../utils/apiError');
const { verifyToken } = require('../utils/jwt');

/**
 * Authentication Middleware
 * 1. Read Bearer token
 * 2. Verify JWT
 * 3. Find user in database
 * 4. Check isActive status
 * 5. Attach authenticated user to req.user
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1. Read Bearer token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required. Bearer token missing.');
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.trim() === '') {
      throw new ApiError(401, 'Authentication token cannot be empty.');
    }

    // 2. Verify JWT
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new ApiError(401, 'Authentication token has expired. Please log in again.');
      }
      throw new ApiError(401, 'Invalid authentication token.');
    }

    const userId = decoded.userId || decoded.id;
    if (!userId) {
      throw new ApiError(401, 'Invalid token payload: userId missing.');
    }

    // 3. Find user in database
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(401, 'User associated with this token no longer exists.');
    }

    // 4. Check isActive
    if (!user.isActive) {
      throw new ApiError(403, 'Account is deactivated. Please contact an administrator.');
    }

    // 5. Attach authenticated user to req.user
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;
