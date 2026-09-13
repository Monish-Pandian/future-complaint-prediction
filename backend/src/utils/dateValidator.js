const ApiError = require('./apiError');

/**
 * Validate ISO date range parameters
 * @param {string|Date} startDateStr
 * @param {string|Date} endDateStr
 * @returns {{ startDate: Date|null, endDate: Date|null }}
 */
const validateDateRange = (startDateStr, endDateStr) => {
  let startDate = null;
  let endDate = null;

  if (startDateStr) {
    startDate = new Date(startDateStr);
    if (isNaN(startDate.getTime())) {
      throw new ApiError(400, `Invalid startDate format '${startDateStr}'. Must be a valid ISO date string.`);
    }
  }

  if (endDateStr) {
    endDate = new Date(endDateStr);
    if (isNaN(endDate.getTime())) {
      throw new ApiError(400, `Invalid endDate format '${endDateStr}'. Must be a valid ISO date string.`);
    }
  }

  if (startDate && endDate && startDate > endDate) {
    throw new ApiError(
      400,
      `Invalid date range: startDate (${startDateStr}) cannot be after endDate (${endDateStr}).`
    );
  }

  return { startDate, endDate };
};

module.exports = {
  validateDateRange,
};
