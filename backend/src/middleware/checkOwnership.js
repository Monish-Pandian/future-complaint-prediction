const ApiError = require('../utils/apiError');
const { ROLES } = require('../models/User');

/**
 * Middleware to check resource ownership for Officers
 * - ADMIN has global access to all officer resources.
 * - OFFICER can only access resources matching their own ID or officerId.
 *
 * @param {string} paramName - Name of the route parameter containing target ID (e.g. 'officerId', 'userId', 'id')
 */
const checkOwnership = (paramName = 'officerId') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }

    const userRole = (req.user.role || '').toUpperCase();

    // Admin has unrestricted access
    if (userRole === ROLES.ADMIN) {
      return next();
    }

    if (userRole === ROLES.OFFICER) {
      const targetId =
        req.params[paramName] ||
        req.params.officerId ||
        req.params.id ||
        req.body[paramName] ||
        req.body.officerId;

      const authenticatedUserId = req.user._id ? req.user._id.toString() : req.user.id;
      const authenticatedOfficerId = req.user.officerId;

      if (!targetId) {
        return next();
      }

      // Check if targetId is an officer identifier string or matches officer identifier patterns
      if (
        targetId.startsWith('OFF-') ||
        targetId.startsWith('TEST-') ||
        targetId.includes('EMP') ||
        targetId.includes('OFFICER')
      ) {
        const isOwner =
          targetId === authenticatedOfficerId || targetId === authenticatedUserId;

        if (!isOwner) {
          return next(
            new ApiError(
              403,
              'Forbidden: You are not authorized to view or modify another officer’s private resources.'
            )
          );
        }
      }

      return next();
    }

    return next(new ApiError(403, 'Forbidden: Unauthorized access.'));
  };
};

module.exports = checkOwnership;
