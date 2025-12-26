const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const dividendController = require('../controllers/dividendController');

// 내 배당 히스토리 조회
router.get('/history', authenticateToken, dividendController.getMyDividendHistory);

// 내가 보유한 모든 주식의 예상 배당 조회
router.get('/expected', authenticateToken, dividendController.getMyExpectedDividends);

// 크리에이터의 배당 대시보드 (본인만)
router.get('/creator/dashboard', authenticateToken, dividendController.getCreatorDividendDashboard);

// 크리에이터의 배당 지급 통계 (공개)
router.get('/creator/:creatorId/stats', authenticateToken, dividendController.getCreatorDividendStats);

// 특정 크리에이터 주식의 예상 배당 계산
router.get('/creator/:creatorId/calculate', authenticateToken, dividendController.calculateExpectedDividend);

module.exports = router;
