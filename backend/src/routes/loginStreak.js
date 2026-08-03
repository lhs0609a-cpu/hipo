const express = require('express');
const router = express.Router();
const loginStreakController = require('../controllers/loginStreakController');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/login-streak/status
 * 연속 로그인 상태 조회
 */
router.get('/status', authenticateToken, loginStreakController.getStatus);

/**
 * POST /api/login-streak/claim
 * 일일 보상 수령
 */
router.post('/claim', authenticateToken, loginStreakController.claimReward);

/**
 * GET /api/login-streak/leaderboard
 * 연속 로그인 랭킹 조회
 */
router.get('/leaderboard', loginStreakController.getLeaderboard);

module.exports = router;
