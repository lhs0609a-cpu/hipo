const express = require('express');
const router = express.Router();
const bookmarkController = require('../controllers/bookmarkController');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/bookmarks/:postId
 * 북마크 토글 (추가/삭제)
 */
router.post('/:postId', authenticateToken, bookmarkController.toggleBookmark);

/**
 * GET /api/bookmarks
 * 북마크한 포스트 목록 조회
 */
router.get('/', authenticateToken, bookmarkController.getBookmarkedPosts);

module.exports = router;
