const express = require('express');
const router = express.Router();
const stockOrderController = require('../controllers/stockOrderController');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/stock-orders
 * 지정가/손절/익절 주문 생성
 * Body: { stockId, orderType, orderMode, quantity, limitPrice?, stopPrice?, expiresIn? }
 */
router.post('/', authenticateToken, stockOrderController.createOrder);

/**
 * GET /api/stock-orders
 * 내 주문 목록 조회
 * Query: { status?, page?, limit? }
 */
router.get('/', authenticateToken, stockOrderController.getMyOrders);

/**
 * GET /api/stock-orders/:orderId
 * 주문 상세 조회
 */
router.get('/:orderId', authenticateToken, stockOrderController.getOrderDetail);

/**
 * DELETE /api/stock-orders/:orderId
 * 주문 취소
 */
router.delete('/:orderId', authenticateToken, stockOrderController.cancelOrder);

/**
 * GET /api/stock-orders/stock/:stockId/orderbook
 * 특정 주식의 실제 호가창 (대기 주문 기반)
 */
router.get('/stock/:stockId/orderbook', stockOrderController.getStockOrders);

module.exports = router;
