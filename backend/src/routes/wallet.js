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

// === PO 충전/교환 ===

// PO 충전
router.post('/po/charge', auth, walletController.chargePO);

// PO 잔액 조회
router.get('/po/balance', auth, walletController.getPOBalance);

// PO → 현금 전환 요청
router.post('/po/convert', auth, walletController.convertPOToCash);

// PO 사용 내역 조회
router.get('/po/history', auth, walletController.getPOHistory);

// 충전 상품 목록
router.get('/po/products', walletController.getChargeProducts);

module.exports = router;
