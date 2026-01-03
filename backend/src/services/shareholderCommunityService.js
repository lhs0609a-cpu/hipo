/**
 * 주주 전용 커뮤니티 서비스
 * - 주주 등급별 접근 권한 관리
 * - VIP/프리미엄/일반 등급 구분
 * - 실시간 채팅 관리
 */

const {
  ShareholderCommunity,
  CommunityMember,
  CommunityMessage,
  CommunityNotice,
  CommunityBan,
  CommunityWarning,
  Holding,
  Stock,
  User,
  sequelize
} = require('../models');
const { Op } = require('sequelize');

// 주주 등급 정의
const SHAREHOLDER_TIERS = {
  VIP: 'VIP',
  PREMIUM: 'PREMIUM',
  REGULAR: 'REGULAR',
  NONE: 'NONE'
};

// 등급별 색상
const TIER_COLORS = {
  VIP: '#FFD700',      // 금색
  PREMIUM: '#C0C0C0',  // 은색
  REGULAR: '#CD7F32',  // 동색
  NONE: '#666666'
};

// 등급별 배지 이모지
const TIER_BADGES = {
  VIP: '👑',
  PREMIUM: '⭐',
  REGULAR: '🔹',
  NONE: ''
};

class ShareholderCommunityService {
  /**
   * 사용자의 특정 주식 보유량 조회
   */
  async getUserShareholding(userId, stockId) {
    const holding = await Holding.findOne({
      where: { holderId: userId, stockId }
    });
    return holding ? holding.shares : 0;
  }

  /**
   * 사용자의 주주 등급 계산
   */
  async getUserTier(userId, community) {
    const shares = await this.getUserShareholding(userId, community.stockId);

    if (shares >= community.vipMinShares) {
      return SHAREHOLDER_TIERS.VIP;
    } else if (shares >= community.premiumMinShares) {
      return SHAREHOLDER_TIERS.PREMIUM;
    } else if (shares >= community.regularMinShares) {
      return SHAREHOLDER_TIERS.REGULAR;
    }
    return SHAREHOLDER_TIERS.NONE;
  }

  /**
   * 주주 커뮤니티 생성 (크리에이터 전용)
   */
  async createCommunity(creatorId, stockId, data) {
    const stock = await Stock.findByPk(stockId, {
      include: [{ model: User, as: 'issuer', attributes: ['username', 'displayName'] }]
    });
    if (!stock) {
      throw new Error('주식을 찾을 수 없습니다');
    }

    // 해당 주식의 소유자인지 확인
    if (stock.userId !== creatorId) {
      throw new Error('본인 주식에 대해서만 커뮤니티를 생성할 수 있습니다');
    }

    // 이미 커뮤니티가 있는지 확인
    const existing = await ShareholderCommunity.findOne({
      where: { stockId }
    });
    if (existing) {
      throw new Error('이미 커뮤니티가 존재합니다');
    }

    const creatorName = stock.issuer?.displayName || stock.issuer?.username || '주식';
    const community = await ShareholderCommunity.create({
      creatorId,
      stockId,
      name: data.name || `${creatorName} 주주 커뮤니티`,
      description: data.description || `${creatorName} 주주 전용 커뮤니티입니다`,
      minSharesRequired: data.minSharesRequired || 100,
      vipMinShares: data.vipMinShares || 1000,
      premiumMinShares: data.premiumMinShares || 500,
      regularMinShares: data.regularMinShares || 100,
      chatEnabled: data.chatEnabled !== false,
      vipRoomEnabled: data.vipRoomEnabled !== false,
      vipRoomName: data.vipRoomName || 'VIP 라운지',
      exclusiveContentEnabled: data.exclusiveContentEnabled !== false,
      currentAdminId: creatorId
    });

    return community;
  }

  /**
   * 주식 ID로 커뮤니티 조회
   */
  async getCommunityByStock(stockId) {
    return await ShareholderCommunity.findOne({
      where: { stockId, isActive: true },
      include: [
        { model: User, as: 'creator', attributes: ['id', 'username', 'profileImage'] },
        { model: Stock, as: 'stock', attributes: ['id', 'sharePrice', 'tier'] }
      ]
    });
  }

  /**
   * 커뮤니티 상세 조회 (사용자 등급 포함)
   */
  async getCommunityDetail(communityId, userId) {
    const community = await ShareholderCommunity.findByPk(communityId, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'username', 'profileImage', 'displayName'] },
        { model: User, as: 'currentAdmin', attributes: ['id', 'username', 'profileImage'] }
      ]
    });

    if (!community) {
      throw new Error('커뮤니티를 찾을 수 없습니다');
    }

    const stock = await Stock.findByPk(community.stockId);

    // 사용자 정보
    let userInfo = null;
    if (userId) {
      const shares = await this.getUserShareholding(userId, community.stockId);
      const tier = await this.getUserTier(userId, community);
      const membership = await CommunityMember.findOne({
        where: { communityId, userId }
      });

      userInfo = {
        shares,
        tier,
        tierBadge: TIER_BADGES[tier],
        tierColor: TIER_COLORS[tier],
        isMember: !!membership,
        canAccess: tier !== SHAREHOLDER_TIERS.NONE,
        canAccessVipRoom: tier === SHAREHOLDER_TIERS.VIP,
        membership
      };
    }

    return {
      community,
      stock,
      userInfo,
      tierRequirements: {
        vip: community.vipMinShares,
        premium: community.premiumMinShares,
        regular: community.regularMinShares
      }
    };
  }

  /**
   * 커뮤니티 가입
   */
  async joinCommunity(communityId, userId) {
    const community = await ShareholderCommunity.findByPk(communityId);
    if (!community) {
      throw new Error('커뮤니티를 찾을 수 없습니다');
    }

    // 밴 여부 확인
    const ban = await CommunityBan.findOne({
      where: {
        communityId,
        userId,
        bannedUntil: { [Op.gt]: new Date() }
      }
    });
    if (ban) {
      throw new Error(`${new Date(ban.bannedUntil).toLocaleDateString()}까지 입장이 제한되어 있습니다`);
    }

    // 주식 보유량 확인 (크리에이터는 보유량 관계없이 가입 가능)
    const shares = await this.getUserShareholding(userId, community.stockId);
    const isCreator = community.creatorId === userId;
    if (!isCreator && shares < community.minSharesRequired) {
      throw new Error(`최소 ${community.minSharesRequired}주 이상 보유해야 가입할 수 있습니다`);
    }

    // 이미 멤버인지 확인
    const existingMember = await CommunityMember.findOne({
      where: { communityId, userId }
    });
    if (existingMember) {
      if (existingMember.isBanned) {
        throw new Error('커뮤니티에서 퇴장 처리되었습니다');
      }
      return existingMember;
    }

    const tier = await this.getUserTier(userId, community);

    const member = await CommunityMember.create({
      communityId,
      userId,
      shareholdingAtJoin: shares,
      currentShareholding: shares
    });

    // 멤버 수 및 VIP 카운트 업데이트
    await community.increment('memberCount');
    await community.increment('totalShareholders');
    if (tier === SHAREHOLDER_TIERS.VIP) {
      await community.increment('vipCount');
    }

    return member;
  }

  /**
   * 커뮤니티 탈퇴
   */
  async leaveCommunity(communityId, userId) {
    const member = await CommunityMember.findOne({
      where: { communityId, userId }
    });

    if (!member) {
      throw new Error('커뮤니티 멤버가 아닙니다');
    }

    const community = await ShareholderCommunity.findByPk(communityId);
    const tier = await this.getUserTier(userId, community);

    await member.destroy();

    // 멤버 수 업데이트
    await community.decrement('memberCount');
    await community.decrement('totalShareholders');
    if (tier === SHAREHOLDER_TIERS.VIP) {
      await community.decrement('vipCount');
    }

    return true;
  }

  /**
   * 멤버 목록 조회 (등급별)
   */
  async getMembers(communityId, options = {}) {
    const { tier, limit = 50, offset = 0 } = options;
    const community = await ShareholderCommunity.findByPk(communityId);

    if (!community) {
      throw new Error('커뮤니티를 찾을 수 없습니다');
    }

    const whereClause = { communityId, isBanned: false };

    // 등급별 필터링
    if (tier === 'VIP') {
      whereClause.currentShareholding = { [Op.gte]: community.vipMinShares };
    } else if (tier === 'PREMIUM') {
      whereClause.currentShareholding = {
        [Op.gte]: community.premiumMinShares,
        [Op.lt]: community.vipMinShares
      };
    } else if (tier === 'REGULAR') {
      whereClause.currentShareholding = {
        [Op.gte]: community.regularMinShares,
        [Op.lt]: community.premiumMinShares
      };
    }

    const members = await CommunityMember.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'profileImage', 'displayName']
      }],
      order: [['currentShareholding', 'DESC']],
      limit,
      offset
    });

    // 각 멤버에 등급 정보 추가
    const membersWithTier = members.rows.map(member => {
      let memberTier;
      if (member.currentShareholding >= community.vipMinShares) {
        memberTier = SHAREHOLDER_TIERS.VIP;
      } else if (member.currentShareholding >= community.premiumMinShares) {
        memberTier = SHAREHOLDER_TIERS.PREMIUM;
      } else {
        memberTier = SHAREHOLDER_TIERS.REGULAR;
      }

      return {
        ...member.toJSON(),
        tier: memberTier,
        tierBadge: TIER_BADGES[memberTier],
        tierColor: TIER_COLORS[memberTier]
      };
    });

    return {
      members: membersWithTier,
      total: members.count,
      community
    };
  }

  /**
   * 메시지 전송
   */
  async sendMessage(communityId, userId, content, options = {}) {
    const { isVipRoom = false } = options;

    const community = await ShareholderCommunity.findByPk(communityId);
    if (!community) {
      throw new Error('커뮤니티를 찾을 수 없습니다');
    }

    if (!community.chatEnabled) {
      throw new Error('채팅이 비활성화되어 있습니다');
    }

    // 멤버 확인 (크리에이터는 항상 허용)
    const isCreator = community.creatorId === userId;
    const member = await CommunityMember.findOne({
      where: { communityId, userId, isBanned: false }
    });
    if (!member && !isCreator) {
      throw new Error('커뮤니티 멤버가 아닙니다');
    }

    // VIP룸 접근 권한 확인 (크리에이터는 항상 VIP 접근 가능)
    const tier = isCreator ? SHAREHOLDER_TIERS.VIP : await this.getUserTier(userId, community);
    if (isVipRoom && tier !== SHAREHOLDER_TIERS.VIP) {
      throw new Error('VIP 채팅방은 VIP 등급만 이용 가능합니다');
    }

    // 슬로우 모드 확인
    if (community.slowModeSeconds > 0) {
      const lastMessage = await CommunityMessage.findOne({
        where: { communityId, userId },
        order: [['createdAt', 'DESC']]
      });

      if (lastMessage) {
        const timeDiff = (new Date() - new Date(lastMessage.createdAt)) / 1000;
        if (timeDiff < community.slowModeSeconds) {
          const waitTime = Math.ceil(community.slowModeSeconds - timeDiff);
          throw new Error(`${waitTime}초 후에 메시지를 보낼 수 있습니다`);
        }
      }
    }

    // 링크 필터링
    if (!community.linksAllowed && /(https?:\/\/|www\.)/i.test(content)) {
      throw new Error('이 커뮤니티에서는 링크를 포함할 수 없습니다');
    }

    const shares = await this.getUserShareholding(userId, community.stockId);

    const message = await CommunityMessage.create({
      communityId,
      userId,
      content,
      shareholding: shares
    });

    // 통계 업데이트
    await community.increment('totalMessages');
    await community.increment('dailyMessages');
    await community.update({ lastActivityAt: new Date() });
    if (member) {
      await member.increment('messageCount');
      await member.increment('activityScore', { by: 1 });
    }

    // 사용자 정보와 함께 반환
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'profileImage', 'displayName']
    });

    return {
      ...message.toJSON(),
      author: user,
      tier,
      tierBadge: TIER_BADGES[tier],
      tierColor: TIER_COLORS[tier]
    };
  }

  /**
   * 메시지 조회 (일반 채팅방)
   */
  async getMessages(communityId, userId, options = {}) {
    const { limit = 50, before, isVipRoom = false } = options;

    const community = await ShareholderCommunity.findByPk(communityId);
    if (!community) {
      throw new Error('커뮤니티를 찾을 수 없습니다');
    }

    // VIP룸 접근 권한 확인
    if (isVipRoom) {
      const tier = await this.getUserTier(userId, community);
      if (tier !== SHAREHOLDER_TIERS.VIP) {
        throw new Error('VIP 채팅방은 VIP 등급만 이용 가능합니다');
      }
    }

    const whereClause = { communityId };
    if (before) {
      whereClause.createdAt = { [Op.lt]: before };
    }

    const messages = await CommunityMessage.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'profileImage', 'displayName']
      }],
      order: [['createdAt', 'DESC']],
      limit
    });

    // 각 메시지에 등급 정보 추가
    const messagesWithTier = messages.map(msg => {
      let tier;
      if (msg.shareholding >= community.vipMinShares) {
        tier = SHAREHOLDER_TIERS.VIP;
      } else if (msg.shareholding >= community.premiumMinShares) {
        tier = SHAREHOLDER_TIERS.PREMIUM;
      } else {
        tier = SHAREHOLDER_TIERS.REGULAR;
      }

      return {
        ...msg.toJSON(),
        tier,
        tierBadge: TIER_BADGES[tier],
        tierColor: TIER_COLORS[tier]
      };
    });

    return messagesWithTier.reverse();
  }

  /**
   * 메시지 고정 (크리에이터/방장)
   */
  async pinMessage(messageId, userId) {
    const message = await CommunityMessage.findByPk(messageId);
    if (!message) {
      throw new Error('메시지를 찾을 수 없습니다');
    }

    const community = await ShareholderCommunity.findByPk(message.communityId);
    if (community.creatorId !== userId && community.currentAdminId !== userId) {
      throw new Error('메시지 고정 권한이 없습니다');
    }

    await message.update({ isPinned: true });
    return message;
  }

  /**
   * 고정 메시지 조회
   */
  async getPinnedMessages(communityId) {
    return await CommunityMessage.findAll({
      where: { communityId, isPinned: true },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'profileImage', 'displayName']
      }],
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * 공지사항 작성
   */
  async createNotice(communityId, userId, data) {
    const community = await ShareholderCommunity.findByPk(communityId);
    if (!community) {
      throw new Error('커뮤니티를 찾을 수 없습니다');
    }

    if (community.creatorId !== userId && community.currentAdminId !== userId) {
      throw new Error('공지 작성 권한이 없습니다');
    }

    return await CommunityNotice.create({
      communityId,
      createdBy: userId,
      title: data.title,
      content: data.content,
      isPinned: data.isPinned || false,
      minTierToView: data.minTierToView || 'REGULAR'
    });
  }

  /**
   * 공지사항 목록 조회
   */
  async getNotices(communityId, userId, options = {}) {
    const { limit = 20, offset = 0 } = options;

    const community = await ShareholderCommunity.findByPk(communityId);
    const tier = userId ? await this.getUserTier(userId, community) : SHAREHOLDER_TIERS.NONE;

    // 등급에 따른 공지 필터링
    const tierOrder = ['REGULAR', 'PREMIUM', 'VIP'];
    const userTierIndex = tierOrder.indexOf(tier);
    const allowedTiers = userTierIndex >= 0 ? tierOrder.slice(0, userTierIndex + 1) : [];

    return await CommunityNotice.findAndCountAll({
      where: {
        communityId,
        isActive: true,
        minTierToView: { [Op.in]: allowedTiers.length > 0 ? allowedTiers : ['REGULAR'] }
      },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'profileImage', 'displayName']
      }],
      order: [['isPinned', 'DESC'], ['createdAt', 'DESC']],
      limit,
      offset
    });
  }

  /**
   * 멤버 경고
   */
  async warnMember(communityId, targetUserId, adminId, reason) {
    const community = await ShareholderCommunity.findByPk(communityId);
    if (community.creatorId !== adminId && community.currentAdminId !== adminId) {
      throw new Error('경고 권한이 없습니다');
    }

    const member = await CommunityMember.findOne({
      where: { communityId, userId: targetUserId }
    });
    if (!member) {
      throw new Error('해당 멤버를 찾을 수 없습니다');
    }

    await CommunityWarning.create({
      communityId,
      userId: targetUserId,
      adminId,
      reason
    });

    await member.increment('warningCount');

    // 3회 경고 시 자동 퇴장
    if (member.warningCount + 1 >= 3) {
      await this.banMember(communityId, targetUserId, adminId, '경고 3회 누적', 48);
    }

    return { warningCount: member.warningCount + 1 };
  }

  /**
   * 멤버 퇴장 (밴)
   */
  async banMember(communityId, targetUserId, adminId, reason, hours = 48) {
    const community = await ShareholderCommunity.findByPk(communityId);
    if (community.creatorId !== adminId && community.currentAdminId !== adminId) {
      throw new Error('퇴장 권한이 없습니다');
    }

    // 크리에이터는 밴 불가
    if (targetUserId === community.creatorId) {
      throw new Error('커뮤니티 소유자는 퇴장시킬 수 없습니다');
    }

    const member = await CommunityMember.findOne({
      where: { communityId, userId: targetUserId }
    });
    if (!member) {
      throw new Error('해당 멤버를 찾을 수 없습니다');
    }

    const bannedUntil = new Date();
    bannedUntil.setHours(bannedUntil.getHours() + hours);

    await CommunityBan.create({
      communityId,
      userId: targetUserId,
      adminId,
      reason,
      bannedUntil
    });

    await member.update({ isBanned: true, bannedUntil });
    await community.decrement('memberCount');

    return { bannedUntil };
  }

  /**
   * 멤버 보유량 업데이트 (정기 실행)
   */
  async updateMemberShareholdings(communityId) {
    const community = await ShareholderCommunity.findByPk(communityId);
    const members = await CommunityMember.findAll({
      where: { communityId, isBanned: false }
    });

    let vipCount = 0;
    let removedCount = 0;

    for (const member of members) {
      const shares = await this.getUserShareholding(member.userId, community.stockId);

      // 최소 보유량 미달 시 자동 퇴장
      if (shares < community.minSharesRequired) {
        await member.update({ isBanned: true });
        removedCount++;
        continue;
      }

      await member.update({ currentShareholding: shares });

      if (shares >= community.vipMinShares) {
        vipCount++;
      }
    }

    await community.update({
      vipCount,
      totalShareholders: members.length - removedCount
    });

    return { updated: members.length, removed: removedCount };
  }

  /**
   * 커뮤니티 통계 조회
   */
  async getCommunityStats(communityId) {
    const community = await ShareholderCommunity.findByPk(communityId);
    if (!community) {
      throw new Error('커뮤니티를 찾을 수 없습니다');
    }

    const members = await CommunityMember.findAll({
      where: { communityId, isBanned: false }
    });

    let vipCount = 0, premiumCount = 0, regularCount = 0;
    let totalShares = 0;

    for (const member of members) {
      totalShares += member.currentShareholding;
      if (member.currentShareholding >= community.vipMinShares) {
        vipCount++;
      } else if (member.currentShareholding >= community.premiumMinShares) {
        premiumCount++;
      } else {
        regularCount++;
      }
    }

    return {
      totalMembers: members.length,
      vipCount,
      premiumCount,
      regularCount,
      totalShares,
      averageShares: members.length > 0 ? Math.floor(totalShares / members.length) : 0,
      totalMessages: community.totalMessages,
      dailyMessages: community.dailyMessages,
      lastActivityAt: community.lastActivityAt
    };
  }

  /**
   * 커뮤니티 설정 업데이트
   */
  async updateCommunitySettings(communityId, userId, settings) {
    const community = await ShareholderCommunity.findByPk(communityId);
    if (!community) {
      throw new Error('커뮤니티를 찾을 수 없습니다');
    }

    if (community.creatorId !== userId) {
      throw new Error('설정 변경 권한이 없습니다');
    }

    const allowedFields = [
      'name', 'description', 'minSharesRequired',
      'vipMinShares', 'premiumMinShares', 'regularMinShares',
      'chatEnabled', 'slowModeSeconds', 'mediaAllowed', 'linksAllowed',
      'vipRoomEnabled', 'vipRoomName', 'exclusiveContentEnabled',
      'backgroundTheme'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (settings[field] !== undefined) {
        updates[field] = settings[field];
      }
    }

    await community.update(updates);
    return community;
  }

  /**
   * 사용자의 커뮤니티 목록 조회
   */
  async getUserCommunities(userId) {
    const memberships = await CommunityMember.findAll({
      where: { userId, isBanned: false },
      include: [{
        model: ShareholderCommunity,
        as: 'community',
        where: { isActive: true },
        include: [
          { model: User, as: 'creator', attributes: ['id', 'username', 'profileImage'] }
        ]
      }]
    });

    const communities = [];
    for (const membership of memberships) {
      const tier = await this.getUserTier(userId, membership.community);
      communities.push({
        ...membership.community.toJSON(),
        membership: membership.toJSON(),
        tier,
        tierBadge: TIER_BADGES[tier],
        tierColor: TIER_COLORS[tier]
      });
    }

    return communities;
  }

  /**
   * 일일 메시지 카운트 리셋 (매일 자정 실행)
   */
  async resetDailyMessageCounts() {
    await ShareholderCommunity.update(
      { dailyMessages: 0 },
      { where: {} }
    );
  }
}

module.exports = new ShareholderCommunityService();
