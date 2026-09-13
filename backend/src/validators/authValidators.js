const ApiError = require('../utils/apiError');
const { ROLES } = require('../models/User');

/**
 * Validate registration payload
 */
const validateRegister = (req, res, next) => {
  const { name, email, password, role } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('Name is required');
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    errors.push('A valid email address is required');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  // Prevent public registration as ADMIN
  if (role) {
    if (role.toUpperCase() === ROLES.ADMIN) {
      return next(
        new ApiError(
          403,
          'Public registration cannot create ADMIN accounts. Admin accounts must be created via secure system provisioning.'
        )
      );
    }

    if (![ROLES.ADMIN, ROLES.OFFICER].includes(role.toUpperCase())) {
      errors.push(`Invalid role specified. Allowed roles: ${ROLES.OFFICER}`);
    }
  }

  if (errors.length > 0) {
    return next(new ApiError(400, 'Validation Error', errors));
  }

  next();
};

/**
 * Validate login payload
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.push('Email is required');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return next(new ApiError(400, 'Validation Error', errors));
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
};
