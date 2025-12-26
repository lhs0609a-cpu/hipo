const express = require('express');
const router = express.Router();
const fanMeetingController = require('../controllers/fanMeetingController');
const auth = require('../middleware/auth');

// 팬미팅 생성 (크리에이터용)
router.post('/', auth, fanMeetingController.createFanMeeting);

// 팬미팅 목록 조회
router.get('/', auth, fanMeetingController.getFanMeetings);

// 내 팬미팅 참가 내역
router.get('/my-entries', auth, fanMeetingController.getMyEntries);

// 팬미팅 상세 조회
router.get('/:meetingId', auth, fanMeetingController.getFanMeetingById);

// 팬미팅 추첨 참가
router.post('/:meetingId/enter', auth, fanMeetingController.enterFanMeeting);

// 팬미팅 추첨 실행 (크리에이터용)
router.post('/:meetingId/conduct-lottery', auth, fanMeetingController.conductLottery);

// 팬미팅 상태 변경 (크리에이터용)
router.patch('/:meetingId/status', auth, fanMeetingController.updateFanMeetingStatus);

module.exports = router;
