/**
 * Pre-IPO 라운드 서비스
 */

const {
  User, Follow, PreIPORound, PreIPOInvestment,
  Holding, Stock, IPOOffering, Transaction,
  sequelize
} = require('../models');
const { Op } = require('sequelize');

// 신뢰 등급 순서
const TRUST_LEVEL_ORDER = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'legend'];

/**
 * Pre-IPO 라운드 생성
 */
async function createRound(data) {
  const {
    userId,
    roundName = 'Pre-IPO',
    description,
    pricePerShare,
    expectedIPOPrice,
    totalShares,
    minInvestmentShares = 10,
    maxInvestmentShares,
    maxInvestors,
    eligibilityType = 'followers_only',
    minFollowerDays = 0,
    minTrustLevel,
    startAt,
    endAt,
    lockupDays = 90,
    bonusShares = 0,
    earlyBirdBonus = 0,
    earlyBirdLimit,
    targetAmount
  } = data;

  // 이미 진행 중인 라운드가 있는지 확인
  const existingRound = await PreIPORound.findOne({
    where: {
      userId,
      status: { [Op.in]: ['draft', 'pending', 'approved', 'active'] }
    }
  });

  if (existingRound) {
    throw new Error('이미 진행 중인 Pre-IPO 라운드가 있습니다');
  }

  const round = await PreIPORound.create({
    userId,
    roundName,
    description,
    pricePerShare,
    expectedIPOPrice,
    totalShares,
    remainingShares: totalShares,
    minInvestmentShares,
    maxInvestmentShares: maxInvestmentShares || Math.floor(totalShares * 0.2),
    maxInvestors,
    eligibilityType,
    minFollowerDays,
    minTrustLevel,
    startAt: new Date(startAt),
    endAt: new Date(endAt),
    lockupDays,
    bonusShares,
    earlyBirdBonus,
    earlyBirdLimit,
    targetAmount: targetAmount || (pricePerShare * totalShares),
    status: 'pending'
  });

  return round;
}

/**
 * 투자 자격 확인
 */
async function checkEligibility(roundId, userId) {
  const round = await PreIPORound.findByPk(roundId, {
    include: [{ model: User, as: 'issuer' }]
  });

  if (!round) {
    return { eligible: false, reason: '라운드를 찾을 수 없습니다' };
  }

  // 본인 라운드 확인
  if (round.userId === userId) {
    return { eligible: false, reason: '본인의 Pre-IPO에는 투자할 수 없습니다' };
  }

  // 상태 확인
  if (round.status !== 'active') {
    return { eligible: false, reason: '현재 투자 가능한 상태가 아닙니다' };
  }

  // 기간 확인
  const now = new Date();
  if (now < round.startAt) {
    return { eligible: false, reason: '투자 기간이 시작되지 않았습니다', startsAt: round.startAt };
  }
  if (now > round.endAt) {
    return { eligible: false, reason: '투자 기간이 종료되었습니다' };
  }

  // 물량 확인
  if (round.remainingShares <= 0) {
    return { eligible: false, reason: '물량이 모두 소진되었습니다' };
  }

  // 인원 제한 확인
  if (round.maxInvestors && round.currentInvestors >= round.maxInvestors) {
    return { eligible: false, reason: '최대 투자자 수에 도달했습니다' };
  }

  // 이미 투자했는지 확인
  const existingInvestment = await PreIPOInvestment.findOne({
    where: { roundId, userId, status: { [Op.ne]: 'cancelled' } }
  });
  if (existingInvestment) {
    return { eligible: false, reason: '이미 투자하셨습니다', investment: existingInvestment };
  }

  const user = await User.findByPk(userId);

  // 자격 타입별 확인
  switch (round.eligibilityType) {
    case 'followers_only': {
      const follow = await Follow.findOne({
        where: { followerId: userId, followingId: round.userId }
      });
      if (!follow) {
        return { eligible: false, reason: '팔로워만 참여 가능합니다' };
      }
      if (round.minFollowerDays > 0) {
        const followDays = Math.floor((now - new Date(follow.createdAt)) / (1000 * 60 * 60 * 24));
        if (followDays < round.minFollowerDays) {
          return {
            eligible: false,
            reason: `${round.minFollowerDays}일 이상 팔로우한 사용자만 참여 가능합니다`,
            currentDays: followDays
          };
        }
      }
      break;
    }
    case 'vip_only': {
      if (round.minTrustLevel) {
        const userLevel = TRUST_LEVEL_ORDER.indexOf(user.trustLevel);
        const requiredLevel = TRUST_LEVEL_ORDER.indexOf(round.minTrustLevel);
        if (userLevel < requiredLevel) {
          return {
            eligible: false,
            reason: `${round.minTrustLevel} 등급 이상만 참여 가능합니다`,
            currentLevel: user.trustLevel
          };
        }
      }
      break;
    }
    case 'invited_only': {
      // 초대 코드 확인은 투자 시 별도 처리
      break;
    }
    // 'public'은 제한 없음
  }

  return {
    eligible: true,
    round: {
      id: round.id,
      roundName: round.roundName,
      pricePerShare: round.pricePerShare,
      discountRate: round.discountRate,
      remainingShares: round.remainingShares,
      minInvestmentShares: round.minInvestmentShares,
      maxInvestmentShares: round.maxInvestmentShares,
      isEarlyBirdAvailable: round.earlyBirdLimit ? round.currentInvestors < round.earlyBirdLimit : false,
      earlyBirdBonus: round.earlyBirdBonus
    }
  };
}

/**
 * Pre-IPO 투자
 */
async function invest(roundId, userId, shares, inviteCode = null) {
  const t = await sequelize.transaction();

  try {
    // 자격 확인
    const eligibility = await checkEligibility(roundId, userId);
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason);
    }

    const round = await PreIPORound.findByPk(roundId, { transaction: t });
    const user = await User.findByPk(userId, { transaction: t });

    // 초대 코드 확인 (invited_only인 경우)
    if (round.eligibilityType === 'invited_only' && !inviteCode) {
      throw new Error('초대 코드가 필요합니다');
    }

    // 수량 검증
    if (shares < round.minInvestmentShares) {
      throw new Error(`최소 ${round.minInvestmentShares}주 이상 투자해야 합니다`);
    }
    if (shares > round.maxInvestmentShares) {
      throw new Error(`최대 ${round.maxInvestmentShares}주까지 투자 가능합니다`);
    }
    if (shares > round.remainingShares) {
      throw new Error(`남은 물량이 ${round.remainingShares}주입니다`);
    }

    // 얼리버드 확인
    const isEarlyBird = round.earlyBirdLimit ? round.currentInvestors < round.earlyBirdLimit : false;
    let actualPrice = round.pricePerShare;
    if (isEarlyBird && round.earlyBirdBonus > 0) {
      actualPrice = Math.floor(round.pricePerShare * (1 - round.earlyBirdBonus / 100));
    }

    const totalAmount = actualPrice * shares;

    // 잔액 확인
    if (user.poBalance < totalAmount) {
      throw new Error('PO가 부족합니다');
    }

    // 보너스 계산 (예: 100주당 1주)
    const bonusShares = round.bonusShares > 0 ? Math.floor(shares / 100) * round.bonusShares : 0;

    // PO 차감
    await user.update({
      poBalance: user.poBalance - totalAmount
    }, { transaction: t });

    // 투자 기록 생성
    const investment = await PreIPOInvestment.create({
      roundId,
      userId,
      shares,
      pricePerShare: actualPrice,
      totalAmount,
      bonusShares,
      isEarlyBird,
      discountApplied: isEarlyBird ? round.earlyBirdBonus : round.discountRate,
      finalShares: shares + bonusShares,
      investmentOrder: round.currentInvestors + 1,
      inviteCode,
      status: 'confirmed'
    }, { transaction: t });

    // 라운드 업데이트
    await round.update({
      soldShares: round.soldShares + shares,
      remainingShares: round.remainingShares - shares,
      currentInvestors: round.currentInvestors + 1,
      totalRaised: round.totalRaised + totalAmount
    }, { transaction: t });

    // 물량 소진 시 완료 처리
    if (round.remainingShares - shares <= 0) {
      await round.update({ status: 'completed' }, { transaction: t });
    }

    await t.commit();

    return {
      investment,
      message: isEarlyBird ? '얼리버드 투자가 완료되었습니다!' : '투자가 완료되었습니다',
      summary: {
        shares,
        bonusShares,
        totalShares: shares + bonusShares,
        pricePerShare: actualPrice,
        totalAmount,
        isEarlyBird,
        discountApplied: isEarlyBird ? round.earlyBirdBonus : round.discountRate
      }
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

/**
 * 투자 취소
 */
async function cancelInvestment(investmentId, userId) {
  const t = await sequelize.transaction();

  try {
    const investment = await PreIPOInvestment.findByPk(investmentId, {
      include: [{ model: PreIPORound, as: 'round' }],
      transaction: t
    });

    if (!investment) {
      throw new Error('투자 내역을 찾을 수 없습니다');
    }

    if (investment.userId !== userId) {
      throw new Error('본인의 투자만 취소할 수 있습니다');
    }

    if (investment.status !== 'confirmed') {
      throw new Error('취소할 수 없는 상태입니다');
    }

    if (investment.round.status === 'converted') {
      throw new Error('이미 IPO로 전환되어 취소할 수 없습니다');
    }

    // 환불
    await User.increment('poBalance', {
      by: investment.totalAmount,
      where: { id: userId },
      transaction: t
    });

    // 투자 상태 업데이트
    await investment.update({ status: 'cancelled' }, { transaction: t });

    // 라운드 업데이트
    await investment.round.update({
      soldShares: investment.round.soldShares - investment.shares,
      remainingShares: investment.round.remainingShares + investment.shares,
      currentInvestors: investment.round.currentInvestors - 1,
      totalRaised: investment.round.totalRaised - investment.totalAmount
    }, { transaction: t });

    await t.commit();

    return { refundAmount: investment.totalAmount };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

/**
 * IPO로 전환 (상장 시)
 */
async function convertToIPO(roundId, stockId) {
  const t = await sequelize.transaction();

  try {
    const round = await PreIPORound.findByPk(roundId, {
      include: [{ model: PreIPOInvestment, as: 'investments', where: { status: 'confirmed' } }],
      transaction: t
    });

    if (!round) {
      throw new Error('라운드를 찾을 수 없습니다');
    }

    const stock = await Stock.findByPk(stockId, { transaction: t });
    if (!stock) {
      throw new Error('주식을 찾을 수 없습니다');
    }

    // 상장일 기준 락업 해제일 계산
    const lockupEndAt = new Date();
    lockupEndAt.setDate(lockupEndAt.getDate() + round.lockupDays);

    let totalConvertedShares = 0;

    for (const investment of round.investments) {
      // Holding 생성/업데이트
      const [holding, created] = await Holding.findOrCreate({
        where: { holderId: investment.userId, stockId },
        defaults: {
          holderId: investment.userId,
          stockId,
          shares: investment.finalShares,
          averageCost: investment.pricePerShare,
          isLocked: true,
          lockupEndAt
        },
        transaction: t
      });

      if (!created) {
        const newTotalShares = holding.shares + investment.finalShares;
        const newAverageCost = Math.floor(
          (holding.shares * holding.averageCost + investment.finalShares * investment.pricePerShare) / newTotalShares
        );
        await holding.update({
          shares: newTotalShares,
          averageCost: newAverageCost
        }, { transaction: t });
      }

      // 투자 상태 업데이트
      await investment.update({
        status: 'converted',
        convertedAt: new Date(),
        holdingId: holding.id,
        lockupEndAt
      }, { transaction: t });

      // 거래 기록
      await Transaction.create({
        stockId,
        buyerId: investment.userId,
        sellerId: round.userId,
        shares: investment.finalShares,
        pricePerShare: investment.pricePerShare,
        totalAmount: investment.totalAmount,
        transactionType: 'pre_ipo',
        fee: 0
      }, { transaction: t });

      totalConvertedShares += investment.finalShares;
    }

    // 발행자에게 모금액 지급
    await User.increment('poBalance', {
      by: round.totalRaised,
      where: { id: round.userId },
      transaction: t
    });

    // 주식 발행량 업데이트
    await stock.update({
      issuedShares: stock.issuedShares + totalConvertedShares,
      shareholderCount: stock.shareholderCount + round.currentInvestors
    }, { transaction: t });

    // 라운드 상태 업데이트
    await round.update({ status: 'converted' }, { transaction: t });

    await t.commit();

    return {
      totalInvestors: round.currentInvestors,
      totalShares: totalConvertedShares,
      totalRaised: round.totalRaised
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

/**
 * 진행 중인 Pre-IPO 라운드 목록
 */
async function getActiveRounds(options = {}) {
  const { page = 1, limit = 20 } = options;

  const { count, rows } = await PreIPORound.findAndCountAll({
    where: { status: 'active' },
    include: [
      {
        model: User,
        as: 'issuer',
        attributes: ['id', 'username', 'displayName', 'profileImage', 'category', 'bio']
      }
    ],
    order: [['endAt', 'ASC']],
    limit,
    offset: (page - 1) * limit
  });

  return {
    rounds: rows.map(round => ({
      ...round.toJSON(),
      progressPercent: ((round.soldShares / round.totalShares) * 100).toFixed(1),
      investorsProgress: round.maxInvestors ?
        ((round.currentInvestors / round.maxInvestors) * 100).toFixed(1) : null
    })),
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    }
  };
}

/**
 * 라운드 상세 조회
 */
async function getRoundDetail(roundId, userId = null) {
  const round = await PreIPORound.findByPk(roundId, {
    include: [
      {
        model: User,
        as: 'issuer',
        attributes: ['id', 'username', 'displayName', 'profileImage', 'bio', 'category', 'occupation']
      }
    ]
  });

  if (!round) {
    return null;
  }

  let myInvestment = null;
  let eligibility = null;

  if (userId) {
    myInvestment = await PreIPOInvestment.findOne({
      where: { roundId, userId, status: { [Op.ne]: 'cancelled' } }
    });

    if (!myInvestment) {
      eligibility = await checkEligibility(roundId, userId);
    }
  }

  // 최근 투자자들
  const recentInvestors = await PreIPOInvestment.findAll({
    where: { roundId, status: 'confirmed' },
    include: [
      { model: User, as: 'investor', attributes: ['id', 'username', 'displayName', 'profileImage'] }
    ],
    order: [['createdAt', 'DESC']],
    limit: 5
  });

  return {
    ...round.toJSON(),
    progressPercent: ((round.soldShares / round.totalShares) * 100).toFixed(1),
    myInvestment,
    eligibility,
    recentInvestors: recentInvestors.map(inv => ({
      user: inv.investor,
      shares: inv.shares,
      isEarlyBird: inv.isEarlyBird,
      investedAt: inv.createdAt
    }))
  };
}

/**
 * 내 Pre-IPO 투자 목록
 */
async function getMyInvestments(userId, options = {}) {
  const { page = 1, limit = 20 } = options;

  const { count, rows } = await PreIPOInvestment.findAndCountAll({
    where: { userId },
    include: [
      {
        model: PreIPORound,
        as: 'round',
        include: [
          { model: User, as: 'issuer', attributes: ['id', 'username', 'displayName', 'profileImage'] }
        ]
      }
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit
  });

  return {
    investments: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    }
  };
}

/**
 * 내 Pre-IPO 라운드 (발행자용)
 */
async function getMyRound(userId) {
  const round = await PreIPORound.findOne({
    where: { userId },
    include: [
      {
        model: PreIPOInvestment,
        as: 'investments',
        where: { status: 'confirmed' },
        required: false,
        include: [
          { model: User, as: 'investor', attributes: ['id', 'username', 'displayName', 'profileImage'] }
        ]
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  if (!round) {
    return { hasRound: false };
  }

  return {
    hasRound: true,
    round: {
      ...round.toJSON(),
      progressPercent: ((round.soldShares / round.totalShares) * 100).toFixed(1)
    }
  };
}

/**
 * 라운드 승인 (관리자)
 */
async function approveRound(roundId) {
  const round = await PreIPORound.findByPk(roundId);
  if (!round) {
    throw new Error('라운드를 찾을 수 없습니다');
  }

  if (round.status !== 'pending') {
    throw new Error('승인 대기 중인 라운드만 승인할 수 있습니다');
  }

  await round.update({ status: 'approved' });

  // 시작 시간이 지났으면 바로 활성화
  if (new Date() >= round.startAt) {
    await round.update({ status: 'active' });
  }

  return round;
}

/**
 * 라운드 거절 (관리자)
 */
async function rejectRound(roundId, reason) {
  const round = await PreIPORound.findByPk(roundId);
  if (!round) {
    throw new Error('라운드를 찾을 수 없습니다');
  }

  if (round.status !== 'pending') {
    throw new Error('승인 대기 중인 라운드만 거절할 수 있습니다');
  }

  await round.update({ status: 'cancelled', note: reason });
  return round;
}

/**
 * 라운드 수정
 */
async function updateRound(roundId, userId, updateData) {
  const round = await PreIPORound.findByPk(roundId);
  if (!round) {
    return { success: false, message: '라운드를 찾을 수 없습니다' };
  }

  if (round.userId !== userId) {
    return { success: false, message: '본인의 라운드만 수정할 수 있습니다' };
  }

  if (!['draft', 'pending'].includes(round.status)) {
    return { success: false, message: '이미 진행 중이거나 완료된 라운드는 수정할 수 없습니다' };
  }

  const allowedFields = [
    'roundName', 'description', 'expectedIPOPrice',
    'maxInvestmentShares', 'maxInvestors', 'startAt', 'endAt',
    'earlyBirdBonus', 'earlyBirdLimit', 'targetAmount'
  ];

  const filteredData = {};
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      filteredData[field] = updateData[field];
    }
  }

  await round.update(filteredData);
  return { success: true, round };
}

/**
 * 라운드 취소
 */
async function cancelRound(roundId, userId) {
  const t = await sequelize.transaction();

  try {
    const round = await PreIPORound.findByPk(roundId, { transaction: t });
    if (!round) {
      throw new Error('라운드를 찾을 수 없습니다');
    }

    if (round.userId !== userId) {
      throw new Error('본인의 라운드만 취소할 수 있습니다');
    }

    if (round.status === 'converted') {
      throw new Error('이미 IPO로 전환된 라운드는 취소할 수 없습니다');
    }

    // 투자자들에게 환불
    const investments = await PreIPOInvestment.findAll({
      where: { roundId, status: 'confirmed' },
      transaction: t
    });

    for (const inv of investments) {
      await User.increment('poBalance', {
        by: inv.totalAmount,
        where: { id: inv.userId },
        transaction: t
      });
      await inv.update({ status: 'refunded' }, { transaction: t });
    }

    await round.update({ status: 'cancelled' }, { transaction: t });
    await t.commit();

    return { success: true, refundedCount: investments.length };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

/**
 * 라운드 투자자 목록 조회
 */
async function getRoundInvestors(roundId, userId, options = {}) {
  const { page = 1, limit = 50 } = options;

  const round = await PreIPORound.findByPk(roundId);
  if (!round) {
    return { success: false, message: '라운드를 찾을 수 없습니다' };
  }

  // 발행자만 조회 가능
  if (round.userId !== userId) {
    return { success: false, message: '라운드 발행자만 조회할 수 있습니다' };
  }

  const { count, rows } = await PreIPOInvestment.findAndCountAll({
    where: { roundId, status: { [Op.ne]: 'cancelled' } },
    include: [
      { model: User, as: 'investor', attributes: ['id', 'username', 'displayName', 'profileImage'] }
    ],
    order: [['createdAt', 'ASC']],
    limit,
    offset: (page - 1) * limit
  });

  return {
    success: true,
    investors: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    }
  };
}

/**
 * 라운드 통계 조회
 */
async function getRoundStats(roundId) {
  const round = await PreIPORound.findByPk(roundId);
  if (!round) {
    return { success: false, message: '라운드를 찾을 수 없습니다' };
  }

  const investments = await PreIPOInvestment.findAll({
    where: { roundId, status: 'confirmed' },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'investorCount'],
      [sequelize.fn('SUM', sequelize.col('shares')), 'totalShares'],
      [sequelize.fn('SUM', sequelize.col('bonus_shares')), 'totalBonusShares'],
      [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalAmount'],
      [sequelize.fn('AVG', sequelize.col('shares')), 'avgShares']
    ],
    raw: true
  });

  const earlyBirdCount = await PreIPOInvestment.count({
    where: { roundId, status: 'confirmed', isEarlyBird: true }
  });

  return {
    success: true,
    stats: {
      ...investments[0],
      earlyBirdCount,
      progressPercent: ((round.soldShares / round.totalShares) * 100).toFixed(1),
      remainingShares: round.remainingShares,
      daysRemaining: Math.max(0, Math.ceil((new Date(round.endAt) - new Date()) / (1000 * 60 * 60 * 24)))
    }
  };
}

module.exports = {
  createRound,
  checkEligibility,
  invest,
  cancelInvestment,
  convertToIPO,
  getActiveRounds,
  getRoundDetail,
  getMyInvestments,
  getMyRound,
  approveRound,
  rejectRound,
  updateRound,
  cancelRound,
  getRoundInvestors,
  getRoundStats
};
