const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/notifications
 * 알림 목록 조회
 */
router.get('/', authenticateToken, notificationController.getNotifications);

/**
 * PUT /api/notifications/:notificationId/read
 * 알림 읽음 처리
 */
router.put('/:notificationId/read', authenticateToken, notificationController.markAsRead);

/**
 * PUT /api/notifications/read-all
 * 모든 알림 읽음 처리
 */
router.put('/read-all', authenticateToken, notificationController.markAllAsRead);

/**
 * DELETE /api/notifications/:notificationId
 * 알림 삭제
 */
router.delete('/:notificationId', authenticateToken, notificationController.deleteNotification);

module.exports = router;
