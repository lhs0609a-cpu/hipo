const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// 모든 관리자 라우트는 인증 + 관리자 권한 필요
router.use(authenticateToken);
router.use(isAdmin);

// 봇 의심 계정 관리
router.get('/suspicious-accounts', adminController.getSuspiciousAccounts);
router.post('/users/:userId/reset-bot-score', adminController.resetBotScore);
router.post('/users/:userId/ban', adminController.banUser);

// 통계
router.get('/stats/users', adminController.getUserStats);
router.get('/stats/transactions', adminController.getTransactionStats);
router.get('/stats/coins', adminController.getCoinStats);

// 시스템 상태
router.get('/system/status', adminController.getSystemStatus);

// 차트 데이터
router.get('/charts/user-growth', adminController.getUserGrowthChart);
router.get('/charts/transaction-volume', adminController.getTransactionVolumeChart);
router.get('/charts/coin-flow', adminController.getCoinFlowChart);
router.get('/charts/active-users', adminController.getActiveUsersChart);

module.exports = router;
