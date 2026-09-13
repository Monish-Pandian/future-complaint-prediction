const express = require('express');
const { getNearbyHeatmap } = require('../controllers/heatmapController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

// Apply authentication
router.use(authenticate);

// Nearby Geospatial Heatmap Query
router.get('/nearby', getNearbyHeatmap);

module.exports = router;
