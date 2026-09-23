const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/users/search
 * 사용자 검색
 */
router.get('/search', userController.searchUsers);

/**
 * GET /api/users/trending/categories
 * 카테고리별 트렌딩 인플루언서 조회
 */
router.get('/trending/categories', userController.getTrendingByCategories);

// Static settings routes must be registered before /:userId routes.
router.post('/push-token', authenticateToken, userController.updatePushToken);
router.put('/notification-settings', authenticateToken, userController.updateNotificationSettings);
router.get('/notification-settings', authenticateToken, userController.getNotificationSettings);
router.put('/me', authenticateToken, (req, res) => {
  req.params.userId = req.user.id;
  return userController.updateProfile(req, res);
});

/**
 * GET /api/users/:userId
 * 사용자 프로필 조회
 */
router.get('/:userId', userController.getUserProfile);

/**
 * POST /api/users/:userId/follow
 * 팔로우/언팔로우 (인증 필요)
 */
router.post('/:userId/follow', authenticateToken, userController.followUser);

/**
 * GET /api/users/:userId/followers
 * 팔로워 목록 조회
 */
router.get('/:userId/followers', userController.getFollowers);

/**
 * GET /api/users/:userId/following
 * 팔로잉 목록 조회
 */
router.get('/:userId/following', userController.getFollowing);

/**
 * PUT /api/users/:userId
 * 프로필 수정 (인증 필요)
 */
router.put('/:userId', authenticateToken, userController.updateProfile);

/**
 * GET /api/users/:userId/posts
 * 특정 사용자의 포스트 목록 조회
 */
router.get('/:userId/posts', userController.getUserPosts);

/**
 * POST /api/users/push-token
 * 푸시 토큰 저장/업데이트 (인증 필요)
 */

/**
 * PUT /api/users/notification-settings
 * 알림 설정 업데이트 (인증 필요)
 */

/**
 * GET /api/users/notification-settings
 * 알림 설정 조회 (인증 필요)
 */

module.exports = router;
