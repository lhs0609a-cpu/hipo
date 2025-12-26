const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const auth = require('../middleware/auth');

// 커뮤니티 생성 (인플루언서 전용)
router.post('/', auth, communityController.createCommunity);

// 모든 커뮤니티 목록 조회
router.get('/', auth, communityController.getAllCommunities);

// 커뮤니티 정보 조회
router.get('/:communityId', auth, communityController.getCommunity);

// 인플루언서의 커뮤니티 조회
router.get('/creator/:creatorId', auth, communityController.getCommunityByCreator);

// 커뮤니티 설정 업데이트 (소유자 전용)
router.patch('/:communityId', auth, communityController.updateCommunity);

// 커뮤니티 메시지 전송
router.post('/:communityId/messages', auth, communityController.sendMessage);

// 커뮤니티 메시지 조회
router.get('/:communityId/messages', auth, communityController.getMessages);

// 메시지 고정/해제 (커뮤니티 소유자 전용)
router.patch('/messages/:messageId/pin', auth, communityController.togglePinMessage);

module.exports = router;
