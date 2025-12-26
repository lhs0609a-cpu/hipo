const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const auth = require('../middleware/auth');

// 이벤트 생성 (크리에이터용)
router.post('/', auth, eventController.createEvent);

// 이벤트 목록 조회
router.get('/', auth, eventController.getEvents);

// 티켓 구매
router.post('/:eventId/purchase-ticket', auth, eventController.purchaseTicket);

// 내 티켓 목록
router.get('/tickets/my', auth, eventController.getMyTickets);

// 티켓 사용 (입장 처리, 크리에이터/관리자용)
router.post('/tickets/:ticketId/use', auth, eventController.useTicket);

module.exports = router;
