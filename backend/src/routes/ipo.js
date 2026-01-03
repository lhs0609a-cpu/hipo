const express = require('express');
const router = express.Router();
const ipoController = require('../controllers/ipoController');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/ipo/eligibility
 * 상장 자격 확인 (상세)
 */
router.get('/eligibility', authenticateToken, ipoController.checkEligibility);

/**
 * GET /api/ipo/eligibility/quick
 * 상장 자격 빠른 확인
 */
router.get('/eligibility/quick', authenticateToken, ipoController.quickEligibilityCheck);

/**
 * POST /api/ipo/apply
 * IPO 신청
 */
router.post('/apply', authenticateToken, ipoController.applyIPO);

/**
 * POST /api/ipo/secondary-offering
 * 추가 공모
 */
router.post('/secondary-offering', authenticateToken, ipoController.secondaryOffering);

/**
 * POST /api/ipo/buyback
 * 자사주 매입
 */
router.post('/buyback', authenticateToken, ipoController.buybackShares);

/**
 * POST /api/ipo/burn-treasury
 * 자사주 소각
 */
router.post('/burn-treasury', authenticateToken, ipoController.burnTreasuryShares);

/**
 * GET /api/ipo/tier-check
 * 티어 업그레이드 확인
 */
router.get('/tier-check', authenticateToken, ipoController.checkTierUpgrade);

/**
 * POST /api/ipo/upgrade-tier
 * 티어 업그레이드 실행
 */
router.post('/upgrade-tier', authenticateToken, ipoController.upgradeTier);

/**
 * POST /api/ipo/request-delisting
 * 상장폐지 신청
 */
router.post('/request-delisting', authenticateToken, ipoController.requestDelisting);

/**
 * GET /api/ipo/lockup-status
 * 락업 상태 확인
 */
router.get('/lockup-status', authenticateToken, ipoController.getLockupStatus);

/**
 * GET /api/ipo/my-status
 * 내 IPO 현황 조회
 */
router.get('/my-status', authenticateToken, ipoController.getMyIPOStatus);

module.exports = router;
