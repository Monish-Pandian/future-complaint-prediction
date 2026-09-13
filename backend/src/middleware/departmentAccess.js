const ApiError = require('../utils/apiError');
const { ROLES } = require('../models/User');

/**
 * Department Access Control Middleware
 * Enforces department-level data isolation:
 * - Officer department strictly derived from verified DB user record (req.user.department).
 * - Client parameters in body/query cannot override or forge officer's department.
 * - If officer attempts to access data for another department, reject with 403 Forbidden.
 * - Admin has global municipal access (can filter by any department or view all).
 */
const departmentAccess = (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required.'));
  }

  const userRole = (req.user.role || '').toUpperCase();

  if (userRole === ROLES.OFFICER) {
    const officerDepartment = req.user.department;

    if (!officerDepartment) {
      return next(
        new ApiError(403, 'Forbidden: Officer is not assigned to any department.')
      );
    }

    // Inspect if client explicitly requested a different department in params or query
    const requestedDept = req.params.department || req.query.department;
    if (requestedDept && requestedDept.toLowerCase() !== officerDepartment.toLowerCase()) {
      return next(
        new ApiError(
          403,
          `Forbidden: You cannot access operational data for '${requestedDept}'. Access restricted to your department: '${officerDepartment}'.`
        )
      );
    }

    // Enforce verified officer department into request context
    req.department = officerDepartment;
    req.departmentFilter = { department: officerDepartment };
    
    // Sanitize any user-supplied department field in query or body
    if (req.query) {
      req.query.department = officerDepartment;
    }
    if (req.body && typeof req.body === 'object') {
      req.body.department = officerDepartment;
    }

    return next();
  }

  if (userRole === ROLES.ADMIN) {
    // Admin has global access with optional department filtering
    const requestedDept = req.params.department || req.query.department || null;
    req.department = requestedDept;
    req.departmentFilter = requestedDept ? { department: requestedDept } : {};
    return next();
  }

  return next(new ApiError(403, 'Forbidden: Unrecognized role.'));
};

module.exports = departmentAccess;
