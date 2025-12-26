const { Badge, UserBadge, User } = require('../models');
const { sequelize } = require('../config/database');
const { getShareholding } = require('../utils/shareholderHelper');

/**
 * 뱃지 자동 부여 (주주 뱃지)
 */
async function autoAssignShareholderBadge(userId, targetUserId, shareholding) {
  try {
    // 티어 결정
    let tier = null;
    if (shareholding >= 10000) tier = 'LARGEST';
    else if (shareholding >= 1000) tier = 'MAJOR';
    else if (shareholding >= 100) tier = 'EXCELLENT';
    else if (shareholding >= 1) tier = 'GENERAL';

    if (!tier) return;

    // 해당 티어의 주주 뱃지 찾기
    const badge = await Badge.findOne({
      where: {
        badgeType: 'SHAREHOLDER',
        tier
      }
    });

    if (!badge) {
      console.warn(`주주 뱃지를 찾을 수 없습니다: tier=${tier}`);
      return;
    }

    // 이미 부여된 뱃지인지 확인
    const existing = await UserBadge.findOne({
      where: {
        userId,
        badgeId: badge.id,
        targetUserId
      }
    });

    if (!existing) {
      // 뱃지 부여
      await UserBadge.create({
        userId,
        badgeId: badge.id,
        targetUserId,
        isDisplayed: true
      });
    }

    // 더 낮은 티어의 뱃지 제거
    const lowerTiers = {
      'LARGEST': ['MAJOR', 'EXCELLENT', 'GENERAL'],
      'MAJOR': ['EXCELLENT', 'GENERAL'],
      'EXCELLENT': ['GENERAL'],
      'GENERAL': []
    };

    const tiersToRemove = lowerTiers[tier] || [];
    if (tiersToRemove.length > 0) {
      const badgesToRemove = await Badge.findAll({
        where: {
          badgeType: 'SHAREHOLDER',
          tier: tiersToRemove
        }
      });

      const badgeIdsToRemove = badgesToRemove.map(b => b.id);
      if (badgeIdsToRemove.length > 0) {
        await UserBadge.destroy({
          where: {
            userId,
            badgeId: badgeIdsToRemove,
            targetUserId
          }
        });
      }
    }
  } catch (error) {
    console.error('주주 뱃지 자동 부여 오류:', error);
  }
}

/**
 * 뱃지 목록 조회
 */
exports.getAllBadges = async (req, res) => {
  try {
    const badges = await Badge.findAll({
      order: [['tier', 'ASC'], ['name', 'ASC']]
    });

    res.json({ badges });
  } catch (error) {
    console.error('뱃지 목록 조회 오류:', error);
    res.status(500).json({ error: '뱃지 목록 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 사용자 뱃지 조회
 */
exports.getUserBadges = async (req, res) => {
  try {
    const { userId } = req.params;

    const userBadges = await UserBadge.findAll({
      where: { userId },
      include: [
        {
          model: Badge,
          as: 'badge'
        },
        {
          model: User,
          as: 'targetUser',
          attributes: ['id', 'username', 'profileImage']
        }
      ],
      order: [['earnedAt', 'DESC']]
    });

    res.json({ badges: userBadges });
  } catch (error) {
    console.error('사용자 뱃지 조회 오류:', error);
    res.status(500).json({ error: '사용자 뱃지 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 내 뱃지 조회
 */
exports.getMyBadges = async (req, res) => {
  try {
    const userId = req.user.id;

    const userBadges = await UserBadge.findAll({
      where: { userId },
      include: [
        {
          model: Badge,
          as: 'badge'
        },
        {
          model: User,
          as: 'targetUser',
          attributes: ['id', 'username', 'profileImage']
        }
      ],
      order: [['earnedAt', 'DESC']]
    });

    res.json({ badges: userBadges });
  } catch (error) {
    console.error('내 뱃지 조회 오류:', error);
    res.status(500).json({ error: '내 뱃지 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 뱃지 표시 토글
 */
exports.toggleBadgeDisplay = async (req, res) => {
  try {
    const userId = req.user.id;
    const { userBadgeId } = req.params;

    const userBadge = await UserBadge.findByPk(userBadgeId);

    if (!userBadge) {
      return res.status(404).json({ error: '뱃지를 찾을 수 없습니다.' });
    }

    if (userBadge.userId !== userId) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    await userBadge.update({
      isDisplayed: !userBadge.isDisplayed
    });

    res.json({
      message: userBadge.isDisplayed ? '뱃지가 표시됩니다.' : '뱃지가 숨겨집니다.',
      badge: userBadge
    });
  } catch (error) {
    console.error('뱃지 표시 토글 오류:', error);
    res.status(500).json({ error: '뱃지 표시 설정 중 오류가 발생했습니다.' });
  }
};

/**
 * 뱃지 생성 (관리자 전용)
 */
exports.createBadge = async (req, res) => {
  try {
    const { name, description, imageUrl, badgeType, tier, minSharesRequired } = req.body;

    if (!name || !badgeType) {
      return res.status(400).json({ error: '뱃지 이름과 타입이 필요합니다.' });
    }

    const badge = await Badge.create({
      name,
      description,
      imageUrl,
      badgeType,
      tier,
      minSharesRequired
    });

    res.status(201).json({
      message: '뱃지가 생성되었습니다.',
      badge
    });
  } catch (error) {
    console.error('뱃지 생성 오류:', error);
    res.status(500).json({ error: '뱃지 생성 중 오류가 발생했습니다.' });
  }
};

/**
 * 뱃지 수동 부여 (관리자 전용)
 */
exports.awardBadge = async (req, res) => {
  try {
    const { userId, badgeId, targetUserId } = req.body;

    if (!userId || !badgeId) {
      return res.status(400).json({ error: '사용자 ID와 뱃지 ID가 필요합니다.' });
    }

    const badge = await Badge.findByPk(badgeId);
    if (!badge) {
      return res.status(404).json({ error: '뱃지를 찾을 수 없습니다.' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 이미 부여된 뱃지인지 확인
    const existing = await UserBadge.findOne({
      where: { userId, badgeId, targetUserId: targetUserId || null }
    });

    if (existing) {
      return res.status(400).json({ error: '이미 부여된 뱃지입니다.' });
    }

    const userBadge = await UserBadge.create({
      userId,
      badgeId,
      targetUserId: targetUserId || null,
      isDisplayed: true
    });

    const result = await UserBadge.findByPk(userBadge.id, {
      include: [
        {
          model: Badge,
          as: 'badge'
        },
        {
          model: User,
          as: 'targetUser',
          attributes: ['id', 'username', 'profileImage']
        }
      ]
    });

    res.status(201).json({
      message: '뱃지가 부여되었습니다.',
      userBadge: result
    });
  } catch (error) {
    console.error('뱃지 부여 오류:', error);
    res.status(500).json({ error: '뱃지 부여 중 오류가 발생했습니다.' });
  }
};

/**
 * 주주 뱃지 업데이트 (주식 거래 후 호출)
 */
exports.updateShareholderBadge = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ error: '대상 사용자 ID가 필요합니다.' });
    }

    const shareholding = await getShareholding(userId, targetUserId);
    await autoAssignShareholderBadge(userId, targetUserId, shareholding);

    res.json({ message: '주주 뱃지가 업데이트되었습니다.' });
  } catch (error) {
    console.error('주주 뱃지 업데이트 오류:', error);
    res.status(500).json({ error: '주주 뱃지 업데이트 중 오류가 발생했습니다.' });
  }
};

module.exports.autoAssignShareholderBadge = autoAssignShareholderBadge;
