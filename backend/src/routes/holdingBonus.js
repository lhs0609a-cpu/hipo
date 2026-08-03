const express = require('express');
const router = express.Router();
const holdingBonusController = require('../controllers/holdingBonusController');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/holding-bonus/status
 * 내 보유 주식별 장기 보유 현황 조회
 */
router.get('/status', authenticateToken, holdingBonusController.getMyHoldingStatus);

/**
 * GET /api/holding-bonus/stock/:stockId
 * 특정 주식의 장기 보유 현황 조회
 */
router.get('/stock/:stockId', authenticateToken, holdingBonusController.getStockHoldingStatus);

/**
 * POST /api/holding-bonus/claim
 * 장기 보유 보너스 수령
 */
router.post('/claim', authenticateToken, holdingBonusController.claimBonus);

/**
 * GET /api/holding-bonus/leaderboard
 * 장기 보유 리더보드
 */
router.get('/leaderboard', holdingBonusController.getLeaderboard);

module.exports = router;
