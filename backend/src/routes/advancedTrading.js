const express = require('express');
const router = express.Router();
const advancedTradingController = require('../controllers/stockOrderController');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/trading/limit-order
 * 지정가 주문 생성
 */
router.post('/limit-order', authenticateToken, (req, res) => {
  req.body.orderMode = 'limit';
  return advancedTradingController.createOrder(req, res);
});

/**
 * POST /api/trading/stop-order
 * 손절/익절 주문 생성
 */
router.post('/stop-order', authenticateToken, (req, res) => {
  req.body.orderMode = req.body.orderMode || (req.body.limitPrice ? 'stop_limit' : req.body.triggerCondition === 'gte' ? 'take_profit' : 'stop_loss');
  return advancedTradingController.createOrder(req, res);
});

/**
 * DELETE /api/trading/orders/:orderId
 * 주문 취소
 */
router.delete('/orders/:orderId', authenticateToken, advancedTradingController.cancelOrder);

/**
 * GET /api/trading/orders
 * 내 주문 목록 조회
 */
router.get('/orders', authenticateToken, advancedTradingController.getMyOrders);

module.exports = router;
