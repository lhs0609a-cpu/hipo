const { ChatMessage, CommunityMember, UserLevel, User, ShareholderCommunity, ChatReport, SuspiciousActivity, ViceAdmin } = require('../models');
const { sequelize } = require('../config/database');
const { getIO, sendLevelUpNotification } = require('../config/socket');

// AI 필터링 키워드 (금융 사기 탐지)
const FINANCIAL_SCAM_KEYWORDS = [
  '투자', '수익률', '계좌', '입금', '송금', '비트코인', '코인', '주식팁',
  '확실한수익', '대박', '무조건', '보장', '원금보장', '텔레그램', '카톡',
  '개인정보', '비밀번호', '계좌번호', '카드번호', '인증번호'
];

// 외부 링크 패턴
const EXTERNAL_LINK_PATTERN = /https?:\/\/[^\s]+/gi;

// AI 필터링 함수
function detectSuspiciousContent(content) {
  const lowerContent = content.toLowerCase();
  const detectedKeywords = [];

  for (const keyword of FINANCIAL_SCAM_KEYWORDS) {
    if (lowerContent.includes(keyword)) {
      detectedKeywords.push(keyword);
    }
  }

  const hasExternalLinks = EXTERNAL_LINK_PATTERN.test(content);

  return {
    isSuspicious: detectedKeywords.length > 0 || hasExternalLinks,
    detectedKeywords,
    hasExternalLinks
  };
}

// 메시지 전송 (Socket.IO에서 호출됨)
exports.sendMessage = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { communityId, content, messageType = 'TEXT', mediaUrl, replyToId } = req.body;
    const userId = req.user.id;

    // 커뮤니티 멤버 확인
    const member = await CommunityMember.findOne({
      where: { communityId, userId, isBanned: false }
    });

    if (!member) {
      await transaction.rollback();
      return res.status(403).json({ error: '해당 커뮤니티의 멤버가 아니거나 강퇴된 상태입니다' });
    }

    // AI 필터링
    const filterResult = detectSuspiciousContent(content || '');

    // 의심 활동 감지 시 기록
    if (filterResult.isSuspicious && filterResult.detectedKeywords.length > 2) {
      await SuspiciousActivity.create({
        userId,
        activityType: 'FINANCIAL_SCAM',
        description: `금융 사기 의심 메시지 감지: ${filterResult.detectedKeywords.join(', ')}`,
        relatedCommunityId: communityId,
        evidenceData: { message: content, keywords: filterResult.detectedKeywords },
        detectionMethod: 'AI_FILTER',
        riskLevel: filterResult.detectedKeywords.length > 4 ? 'HIGH' : 'MEDIUM',
        status: 'DETECTED'
      }, { transaction });
    }

    // 메시지 생성
    const message = await ChatMessage.create({
      communityId,
      userId,
      messageType,
      content,
      mediaUrl,
      replyToId,
      isFilteredByAI: filterResult.isSuspicious,
      filteredKeywords: filterResult.isSuspicious ? filterResult.detectedKeywords : null
    }, { transaction });

    // 유저 레벨 업데이트 (1 메시지 = 1 XP)
    let userLevel = await UserLevel.findOne({
      where: { communityId, userId }
    });

    if (!userLevel) {
      userLevel = await UserLevel.create({
        communityId,
        userId,
        experiencePoints: 1,
        messageCount: 1
      }, { transaction });
    } else {
      userLevel.messageCount += 1;
      const levelUpResult = await userLevel.addExperience(1);

      // 레벨업 알림
      if (levelUpResult.leveledUp) {
        // 전용 레벨업 알림 함수 사용
        sendLevelUpNotification(userId, {
          oldLevel: levelUpResult.oldLevel,
          newLevel: levelUpResult.newLevel,
          newBadge: userLevel.bestMemberBadge || userLevel.eliteMemberBadge || userLevel.legendMemberBadge,
          rewards: null
        });

        // 커뮤니티 내 레벨업 이벤트도 전송
        const io = getIO();
        io.to(`community:${communityId}`).emit('user_level_up', {
          userId,
          oldLevel: levelUpResult.oldLevel,
          newLevel: levelUpResult.newLevel,
          badges: {
            bestMember: userLevel.bestMemberBadge,
            eliteMember: userLevel.eliteMemberBadge,
            legendMember: userLevel.legendMemberBadge
          }
        });
      }
    }

    await transaction.commit();

    // 메시지 상세 정보 로드
    const fullMessage = await ChatMessage.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'displayName', 'profileImage']
        },
        {
          model: ChatMessage,
          as: 'replyTo',
          include: [{
            model: User,
            as: 'sender',
            attributes: ['id', 'username', 'displayName']
          }]
        }
      ]
    });

    // Socket.IO로 실시간 브로드캐스트 (socket.js에서 처리)
    res.json({
      message: fullMessage,
      levelInfo: {
        level: userLevel.level,
        xp: userLevel.experiencePoints,
        messageCount: userLevel.messageCount
      },
      filtered: filterResult.isSuspicious
    });

  } catch (error) {
    await transaction.rollback();
    console.error('메시지 전송 오류:', error);
    res.status(500).json({ error: '메시지 전송에 실패했습니다' });
  }
};

// 메시지 목록 조회 (페이지네이션)
exports.getMessages = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { limit = 50, before } = req.query; // before: 이 메시지 ID 이전 메시지들
    const userId = req.user.id;

    // 멤버 확인
    const member = await CommunityMember.findOne({
      where: { communityId, userId }
    });

    if (!member) {
      return res.status(403).json({ error: '해당 커뮤니티의 멤버가 아닙니다' });
    }

    const whereClause = {
      communityId,
      isDeleted: false
    };

    if (before) {
      const beforeMessage = await ChatMessage.findByPk(before);
      if (beforeMessage) {
        whereClause.createdAt = { [sequelize.Op.lt]: beforeMessage.createdAt };
      }
    }

    const messages = await ChatMessage.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'displayName', 'profileImage']
        },
        {
          model: ChatMessage,
          as: 'replyTo',
          include: [{
            model: User,
            as: 'sender',
            attributes: ['id', 'username', 'displayName']
          }]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({ messages: messages.reverse() });

  } catch (error) {
    console.error('메시지 목록 조회 오류:', error);
    res.status(500).json({ error: '메시지 목록을 불러올 수 없습니다' });
  }
};

// 메시지 고정 (방장/부방장 권한)
exports.pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await ChatMessage.findByPk(messageId, {
      include: [{ model: ShareholderCommunity, as: 'community' }]
    });

    if (!message) {
      return res.status(404).json({ error: '메시지를 찾을 수 없습니다' });
    }

    // 방장 또는 부방장 확인
    const isAdmin = message.community.currentAdminId === userId;
    const viceAdmin = await ViceAdmin.findOne({
      where: { communityId: message.communityId, userId, isActive: true }
    });
    const canPin = isAdmin || (viceAdmin && viceAdmin.permissions.canPin);

    if (!canPin) {
      return res.status(403).json({ error: '메시지 고정 권한이 없습니다' });
    }

    await message.update({ isPinned: !message.isPinned });

    // 실시간 알림
    const io = getIO();
    io.to(`community:${message.communityId}`).emit('message_pinned', {
      messageId: message.id,
      isPinned: message.isPinned
    });

    res.json({ message, isPinned: message.isPinned });

  } catch (error) {
    console.error('메시지 고정 오류:', error);
    res.status(500).json({ error: '메시지 고정에 실패했습니다' });
  }
};

// 메시지 삭제 (본인/방장/부방장)
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await ChatMessage.findByPk(messageId, {
      include: [{ model: ShareholderCommunity, as: 'community' }]
    });

    if (!message) {
      return res.status(404).json({ error: '메시지를 찾을 수 없습니다' });
    }

    // 권한 확인: 본인 OR 방장 OR 부방장
    const isOwner = message.userId === userId;
    const isAdmin = message.community.currentAdminId === userId;
    const viceAdmin = await ViceAdmin.findOne({
      where: { communityId: message.communityId, userId, isActive: true }
    });
    const canDelete = isOwner || isAdmin || (viceAdmin && viceAdmin.permissions.canDeleteMessages);

    if (!canDelete) {
      return res.status(403).json({ error: '메시지 삭제 권한이 없습니다' });
    }

    await message.update({ isDeleted: true });

    // 부방장이 삭제한 경우 카운트 증가
    if (viceAdmin && !isOwner) {
      await viceAdmin.update({
        messagesDeleted: viceAdmin.messagesDeleted + 1
      });
    }

    // 실시간 알림
    const io = getIO();
    io.to(`community:${message.communityId}`).emit('message_deleted', {
      messageId: message.id
    });

    res.json({ success: true });

  } catch (error) {
    console.error('메시지 삭제 오류:', error);
    res.status(500).json({ error: '메시지 삭제에 실패했습니다' });
  }
};

// 메시지 좋아요
exports.likeMessage = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await ChatMessage.findByPk(messageId);
    if (!message) {
      await transaction.rollback();
      return res.status(404).json({ error: '메시지를 찾을 수 없습니다' });
    }

    // 좋아요 수 증가
    await message.update({
      likeCount: message.likeCount + 1
    }, { transaction });

    // 메시지 작성자 경험치 증가 (1 좋아요 = 5 XP)
    const senderLevel = await UserLevel.findOne({
      where: { communityId: message.communityId, userId: message.userId }
    });

    if (senderLevel) {
      senderLevel.likesReceived += 1;
      const levelUpResult = await senderLevel.addExperience(5);

      // 레벨업 알림
      if (levelUpResult.leveledUp) {
        // 전용 레벨업 알림 함수 사용
        sendLevelUpNotification(message.userId, {
          oldLevel: levelUpResult.oldLevel,
          newLevel: levelUpResult.newLevel,
          newBadge: senderLevel.bestMemberBadge || senderLevel.eliteMemberBadge || senderLevel.legendMemberBadge,
          rewards: null
        });

        // 커뮤니티 내 레벨업 이벤트도 전송
        const io = getIO();
        io.to(`community:${message.communityId}`).emit('user_level_up', {
          userId: message.userId,
          oldLevel: levelUpResult.oldLevel,
          newLevel: levelUpResult.newLevel
        });
      }
    }

    await transaction.commit();

    // 실시간 업데이트
    const io = getIO();
    io.to(`community:${message.communityId}`).emit('message_liked', {
      messageId: message.id,
      likeCount: message.likeCount
    });

    res.json({ likeCount: message.likeCount });

  } catch (error) {
    await transaction.rollback();
    console.error('메시지 좋아요 오류:', error);
    res.status(500).json({ error: '좋아요 처리에 실패했습니다' });
  }
};

// 메시지 신고
exports.reportMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reportReason, reasonDetail } = req.body;
    const userId = req.user.id;

    const message = await ChatMessage.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ error: '메시지를 찾을 수 없습니다' });
    }

    const report = await ChatReport.create({
      messageId,
      reportedBy: userId,
      reportReason,
      reasonDetail,
      status: 'PENDING'
    });

    res.json({ report, message: '신고가 접수되었습니다' });

  } catch (error) {
    console.error('메시지 신고 오류:', error);
    res.status(500).json({ error: '신고 처리에 실패했습니다' });
  }
};

// 고정된 메시지 목록
exports.getPinnedMessages = async (req, res) => {
  try {
    const { communityId } = req.params;

    const pinnedMessages = await ChatMessage.findAll({
      where: { communityId, isPinned: true, isDeleted: false },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'displayName', 'profileImage']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.json({ pinnedMessages });

  } catch (error) {
    console.error('고정 메시지 조회 오류:', error);
    res.status(500).json({ error: '고정 메시지를 불러올 수 없습니다' });
  }
};

module.exports = exports;
