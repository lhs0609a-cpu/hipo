const { User, Follow, Post, Comment, Like, Bookmark, Stock } = require('../models');
const { createNotification } = require('./notificationController');
const { Op } = require('sequelize');
const {
  validatePagination,
  validatePositiveInt,
  sanitizeSearchQuery,
  isValidUUID,
  validateString
} = require('../utils/validation');

/**
 * 사용자 프로필 조회
 */
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // UUID 형식 검증
    if (!isValidUUID(userId)) {
      return res.status(400).json({ error: '유효하지 않은 사용자 ID입니다' });
    }

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    // 팔로워/팔로잉 수 조회
    const followersCount = await Follow.count({
      where: { followingId: userId }
    });

    const followingCount = await Follow.count({
      where: { followerId: userId }
    });

    // 포스트 수 조회
    const postsCount = await Post.count({
      where: { userId }
    });

    // 현재 사용자가 팔로우 중인지 확인
    let isFollowing = false;
    if (req.user && req.user.id !== userId) {
      const follow = await Follow.findOne({
        where: {
          followerId: req.user.id,
          followingId: userId
        }
      });
      isFollowing = !!follow;
    }

    res.json({
      user: {
        ...user.toJSON(),
        followersCount,
        followingCount,
        postsCount,
        isFollowing
      }
    });
  } catch (error) {
    console.error('프로필 조회 오류:', error);
    res.status(500).json({ error: '프로필 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 팔로우
 */
exports.followUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user.id;

    // UUID 형식 검증
    if (!isValidUUID(userId)) {
      return res.status(400).json({ error: '유효하지 않은 사용자 ID입니다' });
    }

    if (followerId === userId) {
      return res.status(400).json({ error: '자기 자신을 팔로우할 수 없습니다' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    const existing = await Follow.findOne({
      where: {
        followerId,
        followingId: userId
      }
    });

    if (existing) {
      // 언팔로우
      await existing.destroy();
      return res.json({
        message: '언팔로우했습니다',
        isFollowing: false
      });
    } else {
      // 팔로우
      await Follow.create({
        followerId,
        followingId: userId
      });

      // 알림 생성
      await createNotification(userId, followerId, 'follow');

      return res.json({
        message: '팔로우했습니다',
        isFollowing: true
      });
    }
  } catch (error) {
    console.error('팔로우 오류:', error);
    res.status(500).json({ error: '팔로우 처리 중 오류가 발생했습니다' });
  }
};

/**
 * 팔로워 목록 조회
 */
exports.getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;

    // UUID 형식 검증
    if (!isValidUUID(userId)) {
      return res.status(400).json({ error: '유효하지 않은 사용자 ID입니다' });
    }

    const followers = await Follow.findAll({
      where: { followingId: userId },
      include: [{
        model: User,
        as: 'follower',
        attributes: ['id', 'username', 'profileImage']
      }]
    });

    res.json({
      followers: followers.map(f => f.follower)
    });
  } catch (error) {
    console.error('팔로워 목록 조회 오류:', error);
    res.status(500).json({ error: '팔로워 목록 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 팔로잉 목록 조회
 */
exports.getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;

    // UUID 형식 검증
    if (!isValidUUID(userId)) {
      return res.status(400).json({ error: '유효하지 않은 사용자 ID입니다' });
    }

    const following = await Follow.findAll({
      where: { followerId: userId },
      include: [{
        model: User,
        as: 'following',
        attributes: ['id', 'username', 'profileImage']
      }]
    });

    res.json({
      following: following.map(f => f.following)
    });
  } catch (error) {
    console.error('팔로잉 목록 조회 오류:', error);
    res.status(500).json({ error: '팔로잉 목록 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 사용자 검색
 */
exports.searchUsers = async (req, res) => {
  try {
    // 입력 검증 (XSS 및 DoS 방지)
    const searchTerm = sanitizeSearchQuery(req.query.q, 100);
    const { limit } = validatePagination({ limit: req.query.limit });

    if (!searchTerm || searchTerm.trim() === '') {
      return res.json({ users: [] });
    }

    const users = await User.findAll({
      where: {
        username: {
          [Op.like]: `%${searchTerm}%`
        }
      },
      attributes: ['id', 'username', 'profileImage', 'bio'],
      limit
    });

    res.json({ users });
  } catch (error) {
    console.error('사용자 검색 오류:', error);
    res.status(500).json({ error: '사용자 검색 중 오류가 발생했습니다' });
  }
};

/**
 * 프로필 수정
 */
exports.updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // UUID 형식 검증
    if (!isValidUUID(userId)) {
      return res.status(400).json({ error: '유효하지 않은 사용자 ID입니다' });
    }

    // 본인만 수정 가능
    if (userId !== currentUserId) {
      return res.status(403).json({ error: '본인의 프로필만 수정할 수 있습니다' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    const { username, bio, profileImage } = req.body;

    // 입력 검증
    const sanitizedUsername = username ? validateString(username, { minLength: 2, maxLength: 50 }) : undefined;
    const sanitizedBio = bio ? validateString(bio, { maxLength: 500 }) : undefined;
    const sanitizedProfileImage = profileImage ? validateString(profileImage, { maxLength: 500 }) : undefined;

    // 사용자 이름 중복 체크
    if (sanitizedUsername && sanitizedUsername !== user.username) {
      const existingUser = await User.findOne({ where: { username: sanitizedUsername } });
      if (existingUser) {
        return res.status(400).json({ error: '이미 사용 중인 사용자 이름입니다' });
      }
    }

    // 업데이트할 필드만 추출
    const updateData = {};
    if (sanitizedUsername !== undefined) updateData.username = sanitizedUsername;
    if (sanitizedBio !== undefined) updateData.bio = sanitizedBio;
    if (sanitizedProfileImage !== undefined) updateData.profileImage = sanitizedProfileImage;

    await user.update(updateData);

    // 업데이트된 사용자 정보 반환 (비밀번호 제외)
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      message: '프로필이 업데이트되었습니다',
      user: updatedUser
    });
  } catch (error) {
    console.error('프로필 수정 오류:', error);
    res.status(500).json({ error: '프로필 수정 중 오류가 발생했습니다' });
  }
};

/**
 * 특정 사용자의 포스트 목록 조회
 */
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;

    // UUID 형식 검증
    if (!isValidUUID(userId)) {
      return res.status(400).json({ error: '유효하지 않은 사용자 ID입니다' });
    }

    // 입력 검증 (DoS 방지)
    const { page, limit, offset } = validatePagination(req.query);

    // 사용자 확인
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    // 포스트 목록 조회
    const posts = await Post.findAll({
      where: { userId },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'profileImage']
        },
        {
          model: Comment,
          as: 'comments',
          limit: 3,
          order: [['created_at', 'DESC']],
          include: [{
            model: User,
            as: 'author',
            attributes: ['id', 'username']
          }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    // 현재 사용자의 좋아요/북마크 여부 확인
    if (req.user) {
      for (let post of posts) {
        const liked = await Like.findOne({
          where: {
            postId: post.id,
            userId: req.user.id
          }
        });
        post.dataValues.isLiked = !!liked;

        const bookmarked = await Bookmark.findOne({
          where: {
            postId: post.id,
            userId: req.user.id
          }
        });
        post.dataValues.isBookmarked = !!bookmarked;
      }
    }

    // 전체 포스트 수 조회
    const totalPosts = await Post.count({ where: { userId } });

    res.json({
      posts,
      pagination: {
        total: totalPosts,
        page,
        limit,
        totalPages: Math.ceil(totalPosts / limit)
      }
    });
  } catch (error) {
    console.error('사용자 포스트 조회 오류:', error);
    res.status(500).json({ error: '포스트 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 카테고리별 트렌딩 인플루언서 조회
 */
exports.getTrendingByCategories = async (req, res) => {
  try {
    // 입력 검증 (DoS 방지)
    const { limit } = validatePagination({ limit: req.query.limit || 10 });

    // 카테고리 정의 (실제로는 User 모델에 category 필드를 추가하는 것이 좋음)
    // 현재는 trustLevel과 활동 기준으로 구분
    const categories = [
      { name: '배우', icon: '🎬', trustLevels: ['platinum', 'diamond', 'master', 'legend'] },
      { name: '미술가', icon: '🎨', trustLevels: ['gold', 'platinum', 'diamond'] },
      { name: '기업가', icon: '💼', trustLevels: ['diamond', 'master', 'legend'] },
      { name: '뮤지션', icon: '🎵', trustLevels: ['silver', 'gold', 'platinum'] },
      { name: '운동선수', icon: '⚽', trustLevels: ['gold', 'platinum', 'diamond'] },
    ];

    const result = {};

    for (const category of categories) {
      // 해당 카테고리의 사용자 조회 (trustLevel 기준)
      const users = await User.findAll({
        where: {
          trustLevel: { [Op.in]: category.trustLevels },
          isCreator: true // 상장인만
        },
        attributes: ['id', 'username', 'profileImage', 'bio', 'trustLevel', 'marketCap'],
        include: [{
          model: Stock,
          as: 'issuedStock',
          attributes: ['id', 'sharePrice', 'totalShares', 'availableShares']
        }],
        order: [
          ['marketCap', 'DESC'],
          ['trustLevel', 'DESC']
        ],
        limit
      });

      // 각 사용자의 팔로워 수 추가
      for (let user of users) {
        const followersCount = await Follow.count({
          where: { followingId: user.id }
        });
        user.dataValues.followersCount = followersCount;

        // 최근 포스트 수
        const recentPostsCount = await Post.count({
          where: {
            userId: user.id,
            created_at: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 최근 7일
          }
        });
        user.dataValues.recentPostsCount = recentPostsCount;
      }

      result[category.name] = {
        name: category.name,
        icon: category.icon,
        users: users.filter(u => u.dataValues.recentPostsCount > 0 || u.dataValues.followersCount > 0)
      };
    }

    res.json({ categories: result });
  } catch (error) {
    console.error('카테고리별 트렌딩 조회 오류:', error);
    res.status(500).json({ error: '카테고리별 트렌딩 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 푸시 토큰 저장/업데이트
 */
exports.updatePushToken = async (req, res) => {
  try {
    const userId = req.user.id;

    // 입력 검증 (악성 입력 방지)
    const pushToken = validateString(req.body.pushToken, { minLength: 1, maxLength: 500 });
    const platform = req.body.platform ? validateString(req.body.platform, { maxLength: 50 }) : null;
    const deviceInfo = req.body.deviceInfo;

    if (!pushToken) {
      return res.status(400).json({ error: '푸시 토큰이 필요합니다' });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    // 푸시 토큰 업데이트
    await user.update({
      pushToken,
      pushPlatform: platform
    });

    // ⚠️ 보안: 푸시 토큰 및 디바이스 정보는 로깅하지 않음 (개인정보 보호)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Push token updated for user ${userId}`);
    }

    res.json({
      success: true,
      message: '푸시 토큰이 저장되었습니다'
    });
  } catch (error) {
    console.error('푸시 토큰 저장 오류:', error);
    res.status(500).json({ error: '푸시 토큰 저장 중 오류가 발생했습니다' });
  }
};

/**
 * 알림 설정 업데이트
 */
exports.updateNotificationSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    const userId = req.user.id;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    // 알림 설정 업데이트
    await user.update({
      notificationSettings: {
        ...user.notificationSettings,
        ...settings
      }
    });

    res.json({
      success: true,
      message: '알림 설정이 업데이트되었습니다',
      settings: user.notificationSettings
    });
  } catch (error) {
    console.error('알림 설정 업데이트 오류:', error);
    res.status(500).json({ error: '알림 설정 업데이트 중 오류가 발생했습니다' });
  }
};

/**
 * 알림 설정 조회
 */
exports.getNotificationSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
      attributes: ['notificationSettings']
    });

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    res.json({
      success: true,
      settings: user.notificationSettings || {
        trading: true,
        dividend: true,
        priceAlert: true,
        social: true,
        system: true
      }
    });
  } catch (error) {
    console.error('알림 설정 조회 오류:', error);
    res.status(500).json({ error: '알림 설정 조회 중 오류가 발생했습니다' });
  }
};
