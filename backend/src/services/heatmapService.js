const mongoose = require('mongoose');
const { Prediction, RISK_LEVELS } = require('../models/Prediction');
const { Officer } = require('../models/Officer');
const { validateDateRange } = require('../utils/dateValidator');
const ApiError = require('../utils/apiError');

/**
 * Validate latitude and longitude geographic coordinates
 * @param {number|string} lat
 * @param {number|string} lon
 * @returns {{ latitude: number, longitude: number }}
 */
const validateCoordinates = (lat, lon) => {
  if (lat === undefined || lat === null || lat === '' || isNaN(Number(lat))) {
    throw new ApiError(
      400,
      'Valid latitude parameter is required (numeric between -90 and 90).'
    );
  }
  if (lon === undefined || lon === null || lon === '' || isNaN(Number(lon))) {
    throw new ApiError(
      400,
      'Valid longitude parameter is required (numeric between -180 and 180).'
    );
  }

  const latitude = Number(lat);
  const longitude = Number(lon);

  if (latitude < -90 || latitude > 90) {
    throw new ApiError(
      400,
      `Invalid latitude: ${lat}. Latitude must be between -90 and 90 degrees.`
    );
  }

  if (longitude < -180 || longitude > 180) {
    throw new ApiError(
      400,
      `Invalid longitude: ${lon}. Longitude must be between -180 and 180 degrees.`
    );
  }

  return { latitude, longitude };
};

/**
 * Validate and clamp search radius in kilometers
 * @param {number|string} radius
 * @param {number} [maxLimit=50]
 * @returns {number}
 */
const validateRadiusKm = (radius, maxLimit = 50) => {
  if (radius === undefined || radius === null || radius === '') {
    return 5; // Default 5 km
  }

  const radiusNum = Number(radius);
  if (isNaN(radiusNum) || radiusNum <= 0) {
    throw new ApiError(400, 'Radius must be a positive numeric value in kilometers.');
  }

  if (radiusNum > maxLimit) {
    throw new ApiError(
      400,
      `Requested radius (${radiusNum} km) exceeds the maximum allowed search limit of ${maxLimit} km.`
    );
  }

  return radiusNum;
};

/**
 * Format a Prediction document into a geographic heatmap item and GeoJSON Feature
 * Coordinate order is strictly GeoJSON standard: [longitude, latitude]
 * @param {Object} pred - Mongoose Prediction document
 */
const formatGeoItem = (pred) => {
  const coords = pred.location?.coordinates || [0, 0];
  const longitude = coords[0];
  const latitude = coords[1];

  let assignedOfficerData = null;
  if (pred.assignedOfficer && typeof pred.assignedOfficer === 'object') {
    assignedOfficerData = {
      id: pred.assignedOfficer._id || pred.assignedOfficer.id,
      officerId: pred.assignedOfficer.officerId,
      name: pred.assignedOfficer.name,
      employeeCode: pred.assignedOfficer.employeeCode,
      department: pred.assignedOfficer.department,
    };
  }

  const predictionWindow = {
    start: pred.predictionWindowStart || pred.predictionDate,
    end: pred.predictionWindowEnd || null,
  };

  const pointItem = {
    predictionId: pred.predictionId,
    latitude,
    longitude,
    communityArea: pred.communityArea,
    ward: pred.ward,
    department: pred.department,
    complaintType: pred.complaintType,
    riskScore: pred.riskScore,
    riskLevel: pred.riskLevel,
    probability: pred.probability,
    predictionWindow,
    verificationStatus: pred.verificationStatus,
    assignedOfficer: assignedOfficerData,
  };

  const geoJsonFeature = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [longitude, latitude], // GeoJSON standard [lng, lat]
    },
    properties: {
      ...pointItem,
    },
  };

  return { pointItem, geoJsonFeature };
};

/**
 * Build GeoJSON FeatureCollection response
 * @param {Array} predictions
 * @param {Object} [extraMeta]
 */
const buildGeoJsonResponse = (predictions, extraMeta = {}) => {
  const points = [];
  const features = [];

  for (const pred of predictions) {
    const { pointItem, geoJsonFeature } = formatGeoItem(pred);
    points.push(pointItem);
    features.push(geoJsonFeature);
  }

  return {
    type: 'FeatureCollection',
    department: extraMeta.department || 'ALL',
    scope: extraMeta.scope || 'HEATMAP',
    totalFeatures: features.length,
    features,
    points,
    meta: {
      timestamp: new Date().toISOString(),
      mapType: 'PREDICTED_RISK_HEATMAP',
      ...extraMeta,
    },
  };
};

/**
 * Get Heatmap Data for Admin or Officer with filters & date validation
 * @param {Object} queryParams - Filters: department, complaintType, riskLevel, ward, communityArea, predictionCycleId, startDate, endDate, date
 * @param {Object} [user] - Authenticated user context
 */
const getHeatmapData = async (queryParams = {}, user = null) => {
  const filter = {};

  let departmentName = 'ALL';

  // 1. Department isolation for Officers
  if (user && user.role === 'OFFICER') {
    const officerDoc = await Officer.findOne({
      $or: [{ userId: user._id }, { officerId: user.officerId }],
    });
    departmentName = (officerDoc?.department || user.department || 'Municipal').trim();
    filter.department = { $regex: new RegExp(`^${departmentName}$`, 'i') };
  } else if (queryParams.department && queryParams.department.trim()) {
    // Admin filtering by department
    departmentName = queryParams.department.trim();
    filter.department = { $regex: new RegExp(`^${departmentName}$`, 'i') };
  }

  // 2. Complaint Type Filter
  if (queryParams.complaintType && queryParams.complaintType.trim()) {
    filter.complaintType = { $regex: new RegExp(queryParams.complaintType.trim(), 'i') };
  }

  // 3. Risk Level Filter
  if (queryParams.riskLevel && queryParams.riskLevel.trim()) {
    const risk = queryParams.riskLevel.toUpperCase().trim();
    if (Object.values(RISK_LEVELS).includes(risk)) {
      filter.riskLevel = risk;
    }
  }

  // 4. Ward Filter
  if (queryParams.ward && queryParams.ward.trim()) {
    filter.ward = { $regex: new RegExp(`^${queryParams.ward.trim()}$`, 'i') };
  }

  // 5. Community Area Filter
  if (queryParams.communityArea && queryParams.communityArea.trim()) {
    filter.communityArea = { $regex: new RegExp(queryParams.communityArea.trim(), 'i') };
  }

  // 6. Prediction Cycle Filter
  if (queryParams.predictionCycleId && mongoose.Types.ObjectId.isValid(queryParams.predictionCycleId)) {
    filter.predictionCycleId = queryParams.predictionCycleId;
  }

  // 7. Date Range Validation & Filter
  if (queryParams.startDate || queryParams.endDate) {
    const { startDate, endDate } = validateDateRange(queryParams.startDate, queryParams.endDate);
    filter.predictionDate = {};
    if (startDate) filter.predictionDate.$gte = startDate;
    if (endDate) filter.predictionDate.$lte = endDate;
  } else if (queryParams.date) {
    const targetDate = new Date(queryParams.date);
    if (!isNaN(targetDate.getTime())) {
      filter.predictionWindowStart = { $lte: targetDate };
      filter.predictionWindowEnd = { $gte: targetDate };
    }
  }

  const limit = Math.min(1000, parseInt(queryParams.limit, 10) || 500);

  const predictions = await Prediction.find(filter)
    .populate('assignedOfficer', 'name employeeCode officerId department phone')
    .sort('-riskScore')
    .limit(limit);

  return buildGeoJsonResponse(predictions, {
    scope: user?.role === 'OFFICER' ? 'DEPARTMENT_ISOLATED' : 'GLOBAL_ADMIN',
    department: departmentName,
  });
};

/**
 * Retrieve nearby predicted problem locations via MongoDB geospatial queries
 * @param {Object} queryParams - latitude, longitude, radius, riskLevel, department
 * @param {Object} user - Authenticated user
 */
const getNearbyHeatmapData = async (queryParams, user) => {
  // Validate geographic coordinates
  const { latitude, longitude } = validateCoordinates(
    queryParams.latitude,
    queryParams.longitude
  );

  // Validate and clamp radius in km (max 50 km)
  const radiusKm = validateRadiusKm(queryParams.radius, 50);

  // Convert km to radians for MongoDB $centerSphere (Earth radius ~6378.1 km)
  const earthRadiusKm = 6378.1;
  const radians = radiusKm / earthRadiusKm;

  const filter = {
    location: {
      $geoWithin: {
        $centerSphere: [[longitude, latitude], radians],
      },
    },
  };

  // Enforce department isolation for Officer users
  if (user && user.role === 'OFFICER') {
    const officerDoc = await Officer.findOne({
      $or: [{ userId: user._id }, { officerId: user.officerId }],
    });
    const officerDept = (officerDoc?.department || user.department || 'Municipal').trim();
    filter.department = { $regex: new RegExp(`^${officerDept}$`, 'i') };
  } else if (queryParams.department && queryParams.department.trim()) {
    filter.department = { $regex: new RegExp(`^${queryParams.department.trim()}$`, 'i') };
  }

  if (queryParams.riskLevel && queryParams.riskLevel.trim()) {
    const risk = queryParams.riskLevel.toUpperCase().trim();
    if (Object.values(RISK_LEVELS).includes(risk)) {
      filter.riskLevel = risk;
    }
  }

  const limit = Math.min(500, parseInt(queryParams.limit, 10) || 200);

  const predictions = await Prediction.find(filter)
    .populate('assignedOfficer', 'name employeeCode officerId department phone')
    .sort('-riskScore')
    .limit(limit);

  return buildGeoJsonResponse(predictions, {
    center: {
      latitude,
      longitude,
    },
    radiusKm,
    scope: user?.role === 'OFFICER' ? 'DEPARTMENT_ISOLATED_NEARBY' : 'GLOBAL_NEARBY',
  });
};

module.exports = {
  validateCoordinates,
  validateRadiusKm,
  getHeatmapData,
  getAdminHeatmap: getHeatmapData,
  getOfficerHeatmap: getHeatmapData,
  getNearbyHeatmapData,
};
