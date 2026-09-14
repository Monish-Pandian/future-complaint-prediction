const ApiError = require('../utils/apiError');
const { AVAILABILITY_STATUS } = require('../models/Officer');

const normalizeAvailability = (status) => {
  if (!status || typeof status !== 'string') return null;
  const upper = status.toUpperCase().trim();
  if (upper === 'OFFLINE') return AVAILABILITY_STATUS.OFF_DUTY;
  return upper;
};

/**
 * Validate officer creation request
 */
const validateCreateOfficer = (req, res, next) => {
  const { name, department, employeeCode, phone, skills, availability, location, maxAssignments, homeCommunityArea } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('Officer name is required');
  }

  if (!department || typeof department !== 'string' || !department.trim()) {
    errors.push('Department is required');
  }

  if (!employeeCode || typeof employeeCode !== 'string' || !employeeCode.trim()) {
    errors.push('Employee code is required');
  }

  if (availability) {
    const normalized = normalizeAvailability(availability);
    if (!Object.values(AVAILABILITY_STATUS).includes(normalized)) {
      errors.push(
        `Invalid availability status. Allowed values: ${Object.values(AVAILABILITY_STATUS).join(', ')}`
      );
    }
  }

  if (skills && !Array.isArray(skills)) {
    errors.push('Skills must be an array of strings');
  }

  if (maxAssignments !== undefined) {
    const val = Number(maxAssignments);
    if (isNaN(val) || val < 0) {
      errors.push('maxAssignments must be a non-negative number');
    }
  }

  if (location) {
    if (
      !location.coordinates ||
      !Array.isArray(location.coordinates) ||
      location.coordinates.length !== 2 ||
      typeof location.coordinates[0] !== 'number' ||
      typeof location.coordinates[1] !== 'number' ||
      location.coordinates[0] < -180 ||
      location.coordinates[0] > 180 ||
      location.coordinates[1] < -90 ||
      location.coordinates[1] > 90
    ) {
      errors.push(
        'Location coordinates must be valid GeoJSON [longitude (-180 to 180), latitude (-90 to 90)]'
      );
    }
  }

  if (errors.length > 0) {
    return next(new ApiError(400, 'Validation Error', errors));
  }

  next();
};

/**
 * Validate officer update request
 */
const validateUpdateOfficer = (req, res, next) => {
  const { availability, skills, location, maxAssignments, homeCommunityArea } = req.body;
  const errors = [];

  if (availability) {
    const normalized = normalizeAvailability(availability);
    if (!Object.values(AVAILABILITY_STATUS).includes(normalized)) {
      errors.push(
        `Invalid availability status. Allowed values: ${Object.values(AVAILABILITY_STATUS).join(', ')}`
      );
    }
  }

  if (skills && !Array.isArray(skills)) {
    errors.push('Skills must be an array of strings');
  }

  if (maxAssignments !== undefined) {
    const val = Number(maxAssignments);
    if (isNaN(val) || val < 0) {
      errors.push('maxAssignments must be a non-negative number');
    }
  }

  if (location && location.coordinates) {
    if (
      !Array.isArray(location.coordinates) ||
      location.coordinates.length !== 2 ||
      typeof location.coordinates[0] !== 'number' ||
      typeof location.coordinates[1] !== 'number' ||
      location.coordinates[0] < -180 ||
      location.coordinates[0] > 180 ||
      location.coordinates[1] < -90 ||
      location.coordinates[1] > 90
    ) {
      errors.push(
        'Location coordinates must be valid GeoJSON [longitude (-180 to 180), latitude (-90 to 90)]'
      );
    }
  }

  if (errors.length > 0) {
    return next(new ApiError(400, 'Validation Error', errors));
  }

  next();
};

/**
 * Validate status/availability update
 */
const validateUpdateStatus = (req, res, next) => {
  const { active, availability } = req.body;
  const errors = [];

  if (active === undefined && availability === undefined) {
    errors.push('At least one of "active" or "availability" must be provided');
  }

  if (active !== undefined && typeof active !== 'boolean') {
    errors.push('"active" must be a boolean (true or false)');
  }

  if (availability) {
    const normalized = normalizeAvailability(availability);
    if (!Object.values(AVAILABILITY_STATUS).includes(normalized)) {
      errors.push(
        `Invalid availability status. Allowed values: ${Object.values(AVAILABILITY_STATUS).join(', ')}`
      );
    }
  }

  if (errors.length > 0) {
    return next(new ApiError(400, 'Validation Error', errors));
  }

  next();
};

module.exports = {
  validateCreateOfficer,
  validateUpdateOfficer,
  validateUpdateStatus,
};
