/**
 * 주주 전용 커뮤니티 라우트
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/shareholderCommunityController');
const { authenticateToken } = require('../middleware/auth');

// 선택적 인증 미들웨어
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    return authenticateToken(req, res, next);
  }
  next();
};

// === 커뮤니티 관리 ===

// 커뮤니티 생성 (크리에이터 전용)
router.post('/', authenticateToken, controller.createCommunity);

// 내 커뮤니티 목록
router.get('/my', authenticateToken, controller.getUserCommunities);

// 주식으로 커뮤니티 조회
router.get('/stock/:stockId', optionalAuth, controller.getCommunityByStock);

// 커뮤니티 상세 조회
router.get('/:communityId', optionalAuth, controller.getCommunityDetail);

// 커뮤니티 설정 업데이트
router.put('/:communityId/settings', authenticateToken, controller.updateSettings);

// 커뮤니티 통계
router.get('/:communityId/stats', authenticateToken, controller.getCommunityStats);

// === 멤버 관리 ===

// 커뮤니티 가입
router.post('/:communityId/join', authenticateToken, controller.joinCommunity);

// 커뮤니티 탈퇴
router.post('/:communityId/leave', authenticateToken, controller.leaveCommunity);

// 멤버 목록 조회
router.get('/:communityId/members', optionalAuth, controller.getMembers);

// 멤버 경고
router.post('/:communityId/members/:userId/warn', authenticateToken, controller.warnMember);

// 멤버 퇴장
router.post('/:communityId/members/:userId/ban', authenticateToken, controller.banMember);

// 멤버 보유량 업데이트 (관리자용)
router.post('/:communityId/update-shareholdings', authenticateToken, controller.updateMemberShareholdings);

// === 채팅 ===

// 메시지 전송
router.post('/:communityId/messages', authenticateToken, controller.sendMessage);

// 메시지 조회
router.get('/:communityId/messages', optionalAuth, controller.getMessages);

// 고정 메시지 조회
router.get('/:communityId/messages/pinned', optionalAuth, controller.getPinnedMessages);

// 메시지 고정
router.post('/messages/:messageId/pin', authenticateToken, controller.pinMessage);

// === 공지사항 ===

// 공지사항 작성
router.post('/:communityId/notices', authenticateToken, controller.createNotice);

// 공지사항 조회
router.get('/:communityId/notices', optionalAuth, controller.getNotices);

module.exports = router;
