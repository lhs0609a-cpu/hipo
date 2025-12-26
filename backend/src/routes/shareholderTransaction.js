const express = require('express');
const router = express.Router();
const shareholderTransactionController = require('../controllers/shareholderTransactionController');
const auth = require('../middleware/auth');

// 주식 매수
router.post('/buy', auth, shareholderTransactionController.buyShares);

// 주식 매도
router.post('/sell', auth, shareholderTransactionController.sellShares);

// 주식 양도
router.post('/transfer', auth, shareholderTransactionController.transferShares);

// 주식 부여 (관리자/대상 사용자)
router.post('/grant', auth, shareholderTransactionController.grantShares);

// 특정 사용자의 주식 거래 내역 조회
router.get('/transactions/:targetUserId', auth, shareholderTransactionController.getTransactionHistory);

// 내 주주 상태 조회
router.get('/status/:targetUserId', auth, shareholderTransactionController.getMyShareholderStatus);

// 특정 사용자의 주주 목록 조회
router.get('/shareholders/:targetUserId', auth, shareholderTransactionController.getShareholders);

module.exports = router;
