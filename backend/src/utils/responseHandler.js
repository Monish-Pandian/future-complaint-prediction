/**
 * Standard Success Response Formatter
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {any} data
 * @param {string} [message]
 */
const sendSuccess = (res, statusCode = 200, data = {}) => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};

/**
 * Standard Error Response Formatter
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {Array<any>} errors
 */
const sendError = (res, statusCode = 500, message = 'Internal Server Error', errors = []) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [errors],
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
