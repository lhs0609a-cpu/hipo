const express = require('express');
const router = express.Router();
const tierController = require('../controllers/tierController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// ============ 공개 라우트 ============

// 모든 티어 정보 조회
router.get('/all', tierController.getAllTiers);

// 티어별 통계 조회
router.get('/statistics', tierController.getTierStatistics);

// 티어별 주식 목록 조회
router.get('/stocks', tierController.getStocksByTier);
router.get('/stocks/:tier', tierController.getStocksByTier);

// 티어 랭킹 조회
router.get('/ranking', tierController.getTierRanking);

// 특정 티어 혜택 정보 조회
router.get('/benefits/:tier', tierController.getTierBenefits);

// 주식의 티어 상세 정보 조회
router.get('/stock/:stockId', tierController.getStockTierDetail);

// 다음 티어까지 진행률 조회
router.get('/stock/:stockId/progress', tierController.getNextTierProgress);

// ============ 인증 필요 라우트 ============

// 내 주식의 티어 정보 조회
router.get('/my', authenticateToken, tierController.getMyTierInfo);

// 티어 업데이트 요청 (수동)
router.post('/my/update', authenticateToken, tierController.requestTierUpdate);

// ============ 관리자 라우트 ============

// 모든 주식 티어 일괄 업데이트
router.post('/admin/update-all', authenticateToken, tierController.updateAllTiers);

module.exports = router;
