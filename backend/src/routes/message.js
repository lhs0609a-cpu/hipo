const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/auth');
const { checkDirectMessagePermission } = require('../middleware/shareholderAuth');

// 대화 목록 조회
router.get('/conversations', authenticateToken, messageController.getConversations);

// 특정 사용자와의 대화 가져오기 또는 생성
router.get('/conversations/:otherUserId', authenticateToken, checkDirectMessagePermission, messageController.getOrCreateConversation);

// 대화 내 메시지 조회
router.get('/:conversationId', authenticateToken, messageController.getMessages);

// 메시지 전송 (DM 권한 체크 필요)
router.post('/:conversationId', authenticateToken, checkDirectMessagePermission, messageController.sendMessage);

// 메시지 읽음 처리
router.put('/:conversationId/read', authenticateToken, messageController.markAsRead);

module.exports = router;
