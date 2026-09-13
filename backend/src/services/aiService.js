const axios = require('axios');
const mongoose = require('mongoose');
const aiConfig = require('../config/aiConfig');
const { Prediction, RISK_LEVELS, VERIFICATION_STATUS, TRENDS } = require('../models/Prediction');
const { PredictionCycle, CYCLE_STATUS } = require('../models/PredictionCycle');
const ApiError = require('../utils/apiError');
const { MongoPredictionService } = require('./mongoPredictionService');

const mongoPredictionService = new MongoPredictionService();

/**
 * Validate an individual AI prediction object from the AI service response
 * @param {Object} item
 * @returns {{ valid: boolean, sanitized: Object|null, errors: Array<string> }}
 */
const validateAiPredictionItem = (item) => {
  const errors = [];

  if (!item || typeof item !== 'object') {
    return { valid: false, sanitized: null, errors: ['Prediction item must be a non-null object'] };
  }

  // 1. Validate Probability (0.0 to 1.0)
  const probability = Number(item.probability);
  if (isNaN(probability) || probability < 0 || probability > 1) {
    errors.push(`Invalid probability '${item.probability}'. Must be a number between 0 and 1.`);
  }

  // 2. Validate Risk Score (0.0 to 100.0)
  const riskScore = Number(item.riskScore);
  if (isNaN(riskScore) || riskScore < 0 || riskScore > 100) {
    errors.push(`Invalid riskScore '${item.riskScore}'. Must be a number between 0 and 100.`);
  }

  // 3. Derive Risk Level if not provided or validate enum
  let riskLevel = item.riskLevel;
  if (!riskLevel || !Object.values(RISK_LEVELS).includes(riskLevel)) {
    if (riskScore >= 85) riskLevel = RISK_LEVELS.CRITICAL;
    else if (riskScore >= 70) riskLevel = RISK_LEVELS.HIGH;
    else if (riskScore >= 40) riskLevel = RISK_LEVELS.MEDIUM;
    else riskLevel = RISK_LEVELS.LOW;
  }

  // 4. Validate Department & Complaint Type
  const department = (item.department || '').trim();
  const complaintType = (item.complaintType || '').trim();
  if (!department) errors.push('Department is required in AI prediction output.');
  if (!complaintType) errors.push('Complaint type is required in AI prediction output.');

  // 5. Validate Community Area & Ward
  const communityArea = (item.communityArea || '').toString().trim();
  const ward = (item.ward || '').toString().trim();
  if (!communityArea) errors.push('Community area is required.');
  if (!ward) errors.push('Ward is required.');

  // 6. Validate Location (GeoJSON Point [longitude, latitude])
  let location = { type: 'Point', coordinates: [-87.6298, 41.8781] }; // Default central Chicago
  if (item.location && Array.isArray(item.location.coordinates) && item.location.coordinates.length === 2) {
    const lon = Number(item.location.coordinates[0]);
    const lat = Number(item.location.coordinates[1]);
    if (!isNaN(lon) && !isNaN(lat) && lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90) {
      location = { type: 'Point', coordinates: [lon, lat] };
    } else {
      errors.push(`Invalid GeoJSON coordinates [${lon}, ${lat}]. Longitude must be -180..180, Latitude -90..90.`);
    }
  } else if (item.longitude !== undefined && item.latitude !== undefined) {
    const lon = Number(item.longitude);
    const lat = Number(item.latitude);
    if (!isNaN(lon) && !isNaN(lat) && lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90) {
      location = { type: 'Point', coordinates: [lon, lat] };
    } else {
      errors.push(`Invalid lat/lon coordinates [${lat}, ${lon}].`);
    }
  }

  // 7. Validate Confidence (0.0 to 1.0)
  let confidence = item.confidence !== undefined ? Number(item.confidence) : 0.85;
  if (isNaN(confidence) || confidence < 0 || confidence > 1) {
    confidence = 0.85;
  }

  // 8. Validate Dates
  const predictionDate = item.predictionDate ? new Date(item.predictionDate) : new Date();
  const predictionWindowStart = item.predictionWindowStart
    ? new Date(item.predictionWindowStart)
    : item.predictionWindow?.start
    ? new Date(item.predictionWindow.start)
    : new Date();
  const predictionWindowEnd = item.predictionWindowEnd
    ? new Date(item.predictionWindowEnd)
    : item.predictionWindow?.end
    ? new Date(item.predictionWindow.end)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  if (isNaN(predictionDate.getTime()) || isNaN(predictionWindowStart.getTime()) || isNaN(predictionWindowEnd.getTime())) {
    errors.push('Invalid prediction timestamp dates.');
  }

  if (errors.length > 0) {
    return { valid: false, sanitized: null, errors };
  }

  return {
    valid: true,
    errors: [],
    sanitized: {
      complaintType,
      department,
      communityArea,
      ward,
      location,
      probability,
      riskScore,
      riskLevel,
      historicalCount: Math.max(0, Number(item.historicalCount) || 0),
      recentCount: Math.max(0, Number(item.recentCount) || 0),
      trend: Object.values(TRENDS).includes(item.trend) ? item.trend : TRENDS.INCREASING,
      confidence,
      predictionDate,
      predictionWindowStart,
      predictionWindowEnd,
      modelVersion: item.modelVersion || aiConfig.defaultModelVersion,
      verificationStatus: VERIFICATION_STATUS.UNASSIGNED,
    },
  };
};

/**
 * Transform backend request format to FastAPI request format
 * Backend sends: { predictionCycleId, modelVersion, areas: [{communityArea, ward, department, complaintType}] }
 * FastAPI expects: { predictionWeek, modelVersion, filters: { communityAreas, srTypes } }
 */
const transformRequestToFastAPI = (requestPayload) => {
  const { areas, modelVersion, predictionCycleId, ...rest } = requestPayload;

  // Extract prediction week from predictionCycleId or use current week
  let predictionWeek = rest.predictionWeek;
  if (!predictionWeek && predictionCycleId) {
    // Try to extract date from cycleId format: CYCLE-YYYY-MM-DD-NNNN
    const match = predictionCycleId.match(/CYCLE-(\d{4}-\d{2}-\d{2})/);
    if (match) {
      predictionWeek = match[1];
    }
  }
  if (!predictionWeek) {
    // Default to current week start (Monday)
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(now.setDate(diff));
    predictionWeek = monday.toISOString().split('T')[0];
  }

  // Extract unique community areas and SR types from areas
  const communityAreas = [...new Set((areas || []).map(a => a.communityArea).filter(Boolean))];
  const srTypes = [...new Set((areas || []).map(a => a.complaintType).filter(Boolean))];

  return {
    predictionWeek,
    modelVersion: modelVersion || aiConfig.defaultModelVersion,
    filters: {
      communityAreas: communityAreas.length > 0 ? communityAreas : undefined,
      srTypes: srTypes.length > 0 ? srTypes : undefined,
    },
  };
};

/**
 * Transform FastAPI response to backend expected format
 */
const transformFastAPIResponse = (fastAPIResponse) => {
  const { predictions, metadata, modelVersion, predictionWeek } = fastAPIResponse;

  return {
    modelVersion: modelVersion || aiConfig.defaultModelVersion,
    predictions: (predictions || []).map(item => ({
      complaintType: item.srType,
      department: item.department || 'Municipal',
      communityArea: item.communityArea.toString(),
      ward: item.ward.toString(),
      location: item.location || { type: 'Point', coordinates: [-87.6298, 41.8781] },
      probability: item.probability,
      riskScore: item.riskScore,
      riskLevel: item.riskLevel || (item.riskScore >= 85 ? RISK_LEVELS.CRITICAL :
        item.riskScore >= 70 ? RISK_LEVELS.HIGH :
        item.riskScore >= 40 ? RISK_LEVELS.MEDIUM : RISK_LEVELS.LOW),
      historicalCount: item.historicalCount || 0,
      recentCount: item.recentCount || 0,
      trend: item.trend || TRENDS.INCREASING,
      confidence: item.confidence || 0.85,
      predictionDate: item.predictionDate || new Date(),
      predictionWindowStart: item.predictionWindowStart || new Date(),
      predictionWindowEnd: item.predictionWindowEnd || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      modelVersion: item.modelVersion || modelVersion || aiConfig.defaultModelVersion,
      verificationStatus: VERIFICATION_STATUS.UNASSIGNED,
    })),
    metadata: {
      generatedAt: new Date().toISOString(),
      predictionCount: metadata?.predictionCount || (predictions || []).length,
      provider: 'FASTAPI_AI_SERVICE',
      predictionWeek,
      threshold: metadata?.threshold,
      filtersApplied: metadata?.filtersApplied,
    },
  };
};

/**
 * Deterministic Mock AI Adapter for integration testing and development
 * @param {Object} requestPayload
 * @returns {Promise<{ modelVersion: string, predictions: Array<Object>, metadata: Object }>}
 */
const generateMockPredictions = async (requestPayload = {}) => {
  const modelVersion = requestPayload.modelVersion || 'mock-simulation-v1';
  const targetAreas = Array.isArray(requestPayload.areas) && requestPayload.areas.length > 0
    ? requestPayload.areas
    : [
        { communityArea: 'Near North Side', ward: 'Ward 42', department: 'Streets & Sanitation', complaintType: 'Pothole Wave' },
        { communityArea: 'Loop', ward: 'Ward 34', department: 'Water Management', complaintType: 'Water Main Risk' },
        { communityArea: 'West Town', ward: 'Ward 1', department: 'Transportation', complaintType: 'Traffic Signal Failure' },
      ];

  const predictions = targetAreas.map((area, idx) => {
    const riskScore = Math.min(95, Math.max(35, 80 + (idx % 3) * 5));
    const probability = Number((riskScore / 100).toFixed(2));
    let riskLevel = RISK_LEVELS.HIGH;
    if (riskScore >= 85) riskLevel = RISK_LEVELS.CRITICAL;
    else if (riskScore >= 70) riskLevel = RISK_LEVELS.HIGH;
    else if (riskScore >= 40) riskLevel = RISK_LEVELS.MEDIUM;
    else riskLevel = RISK_LEVELS.LOW;

    return {
      complaintType: area.complaintType || 'Pothole Wave',
      department: area.department || 'Streets & Sanitation',
      communityArea: area.communityArea || 'Near North Side',
      ward: area.ward || 'Ward 42',
      location: {
        type: 'Point',
        coordinates: [-87.6298 + (idx * 0.01), 41.8781 + (idx * 0.01)],
      },
      probability,
      riskScore,
      riskLevel,
      historicalCount: 12 + idx * 3,
      recentCount: 6 + idx,
      trend: TRENDS.INCREASING,
      confidence: 0.88,
      predictionDate: new Date(),
      predictionWindowStart: new Date(),
      predictionWindowEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      modelVersion,
    };
  });

  return {
    modelVersion,
    predictions,
    metadata: {
      generatedAt: new Date().toISOString(),
      predictionCount: predictions.length,
      provider: 'MOCK_AI_ADAPTER',
    },
  };
};

/**
 * Execute HTTP call to remote AI prediction service (FastAPI)
 * @param {Object} requestPayload - Already transformed to FastAPI format
 * @param {Object} options
 */
const callRemoteAiService = async (requestPayload, options = {}) => {
  const correlationId = options.correlationId || `AI-REQ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const endpoint = `${aiConfig.url.replace(/\/$/, '')}/predict`;

  try {
    const response = await axios.post(endpoint, requestPayload, {
      timeout: aiConfig.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
        ...(aiConfig.apiKey ? { Authorization: `Bearer ${aiConfig.apiKey}` } : {}),
      },
    });

    if (!response.data || typeof response.data !== 'object') {
      throw new ApiError(502, 'Malformed response payload from AI Prediction Service');
    }

    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new ApiError(504, `AI Prediction Service timed out after ${aiConfig.timeoutMs}ms.`);
    }

    if (error.code === 'ECONNREFUSED') {
      throw new ApiError(503, 'AI Prediction Service connection refused (Service Unavailable).');
    }

    if (error.response) {
      const status = error.response.status >= 500 ? 502 : error.response.status;
      throw new ApiError(
        status,
        `AI Prediction Service returned error: ${error.response.data?.message || error.message}`
      );
    }

    if (error instanceof ApiError) throw error;
    throw new ApiError(502, `Failed to communicate with AI Prediction Service: ${error.message}`);
  }
};

/**
 * Primary AI Service Client Method: Generates and validates predictions
 * @param {Object} requestPayload - Backend format: { predictionCycleId, modelVersion, areas: [...] }
 * @param {Object} options
 */
const generatePredictions = async (requestPayload = {}, options = {}) => {
  let rawResult;

  // Use MongoDB-driven prediction if enabled
  if (aiConfig.useMongoPrediction) {
    try {
      const areas = requestPayload.areas || [];
      const communityAreas = [...new Set(areas.map(a => a.communityArea).filter(Boolean))];
      const srTypes = [...new Set(areas.map(a => a.complaintType).filter(Boolean))];

      const predictionWeek = requestPayload.predictionWeek ||
        (requestPayload.predictionCycleId ?
          requestPayload.predictionCycleId.match(/CYCLE-(\d{4}-\d{2}-\d{2})/)?.[1] :
          null) ||
        new Date().toISOString().split('T')[0];

      rawResult = await mongoPredictionService.predictFromMongoDB({
        predictionWeek,
        communityAreas,
        srTypes,
        modelVersion: requestPayload.modelVersion,
      });
    } catch (mongoError) {
      console.error('[AIService] MongoDB prediction failed:', mongoError.message);

      if (aiConfig.mongoPredictionFallback && !aiConfig.useMock && aiConfig.enabled) {
        console.log('[AIService] Falling back to FastAPI service...');
        const fastAPIRequest = transformRequestToFastAPI(requestPayload);
        const fastAPIResponse = await callRemoteAiService(fastAPIRequest, options);
        rawResult = transformFastAPIResponse(fastAPIResponse);
      } else if (aiConfig.useMock || !aiConfig.enabled || options.forceMock) {
        rawResult = await generateMockPredictions(requestPayload);
      } else {
        throw new ApiError(503, `AI Prediction unavailable: ${mongoError.message}`);
      }
    }
  } else if (aiConfig.useMock || !aiConfig.enabled || options.forceMock) {
    rawResult = await generateMockPredictions(requestPayload);
  } else {
    // Transform backend request to FastAPI format
    const fastAPIRequest = transformRequestToFastAPI(requestPayload);
    // Call FastAPI service
    const fastAPIResponse = await callRemoteAiService(fastAPIRequest, options);
    // Transform FastAPI response back to backend format
    rawResult = transformFastAPIResponse(fastAPIResponse);
  }

  const modelVersion = rawResult.modelVersion || aiConfig.defaultModelVersion;
  const rawPredictions = Array.isArray(rawResult.predictions) ? rawResult.predictions : [];

  // Empty predictions handling
  if (rawPredictions.length === 0) {
    return {
      modelVersion,
      predictions: [],
      metadata: rawResult.metadata || { predictionCount: 0 },
      isEmpty: true,
    };
  }

  // Validate every prediction item against strict invariants
  const validatedPredictions = [];
  const invalidItems = [];

  for (let i = 0; i < rawPredictions.length; i++) {
    const item = rawPredictions[i];
    item.modelVersion = item.modelVersion || modelVersion;
    const { valid, sanitized, errors } = validateAiPredictionItem(item);

    if (valid && sanitized) {
      validatedPredictions.push(sanitized);
    } else {
      invalidItems.push({ index: i, errors, raw: item });
    }
  }

  if (invalidItems.length > 0) {
    throw new ApiError(422, 'AI Prediction Service returned invalid prediction items.', invalidItems);
  }

  return {
    modelVersion,
    predictions: validatedPredictions,
    metadata: rawResult.metadata || { predictionCount: validatedPredictions.length },
    isEmpty: false,
  };
};

/**
 * Ingest full AI prediction cycle into MongoDB with idempotency and transaction integrity
 * @param {Object} cycleParams
 * @param {Object} options
 */
const ingestPredictionCycle = async (cycleParams = {}, options = {}) => {
  const cycleNumber = cycleParams.cycleNumber || Date.now();
  const cycleId = (cycleParams.cycleId || `CYCLE-${new Date().toISOString().slice(0, 10)}-${cycleNumber}`).toUpperCase();
  const modelVersion = cycleParams.modelVersion || aiConfig.defaultModelVersion;

  // 1. Create or retrieve active PredictionCycle
  let cycle = await PredictionCycle.findOne({ cycleId });
  if (!cycle) {
    cycle = await PredictionCycle.create({
      cycleId,
      cycleNumber,
      startDate: cycleParams.startDate || new Date(),
      endDate: cycleParams.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      predictionWindowStart: cycleParams.predictionWindowStart || new Date(),
      predictionWindowEnd: cycleParams.predictionWindowEnd || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: CYCLE_STATUS.RUNNING,
      modelVersion,
    });
  }

  try {
    // 2. Fetch validated predictions from AI Service / Mock Adapter
    const aiResult = await generatePredictions(
      {
        predictionCycleId: cycle.cycleId,
        modelVersion,
        areas: cycleParams.areas,
        ...cycleParams,
      },
      options
    );

    if (aiResult.isEmpty || aiResult.predictions.length === 0) {
      cycle.status = CYCLE_STATUS.COMPLETED;
      cycle.predictionCount = 0;
      cycle.completedAt = new Date();
      await cycle.save();
      return { cycle, predictions: [], message: 'Prediction cycle completed with 0 predictions.' };
    }

    // 3. Persist predictions with idempotency enforcement
    const persistedPredictions = [];

    for (let i = 0; i < aiResult.predictions.length; i++) {
      const predData = aiResult.predictions[i];
      const predictionId = `PRED-${cycle.cycleNumber}-${Math.floor(1000 + Math.random() * 9000)}-${i + 1}`;

      // Idempotency: Check if matching forecast already exists in this cycle
      const existing = await Prediction.findOne({
        predictionCycleId: cycle._id,
        communityArea: predData.communityArea,
        complaintType: predData.complaintType,
        ward: predData.ward,
      });

      if (!existing) {
        const newPred = await Prediction.create({
          predictionId,
          predictionCycleId: cycle._id,
          ...predData,
        });
        persistedPredictions.push(newPred);
      } else {
        persistedPredictions.push(existing);
      }
    }

    // 4. Mark cycle completed
    cycle.status = CYCLE_STATUS.COMPLETED;
    cycle.predictionCount = persistedPredictions.length;
    cycle.completedAt = new Date();
    await cycle.save();

    return {
      cycle,
      predictions: persistedPredictions,
      modelVersion: aiResult.modelVersion,
      metadata: aiResult.metadata,
    };
  } catch (error) {
    // Mark cycle as failed without deleting historical records
    cycle.status = CYCLE_STATUS.FAILED;
    await cycle.save();
    throw error;
  }
};

/**
 * Health probe for AI Service dependency
 */
const checkAiServiceHealth = async () => {
  if (aiConfig.useMongoPrediction) {
    return mongoPredictionService.checkModelHealth();
  }

  if (aiConfig.useMock || !aiConfig.enabled) {
    return {
      status: 'mock_active',
      provider: 'MOCK_AI_ADAPTER',
      enabled: false,
      message: 'Mock AI adapter is currently active for simulation and testing.',
    };
  }

  try {
    const healthUrl = `${aiConfig.url.replace(/\/$/, '')}/health`;
    const res = await axios.get(healthUrl, { timeout: 3000 });
    return {
      status: res.status === 200 ? 'available' : 'degraded',
      url: aiConfig.url,
      statusCode: res.status,
    };
  } catch (err) {
    return {
      status: 'unavailable',
      url: aiConfig.url,
      error: err.message,
    };
  }
};

/**
 * Get model info from AI Service
 */
const getAiModelInfo = async () => {
  if (aiConfig.useMongoPrediction) {
    return mongoPredictionService.getModelInfo();
  }

  if (aiConfig.useMock || !aiConfig.enabled) {
    return {
      modelVersion: 'mock-simulation-v1',
      modelType: 'MOCK',
      requiredFeatureCount: 0,
      predictionMode: 'mock',
      threshold: 0.5,
      supportedSrTypes: [],
    };
  }

  try {
    const infoUrl = `${aiConfig.url.replace(/\/$/, '')}/model/info`;
    const res = await axios.get(infoUrl, { timeout: 5000 });
    return res.data;
  } catch (err) {
    throw new ApiError(502, `Failed to fetch AI model info: ${err.message}`);
  }
};

module.exports = {
  validateAiPredictionItem,
  generateMockPredictions,
  callRemoteAiService,
  generatePredictions,
  ingestPredictionCycle,
  checkAiServiceHealth,
  getAiModelInfo,
  transformRequestToFastAPI,
  transformFastAPIResponse,
  mongoPredictionService,
};