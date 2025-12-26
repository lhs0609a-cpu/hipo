const express = require('express');
const router = express.Router();
const stockAlertController = require('../controllers/stockAlertController');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/stock-alerts
 * 주식 알림 생성
 */
router.post('/', authenticateToken, stockAlertController.createAlert);

/**
 * GET /api/stock-alerts
 * 내 알림 목록 조회
 */
router.get('/', authenticateToken, stockAlertController.getMyAlerts);

/**
 * PUT /api/stock-alerts/:alertId
 * 알림 수정
 */
router.put('/:alertId', authenticateToken, stockAlertController.updateAlert);

/**
 * DELETE /api/stock-alerts/:alertId
 * 알림 삭제
 */
router.delete('/:alertId', authenticateToken, stockAlertController.deleteAlert);

/**
 * GET /api/stock-alerts/history
 * 알림 히스토리 조회
 */
router.get('/history', authenticateToken, stockAlertController.getAlertHistory);

/**
 * PUT /api/stock-alerts/history/:historyId/read
 * 알림 히스토리 읽음 처리
 */
router.put('/history/:historyId/read', authenticateToken, stockAlertController.markHistoryAsRead);

/**
 * GET /api/stock-alerts/unread-count
 * 미읽은 알림 개수
 */
router.get('/unread-count', authenticateToken, stockAlertController.getUnreadCount);

/**
 * POST /api/stock-alerts/watchlist
 * 워치리스트에 추가
 */
router.post('/watchlist', authenticateToken, stockAlertController.addToWatchlist);

/**
 * GET /api/stock-alerts/watchlist
 * 워치리스트 조회
 */
router.get('/watchlist', authenticateToken, stockAlertController.getWatchlist);

/**
 * DELETE /api/stock-alerts/watchlist/:stockId
 * 워치리스트에서 제거
 */
router.delete('/watchlist/:stockId', authenticateToken, stockAlertController.removeFromWatchlist);

/**
 * PUT /api/stock-alerts/watchlist/:stockId/note
 * 워치리스트 메모 수정
 */
router.put('/watchlist/:stockId/note', authenticateToken, stockAlertController.updateWatchlistNote);

module.exports = router;
