const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, orderController.createOrder);
router.get('/', authenticateToken, orderController.getOrders);
router.get('/:orderId', authenticateToken, orderController.getOrderById);
router.put('/:orderId/status', authenticateToken, orderController.updateOrderStatus);
router.post('/:orderId/cancel', authenticateToken, orderController.cancelOrder);

module.exports = router;
