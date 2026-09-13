/**
 * Standard Custom API Error Class
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends ApiError {
  constructor(message = 'Bad Request', errors = []) {
    super(400, message, errors);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(401, message);
  }
}

class ForbiddenError extends ApiError {
  constructor(message = 'Access forbidden') {
    super(403, message);
  }
}

class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

class ConflictError extends ApiError {
  constructor(message = 'Resource conflict or duplicate state') {
    super(409, message);
  }
}

class ValidationError extends ApiError {
  constructor(message = 'Validation failed', errors = []) {
    super(422, message, errors);
  }
}

class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service temporarily unavailable') {
    super(503, message);
  }
}

module.exports = ApiError;
module.exports.ApiError = ApiError;
module.exports.BadRequestError = BadRequestError;
module.exports.UnauthorizedError = UnauthorizedError;
module.exports.ForbiddenError = ForbiddenError;
module.exports.NotFoundError = NotFoundError;
module.exports.ConflictError = ConflictError;
module.exports.ValidationError = ValidationError;
module.exports.ServiceUnavailableError = ServiceUnavailableError;
