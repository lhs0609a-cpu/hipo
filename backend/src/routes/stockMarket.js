const express = require('express');
const router = express.Router();
const stockMarketController = require('../controllers/stockMarketController');
const auth = require('../middleware/auth');

// 매수 주문
router.post('/orders/buy', auth, stockMarketController.createBuyOrder);

// 매도 주문
router.post('/orders/sell', auth, stockMarketController.createSellOrder);

// 내 주문 목록
router.get('/orders', auth, stockMarketController.getMyOrders);

// 주문 취소
router.delete('/orders/:orderId', auth, stockMarketController.cancelOrder);

// 거래 내역 조회 (시장 전체)
router.get('/trades', auth, stockMarketController.getMarketTrades);

module.exports = router;
