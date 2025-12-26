const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const levelController = require('../controllers/levelController');
const contentRequestController = require('../controllers/contentRequestController');
const auth = require('../middleware/auth');

// === 채팅 메시지 관련 ===

// 메시지 전송
router.post('/:communityId/messages', auth, chatController.sendMessage);

// 메시지 목록 조회 (페이지네이션)
router.get('/:communityId/messages', auth, chatController.getMessages);

// 메시지 고정/고정 해제 (방장/부방장)
router.patch('/messages/:messageId/pin', auth, chatController.pinMessage);

// 메시지 삭제
router.delete('/messages/:messageId', auth, chatController.deleteMessage);

// 메시지 좋아요
router.post('/messages/:messageId/like', auth, chatController.likeMessage);

// 메시지 신고
router.post('/messages/:messageId/report', auth, chatController.reportMessage);

// 고정된 메시지 목록
router.get('/:communityId/messages/pinned', auth, chatController.getPinnedMessages);

// === 레벨 & 부방장 관련 ===

// 커뮤니티 내 레벨 랭킹
router.get('/:communityId/level/ranking', auth, levelController.getLevelRanking);

// 내 레벨 정보 조회
router.get('/:communityId/level/me', auth, levelController.getMyLevel);

// 부방장 임명 (방장 권한)
router.post('/:communityId/vice-admin/:targetUserId', auth, levelController.appointViceAdmin);

// 부방장 해제 (방장 권한)
router.delete('/:communityId/vice-admin/:targetUserId', auth, levelController.removeViceAdmin);

// 부방장 목록 조회
router.get('/:communityId/vice-admins', auth, levelController.getViceAdmins);

// 부방장 권한 수정 (방장 권한)
router.patch('/:communityId/vice-admin/:targetUserId/permissions', auth, levelController.updateViceAdminPermissions);

// 베스트 멤버 목록 (Lv.10 이상)
router.get('/:communityId/best-members', auth, levelController.getBestMembers);

// === 콘텐츠 요청 관련 ===

// 콘텐츠 요청 생성 (방장 권한)
router.post('/:communityId/content-request', auth, contentRequestController.createContentRequest);

// 콘텐츠 요청 투표
router.post('/content-request/:requestId/vote', auth, contentRequestController.voteContentRequest);

// 투표 결과 확인
router.get('/content-request/:requestId/result', auth, contentRequestController.checkVotingResult);

// 상장인의 콘텐츠 요청 응답
router.post('/content-request/:requestId/respond', auth, contentRequestController.respondToRequest);

// 콘텐츠 요청 목록 조회
router.get('/:communityId/content-requests', auth, contentRequestController.getContentRequests);

// 콘텐츠 요청 상세 조회
router.get('/content-request/:requestId', auth, contentRequestController.getContentRequestDetail);

// 상장인의 전체 콘텐츠 요청 목록
router.get('/creator/content-requests', auth, contentRequestController.getCreatorContentRequests);

module.exports = router;
