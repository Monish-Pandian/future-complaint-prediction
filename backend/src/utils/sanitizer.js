const ApiError = require('./apiError');

/**
 * Escape special regex characters to prevent ReDoS & NoSQL injection
 * @param {string} str
 * @returns {string}
 */
const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100);
};

/**
 * Sanitize string input
 * @param {any} val
 * @returns {string}
 */
const sanitizeString = (val) => {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, 255);
};

/**
 * Validate and compute pagination parameters
 * @param {Object} queryParams
 * @returns {{ page: number, limit: number, skip: number }}
 */
const validatePagination = (queryParams = {}) => {
  if (queryParams.page !== undefined) {
    const p = Number(queryParams.page);
    if (isNaN(p) || p < 1 || !Number.isInteger(p)) {
      throw new ApiError(
        400,
        `Invalid page parameter '${queryParams.page}'. Must be an integer >= 1.`
      );
    }
  }

  if (queryParams.limit !== undefined) {
    const l = Number(queryParams.limit);
    if (isNaN(l) || l < 1 || l > 100 || !Number.isInteger(l)) {
      throw new ApiError(
        400,
        `Invalid limit parameter '${queryParams.limit}'. Must be an integer between 1 and 100.`
      );
    }
  }

  const page = parseInt(queryParams.page, 10) || 1;
  const limit = parseInt(queryParams.limit, 10) || 10;
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Validate sorting parameter against an explicit allowlist
 * @param {Object} queryParams
 * @param {Array<string>} allowedFields
 * @param {Object|string} defaultSort
 * @returns {Object|string}
 */
const validateSort = (queryParams = {}, allowedFields = [], defaultSort = { createdAt: -1 }) => {
  if (!queryParams.sortBy && !queryParams.sort) {
    return defaultSort;
  }

  if (queryParams.sortBy) {
    const field = sanitizeString(queryParams.sortBy);
    if (!allowedFields.includes(field)) {
      throw new ApiError(
        400,
        `Invalid sort field '${field}'. Allowed sort fields are: [${allowedFields.join(', ')}]`
      );
    }
    const order = queryParams.sortOrder === 'asc' || queryParams.sortOrder === '1' ? 1 : -1;
    return { [field]: order };
  }

  if (queryParams.sort) {
    const rawSort = sanitizeString(queryParams.sort);
    const sortField = rawSort.startsWith('-') ? rawSort.slice(1) : rawSort;
    if (!allowedFields.includes(sortField)) {
      throw new ApiError(
        400,
        `Invalid sort field '${sortField}'. Allowed sort fields are: [${allowedFields.join(', ')}]`
      );
    }
    return rawSort;
  }

  return defaultSort;
};

module.exports = {
  escapeRegex,
  sanitizeString,
  validatePagination,
  validateSort,
};
