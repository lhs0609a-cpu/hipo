const express = require('express');
const router = express.Router();
const merchandiseController = require('../controllers/merchandiseController');
const auth = require('../middleware/auth');

// 굿즈 생성 (크리에이터용)
router.post('/', auth, merchandiseController.createMerchandise);

// 굿즈 목록 조회
router.get('/', auth, merchandiseController.getMerchandises);

// 굿즈 구매
router.post('/:merchandiseId/purchase', auth, merchandiseController.purchaseMerchandise);

// 내 주문 내역
router.get('/orders/my', auth, merchandiseController.getMyOrders);

// 주문 상태 업데이트 (크리에이터용)
router.patch('/orders/:orderId/status', auth, merchandiseController.updateOrderStatus);

module.exports = router;
