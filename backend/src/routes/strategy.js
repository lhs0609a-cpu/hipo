const express = require('express');
const router = express.Router();
const strategyController = require('../controllers/strategyController');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/strategies
 * 전략 생성
 */
router.post('/', authenticateToken, strategyController.createStrategy);

/**
 * GET /api/strategies
 * 전략 목록 조회
 */
router.get('/', strategyController.getStrategies);

/**
 * GET /api/strategies/my
 * 내 전략 목록
 */
router.get('/my', authenticateToken, strategyController.getMyStrategies);

/**
 * GET /api/strategies/followed
 * 내가 팔로우한 전략 목록
 */
router.get('/followed', authenticateToken, strategyController.getMyFollowedStrategies);

/**
 * GET /api/strategies/:strategyId
 * 전략 상세 조회
 */
router.get('/:strategyId', strategyController.getStrategyDetail);

/**
 * PUT /api/strategies/:strategyId
 * 전략 수정
 */
router.put('/:strategyId', authenticateToken, strategyController.updateStrategy);

/**
 * DELETE /api/strategies/:strategyId
 * 전략 삭제
 */
router.delete('/:strategyId', authenticateToken, strategyController.deleteStrategy);

/**
 * POST /api/strategies/:strategyId/follow
 * 전략 팔로우
 */
router.post('/:strategyId/follow', authenticateToken, strategyController.followStrategy);

/**
 * DELETE /api/strategies/:strategyId/follow
 * 전략 언팔로우
 */
router.delete('/:strategyId/follow', authenticateToken, strategyController.unfollowStrategy);

/**
 * POST /api/strategies/:strategyId/trades
 * 전략 거래 기록
 */
router.post('/:strategyId/trades', authenticateToken, strategyController.recordTrade);

/**
 * GET /api/strategies/:strategyId/trades
 * 전략 거래 내역
 */
router.get('/:strategyId/trades', strategyController.getStrategyTrades);

module.exports = router;
