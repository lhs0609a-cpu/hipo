const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const settlementController = require('../controllers/settlementController');

// 모든 정산 API는 인증 필수
router.use(authenticateToken);

// 정산 대시보드 조회
router.get('/dashboard', settlementController.getDashboard);

// 은행 계좌 등록/수정
router.post('/bank-account', settlementController.registerBankAccount);

// 정산 신청
router.post('/request', settlementController.requestSettlement);

// 정산 내역 조회
router.get('/history', settlementController.getHistory);

// 정산 취소
router.post('/:id/cancel', settlementController.cancelSettlement);

module.exports = router;
