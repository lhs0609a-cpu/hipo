const express = require('express');
const router = express.Router();
const dailyMissionController = require('../controllers/dailyMissionController');
const { authenticateToken } = require('../middleware/auth');

// 오늘의 미션 조회
router.get('/today', authenticateToken, dailyMissionController.getTodayMissions);

// 출석 체크
router.post('/checkin', authenticateToken, dailyMissionController.checkIn);

// 보너스 수령
router.post('/bonus', authenticateToken, dailyMissionController.claimBonus);

// 미션 통계
router.get('/stats', authenticateToken, dailyMissionController.getMissionStats);

module.exports = router;
