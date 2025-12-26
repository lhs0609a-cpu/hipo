const express = require('express');
const router = express.Router();
const communityAdminController = require('../controllers/communityAdminController');
const auth = require('../middleware/auth');

// 방장 대시보드
router.get('/:communityId/admin/dashboard', auth, communityAdminController.getAdminDashboard);

// 경고 발행
router.post('/:communityId/admin/warn/:targetUserId', auth, communityAdminController.warnMember);

// 멤버 강퇴
router.post('/:communityId/admin/ban/:targetUserId', auth, communityAdminController.banMember);

// 투표 생성
router.post('/:communityId/admin/polls', auth, communityAdminController.createPoll);

// 투표하기
router.post('/polls/:pollId/vote', auth, communityAdminController.vote);

// 투표 결과 조회
router.get('/polls/:pollId/results', auth, communityAdminController.getPollResults);

// 공지사항 생성
router.post('/:communityId/admin/notices', auth, communityAdminController.createNotice);

// 공지사항 목록
router.get('/:communityId/notices', auth, communityAdminController.getNotices);

// 커뮤니티 가입
router.post('/:communityId/join', auth, communityAdminController.joinCommunity);

// 멤버 주식 업데이트 (내부 API)
router.post('/update-shareholding', auth, communityAdminController.updateMemberShareholding);

module.exports = router;
