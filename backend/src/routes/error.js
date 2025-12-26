const express = require('express');
const router = express.Router();
const errorController = require('../controllers/errorController');

/**
 * POST /api/errors/report
 * Report error from frontend
 */
router.post('/report', errorController.reportError);

/**
 * GET /api/errors/stats
 * Get error statistics (admin only)
 */
router.get('/stats', errorController.getErrorStats);

module.exports = router;
