const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/posts/news
 * 내 투자 뉴스 조회 (인증 필요)
 */
router.get('/news', authenticateToken, postController.getMyInvestmentNews);

/**
 * GET /api/posts/trending
 * 트렌딩/핫한 피드 조회
 */
router.get('/trending', postController.getTrendingPosts);

/**
 * GET /api/posts
 * 포스트 목록 조회 (피드)
 */
router.get('/', postController.getPosts);

/**
 * POST /api/posts
 * 포스트 생성 (인증 필요)
 */
router.post('/', authenticateToken, postController.createPost);

/**
 * POST /api/posts/:postId/like
 * 포스트 좋아요/취소 (인증 필요)
 */
router.post('/:postId/like', authenticateToken, postController.likePost);

/**
 * POST /api/posts/:postId/comments
 * 댓글 추가 (인증 필요)
 */
router.post('/:postId/comments', authenticateToken, postController.addComment);

/**
 * GET /api/posts/:postId/comments
 * 댓글 목록 조회
 */
router.get('/:postId/comments', postController.getComments);

/**
 * PUT /api/posts/comments/:commentId
 * 댓글 수정 (인증 필요)
 */
router.put('/comments/:commentId', authenticateToken, postController.updateComment);

/**
 * DELETE /api/posts/comments/:commentId
 * 댓글 삭제 (인증 필요)
 */
router.delete('/comments/:commentId', authenticateToken, postController.deleteComment);

/**
 * PUT /api/posts/:postId
 * 포스트 수정 (인증 필요)
 */
router.put('/:postId', authenticateToken, postController.updatePost);

/**
 * DELETE /api/posts/:postId
 * 포스트 삭제 (인증 필요)
 */
router.delete('/:postId', authenticateToken, postController.deletePost);

module.exports = router;
