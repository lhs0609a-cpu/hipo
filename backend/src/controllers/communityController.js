const { ShareholderCommunity, CommunityMessage, User } = require('../models');
const { sequelize } = require('../config/database');
const { getShareholding } = require('../utils/shareholderHelper');

/**
 * 커뮤니티 생성 (인플루언서 전용)
 */
exports.createCommunity = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const { name, description, minSharesRequired = 100 } = req.body;

    if (!name) {
      return res.status(400).json({ error: '커뮤니티 이름이 필요합니다.' });
    }

    // 이미 커뮤니티가 있는지 확인
    const existingCommunity = await ShareholderCommunity.findOne({
      where: { creatorId }
    });

    if (existingCommunity) {
      return res.status(400).json({
        error: '이미 커뮤니티가 존재합니다.',
        community: existingCommunity
      });
    }

    const community = await ShareholderCommunity.create({
      creatorId,
      name,
      description,
      minSharesRequired,
      memberCount: 0,
      isActive: true
    });

    res.status(201).json({
      message: '커뮤니티가 생성되었습니다.',
      community
    });
  } catch (error) {
    console.error('커뮤니티 생성 오류:', error);
    res.status(500).json({ error: '커뮤니티 생성 중 오류가 발생했습니다.' });
  }
};

/**
 * 커뮤니티 정보 조회
 */
exports.getCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.id;

    const community = await ShareholderCommunity.findByPk(communityId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'displayName', 'profileImage']
        }
      ]
    });

    if (!community) {
      return res.status(404).json({ error: '커뮤니티를 찾을 수 없습니다.' });
    }

    // 접근 권한 확인
    const shareholding = await getShareholding(userId, community.creatorId);
    const hasAccess = userId === community.creatorId || shareholding >= community.minSharesRequired;

    res.json({
      community,
      hasAccess,
      currentShares: shareholding,
      requiredShares: community.minSharesRequired
    });
  } catch (error) {
    console.error('커뮤니티 조회 오류:', error);
    res.status(500).json({ error: '커뮤니티 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 인플루언서의 커뮤니티 조회
 */
exports.getCommunityByCreator = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const userId = req.user.id;

    const community = await ShareholderCommunity.findOne({
      where: { creatorId },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'displayName', 'profileImage']
        }
      ]
    });

    if (!community) {
      return res.status(404).json({ error: '커뮤니티를 찾을 수 없습니다.' });
    }

    // 접근 권한 확인
    const shareholding = await getShareholding(userId, creatorId);
    const hasAccess = userId === creatorId || shareholding >= community.minSharesRequired;

    res.json({
      community,
      hasAccess,
      currentShares: shareholding,
      requiredShares: community.minSharesRequired
    });
  } catch (error) {
    console.error('커뮤니티 조회 오류:', error);
    res.status(500).json({ error: '커뮤니티 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 커뮤니티 메시지 전송
 */
exports.sendMessage = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { communityId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: '메시지 내용이 필요합니다.' });
    }

    const community = await ShareholderCommunity.findByPk(communityId, { transaction });

    if (!community) {
      await transaction.rollback();
      return res.status(404).json({ error: '커뮤니티를 찾을 수 없습니다.' });
    }

    if (!community.isActive) {
      await transaction.rollback();
      return res.status(403).json({ error: '비활성화된 커뮤니티입니다.' });
    }

    // 접근 권한 확인
    const shareholding = await getShareholding(userId, community.creatorId);
    const hasAccess = userId === community.creatorId || shareholding >= community.minSharesRequired;

    if (!hasAccess) {
      await transaction.rollback();
      return res.status(403).json({
        error: `이 커뮤니티는 ${community.minSharesRequired}주 이상 보유자만 접근할 수 있습니다.`,
        currentShares: shareholding,
        requiredShares: community.minSharesRequired
      });
    }

    // 메시지 생성
    const message = await CommunityMessage.create({
      communityId,
      userId,
      content: content.trim(),
      shareholding,
      isPinned: userId === community.creatorId // 커뮤니티 소유자는 자동 고정
    }, { transaction });

    await transaction.commit();

    const messageWithAuthor = await CommunityMessage.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'displayName', 'profileImage']
        }
      ]
    });

    res.status(201).json({
      message: '메시지가 전송되었습니다.',
      communityMessage: messageWithAuthor
    });
  } catch (error) {
    await transaction.rollback();
    console.error('메시지 전송 오류:', error);
    res.status(500).json({ error: '메시지 전송 중 오류가 발생했습니다.' });
  }
};

/**
 * 커뮤니티 메시지 조회
 */
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { communityId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const community = await ShareholderCommunity.findByPk(communityId);

    if (!community) {
      return res.status(404).json({ error: '커뮤니티를 찾을 수 없습니다.' });
    }

    // 접근 권한 확인
    const shareholding = await getShareholding(userId, community.creatorId);
    const hasAccess = userId === community.creatorId || shareholding >= community.minSharesRequired;

    if (!hasAccess) {
      return res.status(403).json({
        error: `이 커뮤니티는 ${community.minSharesRequired}주 이상 보유자만 접근할 수 있습니다.`,
        currentShares: shareholding,
        requiredShares: community.minSharesRequired
      });
    }

    const messages = await CommunityMessage.findAll({
      where: { communityId },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'displayName', 'profileImage']
        }
      ],
      order: [
        ['isPinned', 'DESC'],      // 고정 메시지 우선
        ['shareholding', 'DESC'],  // 주식 보유량 많을수록 상단
        ['createdAt', 'DESC']      // 최신순
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await CommunityMessage.count({ where: { communityId } });

    res.json({
      messages,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('메시지 조회 오류:', error);
    res.status(500).json({ error: '메시지 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 메시지 고정/해제 (커뮤니티 소유자 전용)
 */
exports.togglePinMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    const message = await CommunityMessage.findByPk(messageId, {
      include: [
        {
          model: ShareholderCommunity,
          as: 'community'
        }
      ]
    });

    if (!message) {
      return res.status(404).json({ error: '메시지를 찾을 수 없습니다.' });
    }

    // 커뮤니티 소유자인지 확인
    if (message.community.creatorId !== userId) {
      return res.status(403).json({ error: '권한이 없습니다. 커뮤니티 소유자만 메시지를 고정할 수 있습니다.' });
    }

    await message.update({
      isPinned: !message.isPinned
    });

    res.json({
      message: message.isPinned ? '메시지가 고정되었습니다.' : '메시지 고정이 해제되었습니다.',
      communityMessage: message
    });
  } catch (error) {
    console.error('메시지 고정 토글 오류:', error);
    res.status(500).json({ error: '메시지 고정 설정 중 오류가 발생했습니다.' });
  }
};

/**
 * 커뮤니티 설정 업데이트 (소유자 전용)
 */
exports.updateCommunity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { communityId } = req.params;
    const { name, description, minSharesRequired, isActive } = req.body;

    const community = await ShareholderCommunity.findByPk(communityId);

    if (!community) {
      return res.status(404).json({ error: '커뮤니티를 찾을 수 없습니다.' });
    }

    if (community.creatorId !== userId) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (minSharesRequired !== undefined) updates.minSharesRequired = minSharesRequired;
    if (isActive !== undefined) updates.isActive = isActive;

    await community.update(updates);

    res.json({
      message: '커뮤니티가 업데이트되었습니다.',
      community
    });
  } catch (error) {
    console.error('커뮤니티 업데이트 오류:', error);
    res.status(500).json({ error: '커뮤니티 업데이트 중 오류가 발생했습니다.' });
  }
};

/**
 * 모든 커뮤니티 목록 조회
 */
exports.getAllCommunities = async (req, res) => {
  try {
    const userId = req.user.id;
    const { isActive = true } = req.query;

    const where = {};
    if (isActive !== undefined) where.isActive = isActive;

    const communities = await ShareholderCommunity.findAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'displayName', 'profileImage']
        }
      ],
      order: [['memberCount', 'DESC'], ['createdAt', 'DESC']]
    });

    // 각 커뮤니티에 대한 접근 권한 확인
    const communitiesWithAccess = await Promise.all(
      communities.map(async (community) => {
        const shareholding = await getShareholding(userId, community.creatorId);
        const hasAccess = userId === community.creatorId || shareholding >= community.minSharesRequired;

        return {
          ...community.toJSON(),
          hasAccess,
          currentShares: shareholding
        };
      })
    );

    res.json({ communities: communitiesWithAccess });
  } catch (error) {
    console.error('커뮤니티 목록 조회 오류:', error);
    res.status(500).json({ error: '커뮤니티 목록 조회 중 오류가 발생했습니다.' });
  }
};
