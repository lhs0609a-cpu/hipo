const express = require('express');
const router = express.Router();
const errorController = require('../controllers/errorController');
const { optionalAuth, authenticateToken, isAdmin } = require('../middleware/auth');

/**
 * POST /api/errors/report
 * Report error from frontend
 */
router.post('/report', optionalAuth, errorController.reportError);

/**
 * GET /api/errors/stats
 * Get error statistics (admin only)
 */
router.get('/stats', authenticateToken, isAdmin, errorController.getErrorStats);
router.get('/reports', authenticateToken, isAdmin, errorController.getErrorReports);
router.patch('/reports/:reportId/resolve', authenticateToken, isAdmin, errorController.resolveError);

module.exports = router;
