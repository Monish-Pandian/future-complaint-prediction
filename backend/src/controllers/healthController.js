/**
 * Health Check Controller
 * @route GET /api/v1/health
 * @access Public
 */
const aiService = require('../services/aiService');
const { sendSuccess } = require('../utils/responseHandler');

const getHealth = (req, res) => {
  return res.status(200).json({
    success: true,
    service: 'civic-forecasting-api',
    status: 'healthy',
  });
};

/**
 * AI Service Health Check
 * @route GET /api/v1/health/ai
 * @access Private (Admin)
 */
const getAiHealth = async (req, res, next) => {
  try {
    const health = await aiService.checkAiServiceHealth();
    return sendSuccess(res, 200, health);
  } catch (error) {
    next(error);
  }
};

/**
 * AI Model Info
 * @route GET /api/v1/health/ai/model-info
 * @access Private (Admin)
 */
const getAiModelInfo = async (req, res, next) => {
  try {
    const info = await aiService.getAiModelInfo();
    return sendSuccess(res, 200, info);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHealth,
  getAiHealth,
  getAiModelInfo,
};