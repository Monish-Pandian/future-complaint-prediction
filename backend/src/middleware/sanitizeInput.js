const ApiError = require('../utils/apiError');

/**
 * Check if a key or string contains MongoDB operator injections ($ or .)
 * @param {string} key
 * @returns {boolean}
 */
const hasMongoOperators = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      return true;
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (hasMongoOperators(obj[key])) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Middleware to sanitize query and params against NoSQL operator injection ($ne, $gt, etc.)
 */
const sanitizeNoSql = (req, res, next) => {
  if (req.query && hasMongoOperators(req.query)) {
    return next(
      new ApiError(400, 'Invalid query parameter: NoSQL operators are not permitted.')
    );
  }

  if (req.params && hasMongoOperators(req.params)) {
    return next(
      new ApiError(400, 'Invalid route parameter: NoSQL operators are not permitted.')
    );
  }

  next();
};

module.exports = {
  sanitizeNoSql,
  hasMongoOperators,
};
