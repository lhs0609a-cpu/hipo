const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/security/trading-pin
 * 거래 비밀번호 설정
 */
router.post('/trading-pin', authenticateToken, securityController.setTradingPin);

/**
 * POST /api/security/verify-pin
 * 거래 비밀번호 확인
 */
router.post('/verify-pin', authenticateToken, securityController.verifyTradingPin);

/**
 * POST /api/security/2fa/setup
 * 2단계 인증 설정 시작
 */
router.post('/2fa/setup', authenticateToken, securityController.setup2FA);

/**
 * POST /api/security/2fa/verify
 * 2단계 인증 활성화 확인
 */
router.post('/2fa/verify', authenticateToken, securityController.verify2FA);

/**
 * POST /api/security/2fa/disable
 * 2단계 인증 비활성화
 */
router.post('/2fa/disable', authenticateToken, securityController.disable2FA);

/**
 * GET /api/security/settings
 * 보안 설정 조회
 */
router.get('/settings', authenticateToken, securityController.getSecuritySettings);

/**
 * POST /api/security/identity-verification
 * 본인 인증 요청
 */
router.post('/identity-verification', authenticateToken, securityController.requestIdentityVerification);

/**
 * PUT /api/security/daily-limit
 * 일일 거래 한도 설정
 */
router.put('/daily-limit', authenticateToken, securityController.setDailyTradeLimit);

/**
 * GET /api/security/login-history
 * 접속 기록 조회
 */
router.get('/login-history', authenticateToken, securityController.getLoginHistory);

module.exports = router;
