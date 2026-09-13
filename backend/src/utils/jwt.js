const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT token
 * @param {Object} user - User document or user object
 * @param {string} [expiresIn] - Optional custom expiration
 * @returns {string} - Signed JWT token
 */
const generateToken = (user, expiresIn) => {
  const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_civic_forecasting_2026_secure';
  const expiration = expiresIn || process.env.JWT_EXPIRES_IN || '7d';

  const payload = {
    userId: user._id ? user._id.toString() : user.id,
    role: user.role,
  };

  if (user.officerId) {
    payload.officerId = user.officerId;
  }

  return jwt.sign(payload, secret, { expiresIn: expiration });
};

/**
 * Verify and decode a JWT token
 * @param {string} token
 * @returns {Object} Decoded payload
 */
const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_civic_forecasting_2026_secure';
  return jwt.verify(token, secret);
};

module.exports = {
  generateToken,
  verifyToken,
};
