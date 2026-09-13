const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
require('./models');
const {
  corsOptions,
  helmetOptions,
  payloadLimits,
  apiRateLimiter,
} = require('./config/security');
const { sanitizeNoSql } = require('./middleware/sanitizeInput');
const apiRoutes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security Headers Middleware
app.use(helmet(helmetOptions));

// CORS Configuration
app.use(cors(corsOptions));

// Logging Middleware (Redacting and avoiding noisy logs in test)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Request Parsers with payload limits
app.use(express.json({ limit: payloadLimits.jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: payloadLimits.urlEncodedLimit }));

// NoSQL Operator Injection Sanitizer Middleware
app.use(sanitizeNoSql);

// Development & Deployment Health Check Endpoint (Section 40)
const healthHandler = (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  return res.status(isConnected ? 200 : 503).json({
    success: isConnected,
    data: {
      status: isConnected ? 'healthy' : 'unhealthy',
      database: isConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    },
  });
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'civic-forecasting-api',
    version: '1.0.0',
    documentation: '/api/v1/health',
  });
});

// API Routes Prefix: /api/v1
app.use('/api/v1', apiRoutes);

// 404 Handler
app.use(notFound);

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
