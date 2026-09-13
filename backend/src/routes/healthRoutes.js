const express = require('express');
const { getHealth, getAiHealth, getAiModelInfo } = require('../controllers/healthController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../models/User');

const router = express.Router();

router.get('/', getHealth);

// AI Service health endpoints (Admin only)
router.get('/ai', authenticate, authorize(ROLES.ADMIN), getAiHealth);
router.get('/ai/model-info', authenticate, authorize(ROLES.ADMIN), getAiModelInfo);

module.exports = router;