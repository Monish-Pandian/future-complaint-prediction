const rateLimit = require('express-rate-limit');

/**
 * Centralized Security Configuration
 * Manages CORS, Helmet, Rate Limiting, JWT policies, Payload limits, and Input Constraints
 */

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_TEST = NODE_ENV === 'test';
const IS_PROD = NODE_ENV === 'production';

// ====================================================
// 1. CORS CONFIGURATION
// ====================================================
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    if (
      origin === clientUrl ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:')
    ) {
      return callback(null, true);
    }

    return callback(new Error('Blocked by CORS policy: Unauthorized Origin'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours preflight cache
};

// ====================================================
// 2. HELMET SECURITY HEADERS CONFIGURATION
// ====================================================
const helmetOptions = {
  contentSecurityPolicy: IS_PROD
    ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
        },
      }
    : false, // Disable strict CSP in development to avoid local tooling interference
  crossOriginEmbedderPolicy: false,
  hsts: IS_PROD
    ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      }
    : false,
};

// ====================================================
// 3. RATE LIMITING POLICIES
// ====================================================

/**
 * Authentication Rate Limiter (Brute-Force Protection for Login/Register)
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: IS_PROD ? 20 : 500, // 20 in production, 500 in dev/test runner
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => IS_TEST || process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    errors: ['Rate limit exceeded on authentication endpoint.'],
  },
});

/**
 * General API Rate Limiter
 */
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => IS_TEST,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
    errors: ['Global API rate limit exceeded.'],
  },
});

// ====================================================
// 4. JWT & AUTHENTICATION CONSTRAINTS
// ====================================================
const jwtConfig = {
  secret: process.env.JWT_SECRET || 'super_secret_jwt_key_civic_forecasting_2026_secure',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  algorithms: ['HS256'],
};

// ====================================================
// 5. INPUT & PAYLOAD CONSTRAINTS
// ====================================================
const payloadLimits = {
  jsonLimit: '1mb',
  urlEncodedLimit: '1mb',
  maxSearchLength: 100,
  maxPaginationLimit: 100,
};

module.exports = {
  corsOptions,
  helmetOptions,
  authRateLimiter,
  apiRateLimiter,
  jwtConfig,
  payloadLimits,
  IS_TEST,
  IS_PROD,
};
