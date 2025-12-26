const { getShareholderStatus, hasPermission, checkCommentLimit } = require('../utils/shareholderHelper');

/**
 * 특정 권한이 있는지 확인하는 미들웨어
 * @param {string} permission - 확인할 권한명
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      const targetUserId = req.params.targetUserId || req.body.targetUserId;

      if (!targetUserId) {
        return res.status(400).json({ error: '대상 사용자 ID가 필요합니다.' });
      }

      const hasAccess = await hasPermission(userId, targetUserId, permission);

      if (!hasAccess) {
        const status = await getShareholderStatus(userId, targetUserId);
        return res.status(403).json({
          error: '권한이 없습니다.',
          currentTier: status.tierName,
          shareholding: status.shareholding,
          requiredPermission: permission
        });
      }

      req.shareholderStatus = await getShareholderStatus(userId, targetUserId);
      next();
    } catch (error) {
      console.error('권한 확인 오류:', error);
      res.status(500).json({ error: '권한 확인 중 오류가 발생했습니다.' });
    }
  };
};

/**
 * 프리미엄 콘텐츠 접근 권한 확인
 */
const checkPremiumAccess = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const post = req.post; // 이전 미들웨어에서 설정된 게시물

    if (!post.isPremium) {
      // 일반 콘텐츠는 모두 접근 가능
      return next();
    }

    const authorId = post.userId;
    const hasAccess = await hasPermission(userId, authorId, 'viewPremiumContent');

    if (!hasAccess) {
      const status = await getShareholderStatus(userId, authorId);
      return res.status(403).json({
        error: '프리미엄 콘텐츠입니다. 접근 권한이 없습니다.',
        isPremium: true,
        currentTier: status.tierName,
        shareholding: status.shareholding
      });
    }

    next();
  } catch (error) {
    console.error('프리미엄 접근 확인 오류:', error);
    res.status(500).json({ error: '권한 확인 중 오류가 발생했습니다.' });
  }
};

/**
 * 댓글 작성 제한 확인
 */
const checkCommentPermission = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const targetUserId = req.body.targetUserId; // 게시물 작성자 ID

    if (!targetUserId) {
      return res.status(400).json({ error: '대상 사용자 ID가 필요합니다.' });
    }

    // 자신의 게시물에는 무제한 댓글 가능
    if (userId === targetUserId) {
      return next();
    }

    const limitCheck = await checkCommentLimit(userId, targetUserId);

    if (!limitCheck.allowed) {
      const status = await getShareholderStatus(userId, targetUserId);
      return res.status(403).json({
        error: '이번 달 댓글 작성 제한을 초과했습니다.',
        currentTier: status.tierName,
        shareholding: status.shareholding,
        limit: limitCheck.limit,
        used: limitCheck.used
      });
    }

    req.commentLimit = limitCheck;
    req.shareholderStatus = await getShareholderStatus(userId, targetUserId);
    next();
  } catch (error) {
    console.error('댓글 권한 확인 오류:', error);
    res.status(500).json({ error: '권한 확인 중 오류가 발생했습니다.' });
  }
};

/**
 * DM 권한 확인
 */
const checkDirectMessagePermission = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let targetUserId = req.params.userId || req.params.otherUserId || req.body.recipientId;

    // conversationId가 있는 경우 대화에서 상대방 찾기
    if (!targetUserId && req.params.conversationId) {
      const { Conversation } = require('../models');
      const conversation = await Conversation.findByPk(req.params.conversationId);

      if (conversation) {
        targetUserId = conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;
      }
    }

    if (!targetUserId) {
      return res.status(400).json({ error: '대상 사용자 ID가 필요합니다.' });
    }

    const hasAccess = await hasPermission(userId, targetUserId, 'directMessage');

    if (!hasAccess) {
      const status = await getShareholderStatus(userId, targetUserId);
      return res.status(403).json({
        error: 'DM 권한이 없습니다. 대주주 등급 이상이 필요합니다.',
        currentTier: status.tierName,
        shareholding: status.shareholding,
        requiredTier: '대주주 (1,000주 이상)'
      });
    }

    req.shareholderStatus = await getShareholderStatus(userId, targetUserId);
    next();
  } catch (error) {
    console.error('DM 권한 확인 오류:', error);
    res.status(500).json({ error: '권한 확인 중 오류가 발생했습니다.' });
  }
};

/**
 * 주주 등급 정보를 요청에 첨부
 */
const attachShareholderStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const targetUserId = req.params.targetUserId || req.params.userId || req.body.targetUserId;

    if (targetUserId) {
      req.shareholderStatus = await getShareholderStatus(userId, targetUserId);
    }

    next();
  } catch (error) {
    console.error('주주 정보 조회 오류:', error);
    next(); // 오류가 있어도 계속 진행
  }
};

module.exports = {
  requirePermission,
  checkPremiumAccess,
  checkCommentPermission,
  checkDirectMessagePermission,
  attachShareholderStatus
};
