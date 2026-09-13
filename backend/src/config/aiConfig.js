/**
 * AI Service Client Configuration
 * Manages URL endpoints, API authentication, timeout, retries, and mock provider switches
 */

const aiConfig = {
  // Service Endpoint
  url: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000',

  // Service-to-Service API Key (Excluded from logs and clients)
  apiKey: process.env.AI_SERVICE_API_KEY || '',

  // Request Timeout in Milliseconds (Default 30 seconds)
  timeoutMs: parseInt(process.env.AI_SERVICE_TIMEOUT || '30000', 10),

  // Feature Flag: Enable/Disable Remote AI Prediction Calls
  enabled: process.env.AI_SERVICE_ENABLED === 'true',

  // Mock Provider Toggle: Use deterministic mock adapter for testing/dev
  useMock:
    process.env.AI_SERVICE_MOCK === 'true' ||
    process.env.NODE_ENV === 'test' ||
    !process.env.AI_SERVICE_URL,

  // Maximum Retries for Transient Network Failures
  maxRetries: parseInt(process.env.AI_SERVICE_RETRIES || '2', 10),

  // Default Model Version Tag
  defaultModelVersion: process.env.AI_MODEL_VERSION || 'baseline-spatial-v1',

  // MongoDB-driven prediction mode (bypasses FastAPI, uses local model)
  useMongoPrediction: process.env.AI_USE_MONGO_PREDICTION === 'true',

  // MongoDB prediction fallback to FastAPI if model not available
  mongoPredictionFallback: process.env.AI_MONGO_FALLBACK !== 'false',
};

module.exports = aiConfig;
