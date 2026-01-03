const express = require('express');
const router = express.Router();
const stockMarketController = require('../controllers/stockMarketController');
const auth = require('../middleware/auth');

// 시장 개요 (공개)
router.get('/overview', stockMarketController.getMarketOverview);

// 상승률 상위 종목 (공개)
router.get('/top-gainers', stockMarketController.getTopGainers);

// 하락률 상위 종목 (공개)
router.get('/top-losers', stockMarketController.getTopLosers);

// 거래량 상위 종목 (공개)
router.get('/most-active', stockMarketController.getMostActive);

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
