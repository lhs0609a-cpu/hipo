/**
 * IPO 공모/청약 서비스
 */

const {
  User, Stock, Holding, Transaction,
  IPOOffering, IPOSubscription,
  sequelize
} = require('../models');
const { Op } = require('sequelize');

/**
 * 공모 생성
 */
async function createOffering(data, transaction) {
  const {
    stockId,
    userId,
    offeringPrice,
    totalShares,
    subscriptionDays = 3,
    description,
    category,
    highlights = [],
    allocationMethod = 'proportional',
    maxSubscriptionShares
  } = data;

  // 청약 기간 설정 (기본 3일)
  const now = new Date();
  const subscriptionStartAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 내일부터
  const subscriptionEndAt = new Date(subscriptionStartAt.getTime() + subscriptionDays * 24 * 60 * 60 * 1000);
  const allocationAt = new Date(subscriptionEndAt.getTime() + 24 * 60 * 60 * 1000); // 청약 마감 다음날
  const listingAt = new Date(allocationAt.getTime() + 24 * 60 * 60 * 1000); // 배정 다음날

  const offering = await IPOOffering.create({
    stockId,
    userId,
    offeringPrice,
    totalShares,
    minSubscriptionShares: 1,
    maxSubscriptionShares: maxSubscriptionShares || Math.floor(totalShares * 0.1), // 기본 10%
    subscriptionStartAt,
    subscriptionEndAt,
    allocationAt,
    listingAt,
    status: 'pending',
    allocationMethod,
    description,
    category,
    highlights
  }, { transaction });

  return offering;
}

/**
 * 공모 승인 (관리자)
 */
async function approveOffering(offeringId, reviewerId, note) {
  const offering = await IPOOffering.findByPk(offeringId);
  if (!offering) {
    throw new Error('공모를 찾을 수 없습니다');
  }

  if (offering.status !== 'pending') {
    throw new Error('심사 대기 중인 공모만 승인할 수 있습니다');
  }

  await offering.update({
    status: 'approved',
    reviewedAt: new Date(),
    reviewedBy: reviewerId,
    reviewNote: note
  });

  // 청약 시작 시간이 되면 자동으로 subscription 상태로 변경 (스케줄러에서 처리)
  return offering;
}

/**
 * 공모 거절 (관리자)
 */
async function rejectOffering(offeringId, reviewerId, note) {
  const offering = await IPOOffering.findByPk(offeringId);
  if (!offering) {
    throw new Error('공모를 찾을 수 없습니다');
  }

  await offering.update({
    status: 'cancelled',
    reviewedAt: new Date(),
    reviewedBy: reviewerId,
    reviewNote: note
  });

  // 주식 상태도 업데이트
  await Stock.update(
    { status: 'delisted', ipoApproved: false },
    { where: { id: offering.stockId } }
  );

  return offering;
}

/**
 * 청약 신청
 */
async function subscribe(offeringId, userId, requestedShares) {
  const t = await sequelize.transaction();

  try {
    // 공모 조회
    const offering = await IPOOffering.findByPk(offeringId, { transaction: t });
    if (!offering) {
      throw new Error('공모를 찾을 수 없습니다');
    }

    // 청약 가능 상태 확인
    const now = new Date();
    if (offering.status !== 'subscription' && offering.status !== 'approved') {
      // 청약 기간 자동 활성화
      if (offering.status === 'approved' && now >= offering.subscriptionStartAt) {
        await offering.update({ status: 'subscription' }, { transaction: t });
      } else {
        throw new Error('청약 가능한 상태가 아닙니다');
      }
    }

    if (now < offering.subscriptionStartAt) {
      throw new Error('청약 기간이 시작되지 않았습니다');
    }

    if (now > offering.subscriptionEndAt) {
      throw new Error('청약 기간이 종료되었습니다');
    }

    // 본인 주식에는 청약 불가
    if (offering.userId === userId) {
      throw new Error('본인 주식에는 청약할 수 없습니다');
    }

    // 이미 청약했는지 확인
    const existingSubscription = await IPOSubscription.findOne({
      where: { offeringId, userId },
      transaction: t
    });
    if (existingSubscription) {
      throw new Error('이미 청약 신청하셨습니다');
    }

    // 수량 검증
    if (requestedShares < offering.minSubscriptionShares) {
      throw new Error(`최소 ${offering.minSubscriptionShares}주 이상 청약해야 합니다`);
    }
    if (requestedShares > offering.maxSubscriptionShares) {
      throw new Error(`최대 ${offering.maxSubscriptionShares}주까지 청약 가능합니다`);
    }

    // 잔액 확인
    const user = await User.findByPk(userId, { transaction: t });
    const depositAmount = requestedShares * offering.offeringPrice;

    if (user.poBalance < depositAmount) {
      throw new Error('PO가 부족합니다');
    }

    // 청약 증거금 차감
    await user.update({
      poBalance: user.poBalance - depositAmount
    }, { transaction: t });

    // 청약 신청 생성
    const subscription = await IPOSubscription.create({
      offeringId,
      userId,
      requestedShares,
      depositAmount,
      status: 'confirmed',
      confirmedAt: new Date()
    }, { transaction: t });

    // 공모 현황 업데이트
    await offering.update({
      subscribedShares: offering.subscribedShares + requestedShares,
      subscriberCount: offering.subscriberCount + 1
    }, { transaction: t });

    await t.commit();

    return {
      subscription,
      competitionRate: ((offering.subscribedShares + requestedShares) / offering.totalShares * 100).toFixed(2)
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

/**
 * 청약 취소
 */
async function cancelSubscription(subscriptionId, userId) {
  const t = await sequelize.transaction();

  try {
    const subscription = await IPOSubscription.findByPk(subscriptionId, {
      include: [{ model: IPOOffering, as: 'offering' }],
      transaction: t
    });

    if (!subscription) {
      throw new Error('청약 내역을 찾을 수 없습니다');
    }

    if (subscription.userId !== userId) {
      throw new Error('본인의 청약만 취소할 수 있습니다');
    }

    if (subscription.status !== 'confirmed' && subscription.status !== 'pending') {
      throw new Error('취소할 수 없는 상태입니다');
    }

    const offering = subscription.offering;

    // 청약 기간 확인
    if (new Date() > offering.subscriptionEndAt) {
      throw new Error('청약 기간이 종료되어 취소할 수 없습니다');
    }

    // 증거금 환불
    const user = await User.findByPk(userId, { transaction: t });
    await user.update({
      poBalance: user.poBalance + subscription.depositAmount
    }, { transaction: t });

    // 청약 취소 처리
    await subscription.update({
      status: 'cancelled',
      cancelledAt: new Date(),
      refundAmount: subscription.depositAmount
    }, { transaction: t });

    // 공모 현황 업데이트
    await offering.update({
      subscribedShares: offering.subscribedShares - subscription.requestedShares,
      subscriberCount: offering.subscriberCount - 1
    }, { transaction: t });

    await t.commit();

    return { refundAmount: subscription.depositAmount };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

/**
 * 배정 처리
 */
async function processAllocation(offeringId) {
  const t = await sequelize.transaction();

  try {
    const offering = await IPOOffering.findByPk(offeringId, {
      include: [
        { model: IPOSubscription, as: 'subscriptions', where: { status: 'confirmed' } },
        { model: Stock, as: 'stock' },
        { model: User, as: 'issuer' }
      ],
      transaction: t
    });

    if (!offering) {
      throw new Error('공모를 찾을 수 없습니다');
    }

    if (offering.status !== 'closed' && offering.status !== 'subscription') {
      throw new Error('배정 처리할 수 없는 상태입니다');
    }

    const subscriptions = offering.subscriptions;
    const totalRequested = subscriptions.reduce((sum, s) => sum + s.requestedShares, 0);
    const competitionRate = totalRequested / offering.totalShares;

    // 최소 청약률 확인
    if (competitionRate < offering.minSuccessRate / 100) {
      // IPO 실패 처리
      await handleFailedIPO(offering, subscriptions, t);
      await t.commit();
      return { success: false, reason: '최소 청약률 미달' };
    }

    // 배정 방식에 따라 처리
    let allocations;
    switch (offering.allocationMethod) {
      case 'equal':
        allocations = equalAllocation(subscriptions, offering.totalShares);
        break;
      case 'lottery':
        allocations = lotteryAllocation(subscriptions, offering.totalShares);
        break;
      case 'proportional':
      default:
        allocations = proportionalAllocation(subscriptions, offering.totalShares);
    }

    // 배정 결과 적용
    for (const alloc of allocations) {
      const subscription = subscriptions.find(s => s.id === alloc.subscriptionId);
      const allocatedAmount = alloc.shares * offering.offeringPrice;
      const refundAmount = subscription.depositAmount - allocatedAmount;

      // 청약 업데이트
      await subscription.update({
        allocatedShares: alloc.shares,
        refundAmount,
        status: 'allocated',
        allocatedAt: new Date()
      }, { transaction: t });

      // 환불금 지급
      if (refundAmount > 0) {
        await User.increment('poBalance', {
          by: refundAmount,
          where: { id: subscription.userId },
          transaction: t
        });
        await subscription.update({ refundedAt: new Date() }, { transaction: t });
      }

      // 주식 보유 추가
      if (alloc.shares > 0) {
        const [holding, created] = await Holding.findOrCreate({
          where: { holderId: subscription.userId, stockId: offering.stockId },
          defaults: {
            holderId: subscription.userId,
            stockId: offering.stockId,
            shares: alloc.shares,
            averageCost: offering.offeringPrice
          },
          transaction: t
        });

        if (!created) {
          const newTotalShares = holding.shares + alloc.shares;
          const newAverageCost = Math.floor(
            (holding.shares * holding.averageCost + alloc.shares * offering.offeringPrice) / newTotalShares
          );
          await holding.update({
            shares: newTotalShares,
            averageCost: newAverageCost
          }, { transaction: t });
        }

        // 거래 기록
        await Transaction.create({
          stockId: offering.stockId,
          buyerId: subscription.userId,
          sellerId: offering.userId,
          shares: alloc.shares,
          pricePerShare: offering.offeringPrice,
          totalAmount: allocatedAmount,
          transactionType: 'ipo',
          fee: 0
        }, { transaction: t });
      }
    }

    // 발행자에게 공모 대금 지급
    const totalProceeds = allocations.reduce((sum, a) => sum + a.shares * offering.offeringPrice, 0);
    await User.increment('poBalance', {
      by: totalProceeds,
      where: { id: offering.userId },
      transaction: t
    });

    // 주식 업데이트
    const totalAllocated = allocations.reduce((sum, a) => sum + a.shares, 0);
    await offering.stock.update({
      issuedShares: totalAllocated,
      availableShares: 0,
      status: 'active',
      ipoApproved: true,
      shareholderCount: allocations.filter(a => a.shares > 0).length
    }, { transaction: t });

    // 공모 상태 업데이트
    await offering.update({
      status: 'allocated',
      competitionRate: competitionRate * 100,
      allocationAt: new Date()
    }, { transaction: t });

    await t.commit();

    return {
      success: true,
      totalAllocated,
      competitionRate: competitionRate * 100,
      subscriberCount: subscriptions.length,
      proceeds: totalProceeds
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

/**
 * 비례 배정
 */
function proportionalAllocation(subscriptions, totalShares) {
  const totalRequested = subscriptions.reduce((sum, s) => sum + s.requestedShares, 0);
  const ratio = Math.min(1, totalShares / totalRequested);

  let allocated = 0;
  const allocations = subscriptions.map(s => {
    const shares = Math.floor(s.requestedShares * ratio);
    allocated += shares;
    return { subscriptionId: s.id, shares };
  });

  // 남은 주식 분배 (신청량 많은 순)
  let remaining = totalShares - allocated;
  const sorted = [...allocations].sort((a, b) => {
    const subA = subscriptions.find(s => s.id === a.subscriptionId);
    const subB = subscriptions.find(s => s.id === b.subscriptionId);
    return subB.requestedShares - subA.requestedShares;
  });

  for (const alloc of sorted) {
    if (remaining <= 0) break;
    alloc.shares += 1;
    remaining -= 1;
  }

  return allocations;
}

/**
 * 균등 배정
 */
function equalAllocation(subscriptions, totalShares) {
  const perPerson = Math.floor(totalShares / subscriptions.length);
  let allocated = 0;

  const allocations = subscriptions.map(s => {
    const shares = Math.min(perPerson, s.requestedShares);
    allocated += shares;
    return { subscriptionId: s.id, shares };
  });

  // 남은 주식 추가 배정 (더 받을 수 있는 사람에게)
  let remaining = totalShares - allocated;
  for (const alloc of allocations) {
    if (remaining <= 0) break;
    const sub = subscriptions.find(s => s.id === alloc.subscriptionId);
    const canReceive = sub.requestedShares - alloc.shares;
    const additional = Math.min(remaining, canReceive);
    alloc.shares += additional;
    remaining -= additional;
  }

  return allocations;
}

/**
 * 추첨 배정
 */
function lotteryAllocation(subscriptions, totalShares) {
  // 1주씩 추첨으로 배정
  const allocations = subscriptions.map(s => ({ subscriptionId: s.id, shares: 0 }));
  let remaining = totalShares;

  // 가중치 기반 추첨 (신청량에 비례)
  while (remaining > 0) {
    const eligible = subscriptions.filter((s, i) => {
      return allocations[i].shares < s.requestedShares;
    });

    if (eligible.length === 0) break;

    const totalWeight = eligible.reduce((sum, s) => sum + s.requestedShares, 0);
    let random = Math.random() * totalWeight;

    for (const sub of eligible) {
      random -= sub.requestedShares;
      if (random <= 0) {
        const alloc = allocations.find(a => a.subscriptionId === sub.id);
        alloc.shares += 1;
        remaining -= 1;
        break;
      }
    }
  }

  return allocations;
}

/**
 * IPO 실패 처리
 */
async function handleFailedIPO(offering, subscriptions, transaction) {
  // 모든 청약자에게 환불
  for (const subscription of subscriptions) {
    await User.increment('poBalance', {
      by: subscription.depositAmount,
      where: { id: subscription.userId },
      transaction
    });

    await subscription.update({
      status: 'failed',
      refundAmount: subscription.depositAmount,
      refundedAt: new Date()
    }, { transaction });
  }

  // 공모 및 주식 상태 업데이트
  await offering.update({ status: 'failed' }, { transaction });
  await Stock.update(
    { status: 'delisted' },
    { where: { id: offering.stockId }, transaction }
  );
}

/**
 * 상장 처리
 */
async function processListing(offeringId) {
  const offering = await IPOOffering.findByPk(offeringId, {
    include: [{ model: Stock, as: 'stock' }]
  });

  if (!offering) {
    throw new Error('공모를 찾을 수 없습니다');
  }

  if (offering.status !== 'allocated') {
    throw new Error('배정이 완료된 공모만 상장할 수 있습니다');
  }

  await offering.update({
    status: 'listed',
    actualListedAt: new Date()
  });

  await offering.stock.update({
    status: 'active'
  });

  return offering;
}

/**
 * 진행 중인 공모 목록
 */
async function getActiveOfferings(options = {}) {
  const { page = 1, limit = 20, status } = options;

  const where = {};
  if (status) {
    where.status = status;
  } else {
    where.status = { [Op.in]: ['approved', 'subscription'] };
  }

  const { count, rows } = await IPOOffering.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'issuer',
        attributes: ['id', 'username', 'displayName', 'profileImage', 'category']
      },
      {
        model: Stock,
        as: 'stock',
        attributes: ['id', 'sharePrice', 'tier', 'category']
      }
    ],
    order: [['subscriptionStartAt', 'ASC']],
    limit,
    offset: (page - 1) * limit
  });

  return {
    offerings: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    }
  };
}

/**
 * 공모 상세 조회
 */
async function getOfferingDetail(offeringId, userId = null) {
  const offering = await IPOOffering.findByPk(offeringId, {
    include: [
      {
        model: User,
        as: 'issuer',
        attributes: ['id', 'username', 'displayName', 'profileImage', 'bio', 'category', 'occupation']
      },
      {
        model: Stock,
        as: 'stock'
      }
    ]
  });

  if (!offering) {
    return null;
  }

  // 경쟁률 계산
  const competitionRate = (offering.subscribedShares / offering.totalShares * 100).toFixed(2);

  // 남은 시간 계산
  const now = new Date();
  let timeRemaining = null;
  let phase = 'unknown';

  if (now < offering.subscriptionStartAt) {
    phase = 'upcoming';
    timeRemaining = offering.subscriptionStartAt - now;
  } else if (now <= offering.subscriptionEndAt) {
    phase = 'subscription';
    timeRemaining = offering.subscriptionEndAt - now;
  } else if (offering.status === 'closed' || offering.status === 'allocating') {
    phase = 'allocation';
  } else if (offering.status === 'allocated') {
    phase = 'listing';
    timeRemaining = offering.listingAt - now;
  } else if (offering.status === 'listed') {
    phase = 'listed';
  }

  // 사용자 청약 정보
  let mySubscription = null;
  if (userId) {
    mySubscription = await IPOSubscription.findOne({
      where: { offeringId, userId }
    });
  }

  return {
    ...offering.toJSON(),
    competitionRate: parseFloat(competitionRate),
    phase,
    timeRemaining,
    mySubscription
  };
}

/**
 * 내 청약 목록
 */
async function getMySubscriptions(userId, options = {}) {
  const { page = 1, limit = 20 } = options;

  const { count, rows } = await IPOSubscription.findAndCountAll({
    where: { userId },
    include: [
      {
        model: IPOOffering,
        as: 'offering',
        include: [
          { model: User, as: 'issuer', attributes: ['id', 'username', 'displayName', 'profileImage'] },
          { model: Stock, as: 'stock', attributes: ['id', 'sharePrice', 'category'] }
        ]
      }
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit
  });

  return {
    subscriptions: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    }
  };
}

module.exports = {
  createOffering,
  approveOffering,
  rejectOffering,
  subscribe,
  cancelSubscription,
  processAllocation,
  processListing,
  getActiveOfferings,
  getOfferingDetail,
  getMySubscriptions
};
