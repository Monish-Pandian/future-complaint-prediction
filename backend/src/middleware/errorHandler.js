const ApiError = require('../utils/apiError');

/**
 * Centralized Application Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = err instanceof ApiError ? err : null;

  // 1. Handle SyntaxError for Malformed JSON body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = new ApiError(400, 'Malformed JSON payload in request body');
  }

  // 2. Handle Mongoose CastError (Bad ObjectId / type conversion failure)
  else if (err.name === 'CastError') {
    const message = `Invalid identifier or parameter value: '${err.value}' for path '${err.path}'`;
    error = new ApiError(400, message);
  }

  // 3. Handle Mongoose Duplicate Key Error (Code 11000 -> 409 Conflict)
  else if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {}).join(', ');
    const message = `Duplicate value entered for unique field(s): ${fields || 'resource'}`;
    error = new ApiError(409, message);
  }

  // 4. Handle Mongoose Schema ValidationError
  else if (err.name === 'ValidationError') {
    const errors = Object.keys(err.errors || {}).map((key) => ({
      field: key,
      message: err.errors[key].message,
    }));
    const message = errors.length > 0 ? errors[0].message : 'Validation failed';
    error = new ApiError(400, message, errors);
  }

  // 5. Handle JSON Web Token Errors
  else if (err.name === 'JsonWebTokenError') {
    error = new ApiError(401, 'Invalid authentication token');
  } else if (err.name === 'TokenExpiredError') {
    error = new ApiError(401, 'Authentication token has expired');
  }

  // 6. Handle Database Connection / Outage Errors
  else if (
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    err.name === 'MongooseServerSelectionError'
  ) {
    error = new ApiError(
      503,
      'Database service is currently unavailable. Please try again later.'
    );
  }

  // 7. Fallback for unhandled server errors
  if (!error) {
    const statusCode = err.statusCode || 500;
    const message =
      process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'Internal Server Error'
        : err.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, err.errors || []);
  }

  // Server-Side Logging (Section 21)
  if (process.env.NODE_ENV !== 'production' || error.statusCode >= 500) {
    console.error(
      `[${new Date().toISOString()}] [${req.method} ${req.originalUrl}] Status: ${error.statusCode} - ${error.message}`
    );
    if (error.statusCode >= 500 && err.stack) {
      console.error(err.stack);
    }
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  const errors = Array.isArray(error.errors) ? error.errors : [];

  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

module.exports = errorHandler;
