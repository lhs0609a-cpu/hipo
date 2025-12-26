const express = require('express');
const router = express.Router();
const creatorCommunityController = require('../controllers/creatorCommunityController');
const auth = require('../middleware/auth');

// 상장인 통합 대시보드
router.get('/creator/dashboard', auth, creatorCommunityController.getCreatorDashboard);

// 일괄 공지 전송
router.post('/creator/broadcast-notice', auth, creatorCommunityController.broadcastNotice);

// 공지 읽음 처리
router.post('/notices/:noticeId/read', auth, creatorCommunityController.markNoticeAsRead);

// 공지 미확인 멤버 목록
router.get('/notices/:noticeId/unread-members', auth, creatorCommunityController.getUnreadMembers);

// 방장 평가 (상장인 전용)
router.post('/creator/:communityId/review-admin', auth, creatorCommunityController.reviewAdmin);

// 출석 체크
router.post('/:communityId/attendance', auth, creatorCommunityController.checkAttendance);

// 커뮤니티 출석률 조회
router.get('/:communityId/attendance/stats', auth, creatorCommunityController.getAttendanceStats);

// 내 출석 이력
router.get('/:communityId/attendance/my', auth, creatorCommunityController.getMyAttendance);

module.exports = router;
