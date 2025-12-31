const express = require('express');
const router = express.Router();
const watchlistController = require('../controllers/watchlistController');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/watchlist
 * 관심 종목 목록 조회
 */
router.get('/', authenticateToken, watchlistController.getWatchlist);

/**
 * POST /api/watchlist
 * 관심 종목 추가
 */
router.post('/', authenticateToken, watchlistController.addToWatchlist);

/**
 * DELETE /api/watchlist/:stockId
 * 관심 종목 삭제
 */
router.delete('/:stockId', authenticateToken, watchlistController.removeFromWatchlist);

/**
 * PUT /api/watchlist/:stockId/alert
 * 관심 종목 알림 설정
 */
router.put('/:stockId/alert', authenticateToken, watchlistController.setWatchlistAlert);

/**
 * PUT /api/watchlist/:stockId/note
 * 관심 종목 메모 수정
 */
router.put('/:stockId/note', authenticateToken, watchlistController.updateWatchlistNote);

/**
 * GET /api/watchlist/check/:stockId
 * 관심 종목 여부 확인
 */
router.get('/check/:stockId', authenticateToken, watchlistController.checkWatchlist);

/**
 * GET /api/watchlist/categories
 * 카테고리 목록 조회
 */
router.get('/categories', watchlistController.getCategories);

/**
 * GET /api/watchlist/category/:category
 * 섹터별 주식 목록
 */
router.get('/category/:category', watchlistController.getStocksByCategory);

module.exports = router;
