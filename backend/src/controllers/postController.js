const { Post, User, Comment, Like, Bookmark, Hashtag, Follow, sequelize } = require('../models');
const { Op } = require('sequelize');
const { createNotification } = require('./notificationController');
const { extractHashtags, addHashtagsToPost, removeHashtagsFromPost } = require('../utils/hashtagHelper');
const { extractMentions, createMentionNotifications } = require('../utils/mentionHelper');
const { checkCommentLimit, incrementCommentCount, getShareholding } = require('../utils/shareholderHelper');
const { canAccessContentTier, getUserMaxTier, getRequiredShares, getTierName } = require('../utils/contentTierHelper');

/**
 * 포스트 상세 조회 (단일)
 */
exports.getPostById = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findByPk(postId, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'displayName', 'profileImage', 'bio']
        },
        {
          model: Comment,
          as: 'comments',
          order: [['created_at', 'DESC']],
          include: [{
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'profileImage']
          }]
        }
      ]
    });

    if (!post) {
      return res.status(404).json({ error: '포스트를 찾을 수 없습니다' });
    }

    // 좋아요/북마크 여부 확인 (로그인한 경우)
    let isLiked = false;
    let isBookmarked = false;

    if (req.user) {
      const liked = await Like.findOne({
        where: { postId: post.id, userId: req.user.id }
      });
      isLiked = !!liked;

      const bookmarked = await Bookmark.findOne({
        where: { postId: post.id, userId: req.user.id }
      });
      isBookmarked = !!bookmarked;
    }

    res.json({
      ...post.toJSON(),
      isLiked,
      isBookmarked
    });
  } catch (error) {
    console.error('포스트 상세 조회 오류:', error);
    res.status(500).json({ error: '포스트를 불러오는데 실패했습니다' });
  }
};

/**
 * 포스트 목록 조회 (피드)
 */
exports.getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20, feed, feedType } = req.query;
    const offset = (page - 1) * limit;
    const activeFeedType = feedType || feed || 'all'; // feedType 우선, 없으면 feed, 둘 다 없으면 'all'

    // 피드 타입에 따른 필터링
    let whereClause = {};

    if (activeFeedType === 'following' && req.user) {
      // 팔로잉 피드: 팔로우한 사용자의 포스트만
      const followingList = await Follow.findAll({
        where: { followerId: req.user.id },
        attributes: ['followingId']
      });

      const followingIds = followingList.map(f => f.followingId);

      // 팔로우한 사용자가 없으면 빈 배열 반환
      if (followingIds.length === 0) {
        return res.json({ posts: [] });
      }

      whereClause.userId = { [Op.in]: followingIds };
    } else if (activeFeedType === 'investment') {
      // 투자 피드: 주식 관련 해시태그가 포함된 게시물
      // 주식, 투자, 거래, 매수, 매도 등의 키워드를 포함한 게시물
      whereClause[Op.or] = [
        { content: { [Op.like]: '%#주식%' } },
        { content: { [Op.like]: '%#투자%' } },
        { content: { [Op.like]: '%#거래%' } },
        { content: { [Op.like]: '%#매수%' } },
        { content: { [Op.like]: '%#매도%' } },
        { content: { [Op.like]: '%주식%' } },
        { content: { [Op.like]: '%투자%' } },
        { content: { [Op.like]: '%PO%' } }
      ];
    }
    // 'all'인 경우 whereClause는 빈 객체로 모든 게시물 표시

    const posts = await Post.findAll({
      where: whereClause,
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
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // 현재 사용자가 좋아요한 포스트인지 확인 및 접근 권한 체크
    if (req.user) {
      const { Stock, Holding } = require('../models');

      for (let post of posts) {
        const liked = await Like.findOne({
          where: {
            postId: post.id,
            userId: req.user.id
          }
        });
        post.dataValues.isLiked = !!liked;

        // 북마크 여부 확인
        const bookmarked = await Bookmark.findOne({
          where: {
            postId: post.id,
            userId: req.user.id
          }
        });
        post.dataValues.isBookmarked = !!bookmarked;

        // 공개 범위 접근 권한 확인
        let hasAccess = true;
        let lockMessage = '';

        // 본인 게시물은 항상 접근 가능
        if (post.userId !== req.user.id) {
          if (post.visibilityType === 'PUBLIC') {
            hasAccess = true;
          } else if (post.visibilityType === 'FOLLOWERS_ONLY') {
            // 팔로워 전용: 팔로우 관계 확인
            const isFollowing = await Follow.findOne({
              where: {
                followerId: req.user.id,
                followingId: post.userId
              }
            });

            hasAccess = !!isFollowing;
            if (!hasAccess) {
              lockMessage = '🔒 팔로워 전용 콘텐츠입니다. 팔로우하여 내용을 확인하세요.';
            }
          } else {
            // 주주 전용 콘텐츠 (SHAREHOLDERS_ONLY, MINIMUM_SHARES)
            // 작성자의 주식 조회
            const authorStock = await Stock.findOne({
              where: { issuerId: post.userId }
            });

            if (authorStock) {
              // 사용자가 작성자의 주식을 보유하고 있는지 확인
              const holding = await Holding.findOne({
                where: {
                  userId: req.user.id,
                  stockId: authorStock.id
                }
              });

              if (!holding || holding.shares === 0) {
                hasAccess = false;
                lockMessage = '🔒 주주 전용 콘텐츠입니다. 주식을 보유해야 볼 수 있습니다.';
              } else if (post.visibilityType === 'SHAREHOLDERS_ONLY') {
                hasAccess = holding.shares > 0;
                if (!hasAccess) {
                  lockMessage = '🔒 주주 전용 콘텐츠입니다.';
                }
              } else if (post.visibilityType === 'MINIMUM_SHARES') {
                hasAccess = holding.shares >= post.minimumShares;
                if (!hasAccess) {
                  lockMessage = `🔒 ${post.minimumShares}주 이상 보유한 주주 전용 콘텐츠입니다. (현재 보유: ${holding.shares}주)`;
                }
              }
            } else {
              hasAccess = false;
              lockMessage = '🔒 주주 전용 콘텐츠입니다. 주식을 보유해야 볼 수 있습니다.';
            }
          }
        }

        post.dataValues.hasAccess = hasAccess;

        // 접근 불가능한 경우 콘텐츠 숨기기
        if (!hasAccess) {
          post.dataValues.contentLocked = true;
          post.dataValues.visibilityType = post.visibilityType;
          post.dataValues.minimumShares = post.minimumShares;
          post.content = lockMessage;
          post.imageUrl = null; // 이미지도 숨김
        }
      }
    }

    res.json({ posts });
  } catch (error) {
    console.error('포스트 목록 조회 오류:', error);
    res.status(500).json({ error: '포스트 목록 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 포스트 생성
 */
exports.createPost = async (req, res) => {
  try {
    const { content, imageUrl, visibilityType, minimumShares = 0, contentTier, minShareCount } = req.body;
    const userId = req.user.id;

    if (!content && !imageUrl) {
      return res.status(400).json({ error: '내용 또는 이미지가 필요합니다' });
    }

    // contentTier를 visibilityType으로 변환 (프론트엔드 호환성)
    let finalVisibilityType = visibilityType || 'PUBLIC';
    let finalMinimumShares = minimumShares || 0;

    if (contentTier) {
      const tierMapping = {
        'PUBLIC': { type: 'PUBLIC', shares: 0 },
        'FOLLOWERS': { type: 'FOLLOWERS_ONLY', shares: 0 },
        'SHAREHOLDERS': { type: 'SHAREHOLDERS_ONLY', shares: 1 },
        'BRONZE': { type: 'MINIMUM_SHARES', shares: 10 },
        'SILVER': { type: 'MINIMUM_SHARES', shares: 100 },
        'GOLD': { type: 'MINIMUM_SHARES', shares: 1000 },
        'PLATINUM': { type: 'MINIMUM_SHARES', shares: 10000 },
        'CUSTOM': { type: 'MINIMUM_SHARES', shares: minShareCount || 0 }
      };

      const mapping = tierMapping[contentTier];
      if (mapping) {
        finalVisibilityType = mapping.type;
        finalMinimumShares = mapping.shares;
      }
    }

    // 유효한 공개 범위 확인
    const validTypes = ['PUBLIC', 'FOLLOWERS_ONLY', 'SHAREHOLDERS_ONLY', 'MINIMUM_SHARES'];
    if (!validTypes.includes(finalVisibilityType)) {
      return res.status(400).json({ error: '유효하지 않은 공개 범위입니다.' });
    }

    // MINIMUM_SHARES인 경우 minimumShares 값 필수
    if (finalVisibilityType === 'MINIMUM_SHARES' && (!finalMinimumShares || finalMinimumShares <= 0)) {
      return res.status(400).json({ error: '최소 보유 주식 수를 입력해주세요.' });
    }

    const post = await Post.create({
      userId,
      content,
      imageUrl,
      visibilityType: finalVisibilityType,
      minimumShares: finalMinimumShares,
      isPremium: finalVisibilityType !== 'PUBLIC' // PUBLIC이 아니면 프리미엄
    });

    // 해시태그 추출 및 저장
    if (content) {
      const hashtags = extractHashtags(content);
      if (hashtags.length > 0) {
        await addHashtagsToPost(post, hashtags, { Hashtag });
      }

      // 멘션 추출 및 알림 생성
      const mentions = extractMentions(content);
      if (mentions.length > 0) {
        await createMentionNotifications(mentions, userId, { postId: post.id }, { User });
      }
    }

    const postWithAuthor = await Post.findByPk(post.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'profileImage', 'trustLevel']
      }]
    });

    res.status(201).json({
      message: '포스트가 생성되었습니다',
      post: postWithAuthor
    });
  } catch (error) {
    console.error('포스트 생성 오류:', error);
    res.status(500).json({ error: '포스트 생성 중 오류가 발생했습니다' });
  }
};

/**
 * 포스트 좋아요
 */
exports.likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ error: '포스트를 찾을 수 없습니다' });
    }

    // 이미 좋아요했는지 확인
    const existing = await Like.findOne({
      where: { postId, userId }
    });

    if (existing) {
      // 좋아요 취소
      await existing.destroy();
      await post.update({
        likesCount: post.likesCount - 1
      });

      return res.json({
        message: '좋아요를 취소했습니다',
        isLiked: false,
        likesCount: post.likesCount - 1
      });
    } else {
      // 좋아요 추가
      await Like.create({ postId, userId });
      await post.update({
        likesCount: post.likesCount + 1
      });

      // 알림 생성 (포스트 작성자에게)
      await createNotification(post.userId, userId, 'like', { postId });

      return res.json({
        message: '좋아요를 추가했습니다',
        isLiked: true,
        likesCount: post.likesCount + 1
      });
    }
  } catch (error) {
    console.error('포스트 좋아요 오류:', error);
    res.status(500).json({ error: '좋아요 처리 중 오류가 발생했습니다' });
  }
};

/**
 * 댓글 추가
 */
exports.addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: '댓글 내용이 필요합니다' });
    }

    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ error: '포스트를 찾을 수 없습니다' });
    }

    // 주주 등급 기반 댓글 제한 확인 (본인 게시물 제외)
    if (userId !== post.userId) {
      const commentLimitCheck = await checkCommentLimit(userId, post.userId);

      if (!commentLimitCheck.allowed) {
        return res.status(403).json({
          error: '이번 달 댓글 작성 제한을 초과했습니다.',
          limit: commentLimitCheck.limit,
          used: commentLimitCheck.used
        });
      }
    }

    // 댓글 작성 시점의 주식 보유량 기록
    const shareholding = userId !== post.userId ? await getShareholding(userId, post.userId) : 0;
    const isPinned = shareholding >= 10000; // 최대주주(10,000주 이상)는 자동 고정

    const comment = await Comment.create({
      postId,
      userId,
      content: content.trim(),
      shareholding,
      isPinned
    });

    await post.update({
      commentsCount: post.commentsCount + 1
    });

    // 댓글 카운트 증가 (본인 게시물 제외)
    if (userId !== post.userId) {
      await incrementCommentCount(userId, post.userId);
    }

    // 알림 생성 (포스트 작성자에게)
    await createNotification(post.userId, userId, 'comment', { postId, commentId: comment.id });

    // 멘션 추출 및 알림 생성
    const mentions = extractMentions(content);
    if (mentions.length > 0) {
      await createMentionNotifications(mentions, userId, { postId, commentId: comment.id }, { User });
    }

    const commentWithAuthor = await Comment.findByPk(comment.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'profileImage']
      }]
    });

    res.status(201).json({
      message: '댓글이 추가되었습니다',
      comment: commentWithAuthor
    });
  } catch (error) {
    console.error('댓글 추가 오류:', error);
    res.status(500).json({ error: '댓글 추가 중 오류가 발생했습니다' });
  }
};

/**
 * 댓글 목록 조회
 */
exports.getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const comments = await Comment.findAll({
      where: { postId },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'profileImage']
      }],
      order: [
        ['isPinned', 'DESC'],      // 고정 댓글 우선 (최대주주 자동 고정)
        ['shareholding', 'DESC'],  // 주식 보유량 많을수록 상단
        ['created_at', 'DESC']     // 최신순
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ comments });
  } catch (error) {
    console.error('댓글 목록 조회 오류:', error);
    res.status(500).json({ error: '댓글 목록 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 포스트 수정
 */
exports.updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, imageUrl } = req.body;
    const userId = req.user.id;

    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ error: '포스트를 찾을 수 없습니다' });
    }

    if (post.userId !== userId) {
      return res.status(403).json({ error: '수정 권한이 없습니다' });
    }

    if (!content && !imageUrl) {
      return res.status(400).json({ error: '내용 또는 이미지가 필요합니다' });
    }

    await post.update({
      content,
      imageUrl
    });

    // 기존 해시태그 제거
    await removeHashtagsFromPost(post, { Hashtag });

    // 새 해시태그 추가
    const hashtags = extractHashtags(content);
    if (hashtags.length > 0) {
      await addHashtagsToPost(post, hashtags, { Hashtag });
    }

    const updatedPost = await Post.findByPk(postId, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'profileImage']
      }]
    });

    res.json({
      message: '포스트가 수정되었습니다',
      post: updatedPost
    });
  } catch (error) {
    console.error('포스트 수정 오류:', error);
    res.status(500).json({ error: '포스트 수정 중 오류가 발생했습니다' });
  }
};

/**
 * 댓글 수정
 */
exports.updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: '댓글 내용이 필요합니다' });
    }

    const comment = await Comment.findByPk(commentId);
    if (!comment) {
      return res.status(404).json({ error: '댓글을 찾을 수 없습니다' });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ error: '수정 권한이 없습니다' });
    }

    await comment.update({
      content: content.trim()
    });

    const updatedComment = await Comment.findByPk(commentId, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'profileImage']
      }]
    });

    res.json({
      message: '댓글이 수정되었습니다',
      comment: updatedComment
    });
  } catch (error) {
    console.error('댓글 수정 오류:', error);
    res.status(500).json({ error: '댓글 수정 중 오류가 발생했습니다' });
  }
};

/**
 * 댓글 삭제
 */
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findByPk(commentId);
    if (!comment) {
      return res.status(404).json({ error: '댓글을 찾을 수 없습니다' });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ error: '삭제 권한이 없습니다' });
    }

    const postId = comment.postId;
    await comment.destroy();

    // 포스트의 댓글 수 감소
    const post = await Post.findByPk(postId);
    if (post) {
      await post.update({
        commentsCount: Math.max(0, post.commentsCount - 1)
      });
    }

    res.json({ message: '댓글이 삭제되었습니다' });
  } catch (error) {
    console.error('댓글 삭제 오류:', error);
    res.status(500).json({ error: '댓글 삭제 중 오류가 발생했습니다' });
  }
};

/**
 * 포스트 삭제
 */
exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ error: '포스트를 찾을 수 없습니다' });
    }

    if (post.userId !== userId) {
      return res.status(403).json({ error: '삭제 권한이 없습니다' });
    }

    await post.destroy();

    res.json({ message: '포스트가 삭제되었습니다' });
  } catch (error) {
    console.error('포스트 삭제 오류:', error);
    res.status(500).json({ error: '포스트 삭제 중 오류가 발생했습니다' });
  }
};

/**
 * 트렌딩/핫한 피드 조회 (좋아요 + 댓글 수 기준)
 */
exports.getTrendingPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20, timeframe = '24h' } = req.query;
    const offset = (page - 1) * limit;

    // 시간대 계산 (24시간, 7일, 30일)
    let timeframeHours = 24;
    if (timeframe === '7d') timeframeHours = 24 * 7;
    else if (timeframe === '30d') timeframeHours = 24 * 30;

    const sinceDate = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);

    // 좋아요 + 댓글 수 기준으로 인기 포스트 조회
    const posts = await Post.findAll({
      where: {
        created_at: { [Op.gte]: sinceDate },
        visibilityType: 'PUBLIC' // 공개 포스트만
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'profileImage', 'trustLevel']
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
      order: [
        [sequelize.literal('(likes_count + comments_count * 2)'), 'DESC'], // 댓글에 더 높은 가중치
        ['created_at', 'DESC']
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // 현재 사용자가 좋아요한 포스트인지 확인
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

    res.json({ posts });
  } catch (error) {
    console.error('트렌딩 피드 조회 오류:', error);
    res.status(500).json({ error: '트렌딩 피드 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 내 투자 뉴스 조회 (내가 주식을 보유한 사람들의 소식)
 */
exports.getMyInvestmentNews = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { Stock, Holding } = require('../models');

    // 내가 보유한 주식 목록 조회
    const myHoldings = await Holding.findAll({
      where: {
        userId: userId,
        shares: { [Op.gt]: 0 }
      },
      include: [{
        model: Stock,
        as: 'stock',
        attributes: ['id', 'issuerId']
      }]
    });

    // 발행자 ID 추출
    const issuerIds = myHoldings.map(h => h.stock.issuerId).filter(id => id !== userId);

    // 투자한 사람이 없으면 빈 배열 반환
    if (issuerIds.length === 0) {
      return res.json({ news: [] });
    }

    // 해당 발행자들의 게시글 조회
    const posts = await Post.findAll({
      where: {
        userId: { [Op.in]: issuerIds }
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'profileImage', 'trustLevel']
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
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // 좋아요 및 북마크 여부 확인
    for (let post of posts) {
      const liked = await Like.findOne({
        where: {
          postId: post.id,
          userId: userId
        }
      });
      post.dataValues.isLiked = !!liked;

      const bookmarked = await Bookmark.findOne({
        where: {
          postId: post.id,
          userId: userId
        }
      });
      post.dataValues.isBookmarked = !!bookmarked;

      // 공개 범위 접근 권한 확인
      let hasAccess = true;
      let lockMessage = '';

      if (post.visibilityType === 'PUBLIC') {
        hasAccess = true;
      } else {
        // 작성자의 주식 조회
        const authorStock = await Stock.findOne({
          where: { issuerId: post.userId }
        });

        if (authorStock) {
          // 사용자가 작성자의 주식을 보유하고 있는지 확인
          const holding = await Holding.findOne({
            where: {
              userId: userId,
              stockId: authorStock.id
            }
          });

          if (!holding) {
            hasAccess = false;
            lockMessage = '🔒 주주 전용 콘텐츠입니다. 주식을 보유해야 볼 수 있습니다.';
          } else if (post.visibilityType === 'SHAREHOLDERS_ONLY') {
            hasAccess = holding.shares > 0;
            if (!hasAccess) {
              lockMessage = '🔒 주주 전용 콘텐츠입니다.';
            }
          } else if (post.visibilityType === 'MINIMUM_SHARES') {
            hasAccess = holding.shares >= post.minimumShares;
            if (!hasAccess) {
              lockMessage = `🔒 ${post.minimumShares}주 이상 보유한 주주 전용 콘텐츠입니다. (현재 보유: ${holding.shares}주)`;
            }
          }
        }
      }

      post.dataValues.hasAccess = hasAccess;

      // 접근 불가능한 경우 콘텐츠 숨기기
      if (!hasAccess) {
        post.dataValues.contentLocked = true;
        post.dataValues.visibilityType = post.visibilityType;
        post.dataValues.minimumShares = post.minimumShares;
        post.content = lockMessage;
        post.imageUrl = null;
      }

      // 보유 주식 정보 추가
      const myHolding = myHoldings.find(h => h.stock.issuerId === post.userId);
      if (myHolding) {
        post.dataValues.myShareholding = myHolding.shares;
      }
    }

    res.json({ news: posts });
  } catch (error) {
    console.error('투자 뉴스 조회 오류:', error);
    res.status(500).json({ error: '투자 뉴스 조회 중 오류가 발생했습니다' });
  }
};
