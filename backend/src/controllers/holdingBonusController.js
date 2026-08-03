const { User, Stock, Holding, HoldingBonus, WalletTransaction } = require('../models');
const { Op } = require('sequelize');
const { updateBalance } = require('../utils/balanceService');

/**
 * 내 보유 주식별 장기 보유 현황 조회
 */
exports.getMyHoldingStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    // 내 보유 주식 조회
    const holdings = await Holding.findAll({
      where: { holderId: userId, shares: { [Op.gt]: 0 } },
      include: [{
        model: Stock,
        as: 'stock',
        include: [{
          model: User,
          as: 'issuer',
          attributes: ['id', 'username', 'displayName', 'profileImage'],
        }],
      }],
    });

    const milestones = HoldingBonus.getMilestones();

    // 각 보유 주식별 상태 계산
    const holdingStatuses = await Promise.all(holdings.map(async (holding) => {
      const firstPurchaseDate = holding.firstPurchaseAt || holding.createdAt;
      const holdingDays = Math.floor((new Date() - new Date(firstPurchaseDate)) / (1000 * 60 * 60 * 24));

      // 이미 수령한 보너스 조회
      const claimedBonuses = await HoldingBonus.findAll({
        where: { userId, stockId: holding.stockId },
        attributes: ['milestoneDays', 'bonusAmount', 'claimedAt'],
      });

      const claimedDays = claimedBonuses.map(b => b.milestoneDays);

      // 수령 가능한 마일스톤
      const claimableMilestones = milestones.filter(m =>
        m.days <= holdingDays && !claimedDays.includes(m.days)
      );

      // 다음 마일스톤
      const nextMilestone = HoldingBonus.getNextMilestone(holdingDays);

      // 현재 보유 가치
      const currentValue = holding.shares * (holding.stock?.sharePrice || 0);

      return {
        holdingId: holding.id,
        stockId: holding.stockId,
        stock: {
          id: holding.stock?.id,
          issuer: holding.stock?.issuer,
          sharePrice: holding.stock?.sharePrice,
        },
        shares: holding.shares,
        currentValue,
        holdingDays,
        firstPurchaseAt: firstPurchaseDate,
        claimedBonuses: claimedBonuses.map(b => ({
          milestoneDays: b.milestoneDays,
          bonusAmount: b.bonusAmount,
          claimedAt: b.claimedAt,
        })),
        claimableMilestones: claimableMilestones.map(m => ({
          ...m,
          estimatedBonus: Math.floor(currentValue * (m.rate / 100)),
        })),
        nextMilestone: nextMilestone ? {
          ...nextMilestone,
          daysRemaining: nextMilestone.days - holdingDays,
          progress: Math.floor((holdingDays / nextMilestone.days) * 100),
        } : null,
      };
    }));

    // 총 수령 가능한 보너스 계산
    const totalClaimable = holdingStatuses.reduce((sum, h) =>
      sum + h.claimableMilestones.reduce((s, m) => s + m.estimatedBonus, 0), 0
    );

    res.json({
      success: true,
      holdings: holdingStatuses,
      totalClaimable,
      milestones,
    });
  } catch (error) {
    console.error('Holding status error:', error);
    res.status(500).json({ error: '보유 현황 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 장기 보유 보너스 수령
 */
exports.claimBonus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stockId, milestoneDays } = req.body;

    if (!stockId || !milestoneDays) {
      return res.status(400).json({ error: '필수 정보가 누락되었습니다' });
    }

    // 보유 정보 확인
    const holding = await Holding.findOne({
      where: { holderId: userId, stockId, shares: { [Op.gt]: 0 } },
      include: [{
        model: Stock,
        as: 'stock',
      }],
    });

    if (!holding) {
      return res.status(404).json({ error: '해당 주식을 보유하고 있지 않습니다' });
    }

    // 보유 일수 확인
    const firstPurchaseDate = holding.firstPurchaseAt || holding.createdAt;
    const holdingDays = Math.floor((new Date() - new Date(firstPurchaseDate)) / (1000 * 60 * 60 * 24));

    // 마일스톤 확인
    const milestones = HoldingBonus.getMilestones();
    const milestone = milestones.find(m => m.days === milestoneDays);

    if (!milestone) {
      return res.status(400).json({ error: '유효하지 않은 마일스톤입니다' });
    }

    if (holdingDays < milestone.days) {
      return res.status(400).json({
        error: `아직 ${milestone.days}일 보유 조건을 충족하지 않았습니다`,
        currentDays: holdingDays,
        requiredDays: milestone.days,
      });
    }

    // 이미 수령했는지 확인
    const existingBonus = await HoldingBonus.findOne({
      where: { userId, stockId, milestoneDays },
    });

    if (existingBonus) {
      return res.status(400).json({
        error: '이미 이 마일스톤 보너스를 수령했습니다',
        claimedAt: existingBonus.claimedAt,
      });
    }

    // 보너스 계산
    const holdingValue = holding.shares * holding.stock.sharePrice;
    const bonusAmount = Math.floor(holdingValue * (milestone.rate / 100));

    if (bonusAmount <= 0) {
      return res.status(400).json({ error: '보유 가치가 너무 낮아 보너스를 받을 수 없습니다' });
    }

    // 보너스 기록 생성
    const bonus = await HoldingBonus.create({
      userId,
      stockId,
      holdingId: holding.id,
      milestoneDays,
      bonusAmount,
      bonusRate: milestone.rate,
      holdingValue,
      sharesHeld: holding.shares,
    });

    // 유저 PO 업데이트 (User + Wallet 동시)
    const { newBalance } = await updateBalance(userId, bonusAmount);

    // 거래 기록
    try {
      await WalletTransaction.create({
        userId,
        transactionType: 'HOLDING_BONUS',
        amount: bonusAmount,
        balanceAfter: newBalance,
        description: `💎 ${milestone.label} 보너스 (${holding.stock.issuer?.displayName || '크리에이터'})`,
        metadata: JSON.stringify({
          type: 'holding_bonus',
          stockId,
          milestoneDays,
          milestoneLabel: milestone.label,
          holdingValue,
          bonusRate: milestone.rate,
        }),
      });
    } catch (walletError) {
      console.log('Wallet transaction skipped:', walletError.message);
    }

    res.json({
      success: true,
      bonus: {
        id: bonus.id,
        milestoneDays,
        milestoneLabel: milestone.label,
        bonusAmount,
        bonusRate: milestone.rate,
        holdingValue,
      },
      newBalance,
      message: `${bonusAmount.toLocaleString()} PO 보너스를 받았습니다!`,
    });
  } catch (error) {
    console.error('Claim bonus error:', error);
    res.status(500).json({ error: '보너스 수령 중 오류가 발생했습니다' });
  }
};

/**
 * 특정 주식의 장기 보유 현황 조회
 */
exports.getStockHoldingStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stockId } = req.params;

    const holding = await Holding.findOne({
      where: { holderId: userId, stockId, shares: { [Op.gt]: 0 } },
      include: [{
        model: Stock,
        as: 'stock',
        include: [{
          model: User,
          as: 'issuer',
          attributes: ['id', 'username', 'displayName', 'profileImage'],
        }],
      }],
    });

    if (!holding) {
      return res.status(404).json({ error: '해당 주식을 보유하고 있지 않습니다' });
    }

    const milestones = HoldingBonus.getMilestones();
    const firstPurchaseDate = holding.firstPurchaseAt || holding.createdAt;
    const holdingDays = Math.floor((new Date() - new Date(firstPurchaseDate)) / (1000 * 60 * 60 * 24));

    // 수령한 보너스
    const claimedBonuses = await HoldingBonus.findAll({
      where: { userId, stockId },
      order: [['milestoneDays', 'ASC']],
    });

    const claimedDays = claimedBonuses.map(b => b.milestoneDays);
    const currentValue = holding.shares * holding.stock.sharePrice;

    // 각 마일스톤별 상태
    const milestoneStatuses = milestones.map(m => {
      const isClaimed = claimedDays.includes(m.days);
      const isAchieved = holdingDays >= m.days;
      const canClaim = isAchieved && !isClaimed;

      return {
        ...m,
        status: isClaimed ? 'claimed' : (isAchieved ? 'claimable' : 'locked'),
        isClaimed,
        isAchieved,
        canClaim,
        estimatedBonus: Math.floor(currentValue * (m.rate / 100)),
        claimedBonus: isClaimed
          ? claimedBonuses.find(b => b.milestoneDays === m.days)
          : null,
      };
    });

    const nextMilestone = milestoneStatuses.find(m => !m.isAchieved);

    res.json({
      success: true,
      stock: {
        id: holding.stock.id,
        issuer: holding.stock.issuer,
        sharePrice: holding.stock.sharePrice,
      },
      holding: {
        shares: holding.shares,
        currentValue,
        holdingDays,
        firstPurchaseAt: firstPurchaseDate,
      },
      milestones: milestoneStatuses,
      nextMilestone: nextMilestone ? {
        ...nextMilestone,
        daysRemaining: nextMilestone.days - holdingDays,
        progress: Math.floor((holdingDays / nextMilestone.days) * 100),
      } : null,
      totalClaimed: claimedBonuses.reduce((sum, b) => sum + b.bonusAmount, 0),
    });
  } catch (error) {
    console.error('Stock holding status error:', error);
    res.status(500).json({ error: '보유 현황 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 장기 보유 리더보드
 */
exports.getLeaderboard = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // 장기 보유자 랭킹 (보유 기간 기준)
    const holdings = await Holding.findAll({
      where: { shares: { [Op.gt]: 0 } },
      include: [
        {
          model: User,
          as: 'holder',
          attributes: ['id', 'username', 'displayName', 'profileImage'],
        },
        {
          model: Stock,
          as: 'stock',
          include: [{
            model: User,
            as: 'issuer',
            attributes: ['id', 'username', 'displayName'],
          }],
        },
      ],
      order: [['firstPurchaseAt', 'ASC']],
      limit: parseInt(limit) * 2, // 중복 제거를 위해 더 많이 가져옴
    });

    // 사용자별로 가장 오래된 보유만 선택
    const userMap = new Map();
    holdings.forEach(h => {
      const firstPurchaseAt = h.firstPurchaseAt || h.createdAt;
      const holdingDays = Math.floor((new Date() - new Date(firstPurchaseAt)) / (1000 * 60 * 60 * 24));

      if (!userMap.has(h.holderId) || userMap.get(h.holderId).holdingDays < holdingDays) {
        userMap.set(h.holderId, {
          user: h.holder,
          stock: h.stock,
          shares: h.shares,
          holdingDays,
          firstPurchaseAt,
          currentValue: h.shares * h.stock.sharePrice,
        });
      }
    });

    const leaderboard = Array.from(userMap.values())
      .sort((a, b) => b.holdingDays - a.holdingDays)
      .slice(0, parseInt(limit))
      .map((entry, index) => ({
        rank: index + 1,
        ...entry,
        achievedMilestones: HoldingBonus.getAchievedMilestones(entry.holdingDays).length,
      }));

    res.json({
      success: true,
      leaderboard,
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: '리더보드 조회 중 오류가 발생했습니다' });
  }
};
