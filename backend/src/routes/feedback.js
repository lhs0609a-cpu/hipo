const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

/**
 * POST /api/feedback
 * Submit feedback (auth optional - can be anonymous)
 */
router.post('/', optionalAuth, feedbackController.submitFeedback);

/**
 * GET /api/feedback
 * Get all feedback (admin only)
 */
router.get('/', authenticateToken, feedbackController.getAllFeedback);

/**
 * PUT /api/feedback/:feedbackId
 * Update feedback status (admin only)
 */
router.put('/:feedbackId', authenticateToken, feedbackController.updateFeedbackStatus);

module.exports = router;
