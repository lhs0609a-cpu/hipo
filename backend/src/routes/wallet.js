const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const auth = require('../middleware/auth');

// 코인 입금
router.post('/deposit', auth, walletController.depositCoins);

// 지갑 정보 조회
router.get('/balance', auth, walletController.getWalletBalance);

// 거래 내역 조회
router.get('/transactions', auth, walletController.getTransactionHistory);

// 출금 요청
router.post('/withdraw', auth, walletController.requestWithdrawal);

// 내 출금 내역 조회
router.get('/withdrawals', auth, walletController.getMyWithdrawals);

// 출금 승인/거부 (관리자 전용)
router.patch('/withdrawals/:withdrawalId/process', auth, walletController.processWithdrawal);

module.exports = router;
