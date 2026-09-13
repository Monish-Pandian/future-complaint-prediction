const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const officerRoutes = require('./officerRoutes');
const heatmapRoutes = require('./heatmapRoutes');
const verificationSelectionRoutes = require('./verificationSelectionRoutes');

const router = express.Router();

// Mount sub-routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/officer', officerRoutes);
router.use('/heatmap', heatmapRoutes);
router.use('/verifications', verificationSelectionRoutes);

module.exports = router;
