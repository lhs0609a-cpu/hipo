const express = require('express');
const router = express.Router();
const videoCallController = require('../controllers/videoCallController');
const auth = require('../middleware/auth');

// 화상통화 예약 신청
router.post('/bookings', auth, videoCallController.createBooking);

// 예약 확정
router.post('/bookings/:bookingId/confirm', auth, videoCallController.confirmBooking);

// 예약 취소
router.post('/bookings/:bookingId/cancel', auth, videoCallController.cancelBooking);

// 예약 거부
router.post('/bookings/:bookingId/reject', auth, videoCallController.rejectBooking);

// 예약 완료 처리
router.post('/bookings/:bookingId/complete', auth, videoCallController.completeBooking);

// 내 예약 목록 조회
router.get('/bookings', auth, videoCallController.getMyBookings);

// 특정 예약 조회
router.get('/bookings/:bookingId', auth, videoCallController.getBooking);

module.exports = router;
