const ApiError = require('../utils/apiError');

/**
 * 404 Not Found Handler Middleware
 */
const notFound = (req, res, next) => {
  const error = new ApiError(404, `Route not found - ${req.originalUrl}`);
  next(error);
};

module.exports = notFound;
