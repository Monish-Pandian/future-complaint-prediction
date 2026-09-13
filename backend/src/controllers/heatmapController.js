const heatmapService = require('../services/heatmapService');
const { sendSuccess } = require('../utils/responseHandler');

/**
 * Nearby Predicted Problem Heatmap Query
 * Supports latitude, longitude, radius (km), department, riskLevel filters
 * @route GET /api/v1/heatmap/nearby
 */
const getNearbyHeatmap = async (req, res, next) => {
  try {
    const nearbyData = await heatmapService.getNearbyHeatmapData(req.query, req.user);
    return sendSuccess(res, 200, nearbyData);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNearbyHeatmap,
};
