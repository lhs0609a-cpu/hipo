const express = require('express');
const router = express.Router();
const stockMarketController = require('../controllers/stockMarketController');
const auth = require('../middleware/auth');
const orders = require('../controllers/stockOrderController');
const { Stock } = require('../models');
const placeOrder = orderType => async (req, res) => {
  try {
    const stock = await Stock.findOne({ where: { userId: req.body.targetUserId } });
    if (!stock) return res.status(404).json({ error: '종목을 찾을 수 없습니다' });
    req.body = { ...req.body, stockId: stock.id, orderType, orderMode: 'limit', limitPrice: req.body.pricePerShare };
    return orders.createOrder(req, res);
  } catch (error) { return res.status(500).json({ error: '주문 접수에 실패했습니다' }); }
};

// 시장 개요 (공개)
router.get('/overview', stockMarketController.getMarketOverview);

// 상승률 상위 종목 (공개)
router.get('/top-gainers', stockMarketController.getTopGainers);

// 하락률 상위 종목 (공개)
router.get('/top-losers', stockMarketController.getTopLosers);

// 거래량 상위 종목 (공개)
router.get('/most-active', stockMarketController.getMostActive);

// 매수 주문
router.post('/orders/buy', auth, placeOrder('BUY'));

// 매도 주문
router.post('/orders/sell', auth, placeOrder('SELL'));

// 내 주문 목록
router.get('/orders', auth, orders.getMyOrders);

// 주문 취소
router.delete('/orders/:orderId', auth, orders.cancelOrder);

// 거래 내역 조회 (시장 전체)
router.get('/trades', auth, stockMarketController.getMarketTrades);

module.exports = router;
