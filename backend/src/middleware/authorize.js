const ApiError = require('../utils/apiError');

/**
 * Role-Based Access Control (RBAC) Authorization Middleware
 * Usage:
 *   authorize('ADMIN')
 *   authorize('OFFICER')
 *   authorize('ADMIN', 'OFFICER')
 *   authorize(['ADMIN', 'OFFICER'])
 * 
 * @param  {...string|string[]} allowedRoles
 */
const authorize = (...allowedRoles) => {
  // Flatten array in case an array was passed as a single argument
  const roles = allowedRoles.flat().map((r) => String(r).toUpperCase());

  return (req, res, next) => {
    // 1. Ensure user is authenticated
    if (!req.user) {
      return next(
        new ApiError(401, 'Authentication required. Please provide a valid Bearer token.')
      );
    }

    const userRole = (req.user.role || '').toUpperCase();

    // 2. Check if user's role is in the allowed list
    if (!roles.includes(userRole)) {
      return next(
        new ApiError(
          403,
          `Access forbidden. Role '${req.user.role}' is not authorized to access this resource.`
        )
      );
    }

    next();
  };
};

module.exports = authorize;
