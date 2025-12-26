const { UserLevel, ViceAdmin, User, ShareholderCommunity, CommunityMember, Notification } = require('../models');
const { sequelize } = require('../config/database');
const { getIO } = require('../config/socket');

// 커뮤니티 내 레벨 랭킹 조회
exports.getLevelRanking = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { limit = 50 } = req.query;

    const rankings = await UserLevel.findAll({
      where: { communityId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'displayName', 'profileImage']
        }
      ],
      order: [
        ['level', 'DESC'],
        ['experiencePoints', 'DESC']
      ],
      limit: parseInt(limit)
    });

    res.json({ rankings });

  } catch (error) {
    console.error('레벨 랭킹 조회 오류:', error);
    res.status(500).json({ error: '레벨 랭킹을 불러올 수 없습니다' });
  }
};

// 내 레벨 정보 조회
exports.getMyLevel = async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.id;

    let userLevel = await UserLevel.findOne({
      where: { communityId, userId }
    });

    if (!userLevel) {
      // 레벨 정보가 없으면 생성
      userLevel = await UserLevel.create({
        communityId,
        userId,
        level: 1,
        experiencePoints: 0
      });
    }

    // 다음 레벨까지 필요한 XP 계산
    const currentLevel = userLevel.level;
    const nextLevelXP = (currentLevel ** 2) * 100; // 다음 레벨에 필요한 총 XP
    const currentXP = userLevel.experiencePoints;
    const xpForNextLevel = nextLevelXP - currentXP;

    // 커뮤니티 내 순위 계산
    const rank = await UserLevel.count({
      where: {
        communityId,
        [sequelize.Op.or]: [
          { level: { [sequelize.Op.gt]: userLevel.level } },
          {
            level: userLevel.level,
            experiencePoints: { [sequelize.Op.gt]: userLevel.experiencePoints }
          }
        ]
      }
    }) + 1;

    res.json({
      level: userLevel.level,
      experiencePoints: userLevel.experiencePoints,
      messageCount: userLevel.messageCount,
      likesReceived: userLevel.likesReceived,
      badges: {
        bestMember: userLevel.bestMemberBadge,
        eliteMember: userLevel.eliteMemberBadge,
        legendMember: userLevel.legendMemberBadge
      },
      isViceAdmin: userLevel.isViceAdmin,
      rank,
      nextLevelXP: xpForNextLevel,
      lastLevelUpAt: userLevel.lastLevelUpAt
    });

  } catch (error) {
    console.error('레벨 정보 조회 오류:', error);
    res.status(500).json({ error: '레벨 정보를 불러올 수 없습니다' });
  }
};

// 부방장 임명 (방장 권한)
exports.appointViceAdmin = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { communityId, targetUserId } = req.params;
    const adminId = req.user.id;

    // 방장 확인
    const community = await ShareholderCommunity.findByPk(communityId);
    if (!community || community.currentAdminId !== adminId) {
      await transaction.rollback();
      return res.status(403).json({ error: '방장만 부방장을 임명할 수 있습니다' });
    }

    // 대상 유저 멤버 확인
    const targetMember = await CommunityMember.findOne({
      where: { communityId, userId: targetUserId, isBanned: false }
    });

    if (!targetMember) {
      await transaction.rollback();
      return res.status(404).json({ error: '해당 멤버를 찾을 수 없습니다' });
    }

    // 레벨 확인 (최소 Lv.10 권장)
    const targetLevel = await UserLevel.findOne({
      where: { communityId, userId: targetUserId }
    });

    if (!targetLevel || targetLevel.level < 10) {
      await transaction.rollback();
      return res.status(400).json({ error: '부방장은 최소 Lv.10 이상이어야 합니다' });
    }

    // 이미 부방장인지 확인
    const existingViceAdmin = await ViceAdmin.findOne({
      where: { communityId, userId: targetUserId, isActive: true }
    });

    if (existingViceAdmin) {
      await transaction.rollback();
      return res.status(400).json({ error: '이미 부방장입니다' });
    }

    // 부방장 임명
    const viceAdmin = await ViceAdmin.create({
      communityId,
      userId: targetUserId,
      appointedBy: adminId,
      isActive: true,
      permissions: {
        canWarn: true,
        canKick: false,
        canPin: true,
        canDeleteMessages: true,
        canCreatePolls: true
      }
    }, { transaction });

    // UserLevel 업데이트
    await targetLevel.update({ isViceAdmin: true }, { transaction });

    // 알림 생성
    await Notification.create({
      userId: targetUserId,
      type: 'VICE_ADMIN_APPOINTED',
      title: '부방장 임명',
      message: `${community.name}의 부방장으로 임명되었습니다!`,
      relatedId: communityId
    }, { transaction });

    await transaction.commit();

    // 실시간 알림
    const io = getIO();
    io.to(`community:${communityId}`).emit('vice_admin_appointed', {
      userId: targetUserId,
      communityId
    });

    res.json({ viceAdmin, message: '부방장이 임명되었습니다' });

  } catch (error) {
    await transaction.rollback();
    console.error('부방장 임명 오류:', error);
    res.status(500).json({ error: '부방장 임명에 실패했습니다' });
  }
};

// 부방장 해제 (방장 권한)
exports.removeViceAdmin = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { communityId, targetUserId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    // 방장 확인
    const community = await ShareholderCommunity.findByPk(communityId);
    if (!community || community.currentAdminId !== adminId) {
      await transaction.rollback();
      return res.status(403).json({ error: '방장만 부방장을 해제할 수 있습니다' });
    }

    // 부방장 확인
    const viceAdmin = await ViceAdmin.findOne({
      where: { communityId, userId: targetUserId, isActive: true }
    });

    if (!viceAdmin) {
      await transaction.rollback();
      return res.status(404).json({ error: '해당 유저는 부방장이 아닙니다' });
    }

    // 부방장 해제
    await viceAdmin.update({
      isActive: false,
      removedAt: new Date(),
      removalReason: reason
    }, { transaction });

    // UserLevel 업데이트
    const userLevel = await UserLevel.findOne({
      where: { communityId, userId: targetUserId }
    });
    if (userLevel) {
      await userLevel.update({ isViceAdmin: false }, { transaction });
    }

    // 알림 생성
    await Notification.create({
      userId: targetUserId,
      type: 'VICE_ADMIN_REMOVED',
      title: '부방장 해제',
      message: `${community.name}의 부방장에서 해제되었습니다`,
      relatedId: communityId
    }, { transaction });

    await transaction.commit();

    // 실시간 알림
    const io = getIO();
    io.to(`community:${communityId}`).emit('vice_admin_removed', {
      userId: targetUserId,
      communityId
    });

    res.json({ message: '부방장이 해제되었습니다' });

  } catch (error) {
    await transaction.rollback();
    console.error('부방장 해제 오류:', error);
    res.status(500).json({ error: '부방장 해제에 실패했습니다' });
  }
};

// 부방장 목록 조회
exports.getViceAdmins = async (req, res) => {
  try {
    const { communityId } = req.params;

    const viceAdmins = await ViceAdmin.findAll({
      where: { communityId, isActive: true },
      include: [
        {
          model: User,
          as: 'viceAdmin',
          attributes: ['id', 'username', 'displayName', 'profileImage']
        },
        {
          model: User,
          as: 'appointedByAdmin',
          attributes: ['id', 'username', 'displayName']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    res.json({ viceAdmins });

  } catch (error) {
    console.error('부방장 목록 조회 오류:', error);
    res.status(500).json({ error: '부방장 목록을 불러올 수 없습니다' });
  }
};

// 부방장 권한 수정 (방장 권한)
exports.updateViceAdminPermissions = async (req, res) => {
  try {
    const { communityId, targetUserId } = req.params;
    const { permissions } = req.body;
    const adminId = req.user.id;

    // 방장 확인
    const community = await ShareholderCommunity.findByPk(communityId);
    if (!community || community.currentAdminId !== adminId) {
      return res.status(403).json({ error: '방장만 권한을 수정할 수 있습니다' });
    }

    // 부방장 확인
    const viceAdmin = await ViceAdmin.findOne({
      where: { communityId, userId: targetUserId, isActive: true }
    });

    if (!viceAdmin) {
      return res.status(404).json({ error: '해당 유저는 부방장이 아닙니다' });
    }

    // 권한 업데이트
    await viceAdmin.update({ permissions });

    res.json({ viceAdmin, message: '권한이 수정되었습니다' });

  } catch (error) {
    console.error('부방장 권한 수정 오류:', error);
    res.status(500).json({ error: '권한 수정에 실패했습니다' });
  }
};

// 베스트 멤버 목록 (Lv.10 이상)
exports.getBestMembers = async (req, res) => {
  try {
    const { communityId } = req.params;

    const bestMembers = await UserLevel.findAll({
      where: {
        communityId,
        level: { [sequelize.Op.gte]: 10 }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'displayName', 'profileImage']
        }
      ],
      order: [
        ['level', 'DESC'],
        ['experiencePoints', 'DESC']
      ]
    });

    res.json({ bestMembers });

  } catch (error) {
    console.error('베스트 멤버 조회 오류:', error);
    res.status(500).json({ error: '베스트 멤버 목록을 불러올 수 없습니다' });
  }
};

module.exports = exports;
