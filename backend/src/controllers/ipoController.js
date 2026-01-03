const { User, Stock, Holding, Transaction, StockOrder, IPOEligibility, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getIO } = require('../config/socket');
const ipoEligibilityService = require('../services/ipoEligibilityService');

// 티어별 발행 한도
const TIER_LIMITS = {
  BRONZE: { maxShares: 10000, minShareholders: 0, minTransactions: 0 },
  SILVER: { maxShares: 50000, minShareholders: 10, minTransactions: 50 },
  GOLD: { maxShares: 200000, minShareholders: 50, minTransactions: 200 },
  PLATINUM: { maxShares: 500000, minShareholders: 100, minTransactions: 500 },
  DIAMOND: { maxShares: 1000000, minShareholders: 300, minTransactions: 1000 }
};

/**
 * 상장 자격 확인
 */
exports.checkEligibility = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await ipoEligibilityService.checkEligibility(userId);
    res.json(result);
  } catch (error) {
    console.error('자격 확인 오류:', error);
    res.status(500).json({ error: '자격 확인 중 오류가 발생했습니다' });
  }
};

/**
 * 상장 자격 빠른 확인
 */
exports.quickEligibilityCheck = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await ipoEligibilityService.quickCheck(userId);
    res.json(result);
  } catch (error) {
    console.error('자격 확인 오류:', error);
    res.status(500).json({ error: '자격 확인 중 오류가 발생했습니다' });
  }
};

/**
 * IPO 신청
 */
exports.applyIPO = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const { initialPrice = 100, initialShares = 10000, category, description } = req.body;

    // 이미 발행한 주식이 있는지 확인
    const existingStock = await Stock.findOne({ where: { userId }, transaction: t });
    if (existingStock) {
      await t.rollback();
      return res.status(400).json({ error: '이미 발행한 주식이 있습니다' });
    }

    // 상장 자격 확인
    const eligibility = await ipoEligibilityService.checkEligibility(userId);
    if (!eligibility.isEligible) {
      await t.rollback();
      return res.status(400).json({
        error: '상장 자격 요건을 충족하지 않습니다',
        eligibility
      });
    }

    const user = await User.findByPk(userId, { transaction: t });

    // 락업 종료일 설정 (30일 후)
    const lockupEndDate = new Date();
    lockupEndDate.setDate(lockupEndDate.getDate() + 30);

    // IPO 대기 상태로 주식 생성
    const stock = await Stock.create({
      userId,
      sharePrice: initialPrice,
      totalShares: 100000,
      availableShares: initialShares,
      issuedShares: 0,
      status: 'ipo_pending',
      ipoApproved: false,
      category: category || 'other',
      tier: 'BRONZE',
      lockupEndDate
    }, { transaction: t });

    // 사용자를 상장인으로 표시
    await user.update({ isCreator: true }, { transaction: t });

    await t.commit();

    res.json({
      message: 'IPO 신청이 완료되었습니다. 심사 후 결과를 알려드립니다.',
      stock: {
        id: stock.id,
        status: stock.status,
        initialPrice,
        initialShares,
        lockupEndDate
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('IPO 신청 오류:', error);
    res.status(500).json({ error: 'IPO 신청 중 오류가 발생했습니다' });
  }
};

/**
 * 추가 공모 (Secondary Offering)
 */
exports.secondaryOffering = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const { shares, price } = req.body;

    const stock = await Stock.findOne({ where: { userId }, transaction: t });
    if (!stock) {
      await t.rollback();
      return res.status(404).json({ error: '발행한 주식이 없습니다' });
    }

    if (stock.status !== 'active') {
      await t.rollback();
      return res.status(400).json({ error: '활성화된 주식만 추가 공모가 가능합니다' });
    }

    // 티어별 한도 확인
    const tierLimit = TIER_LIMITS[stock.tier];
    const newTotal = stock.issuedShares + stock.availableShares + shares;
    if (newTotal > tierLimit.maxShares) {
      await t.rollback();
      return res.status(400).json({
        error: `현재 티어(${stock.tier})에서는 최대 ${tierLimit.maxShares}주까지만 발행 가능합니다`,
        currentTotal: stock.issuedShares + stock.availableShares,
        requested: shares,
        limit: tierLimit.maxShares
      });
    }

    // 가격은 현재가의 ±10% 범위 내에서만 설정 가능
    const minPrice = Math.floor(stock.sharePrice * 0.9);
    const maxPrice = Math.floor(stock.sharePrice * 1.1);
    if (price < minPrice || price > maxPrice) {
      await t.rollback();
      return res.status(400).json({
        error: `공모가는 ${minPrice}~${maxPrice} PO 사이여야 합니다`,
        currentPrice: stock.sharePrice
      });
    }

    await stock.update({
      availableShares: stock.availableShares + shares
    }, { transaction: t });

    await t.commit();

    // 실시간 알림
    try {
      const io = getIO();
      io.emit('stock:secondary_offering', {
        stockId: stock.id,
        newShares: shares,
        price,
        totalAvailable: stock.availableShares + shares
      });
    } catch (err) {}

    res.json({
      message: '추가 공모가 완료되었습니다',
      availableShares: stock.availableShares + shares,
      offeringPrice: price
    });
  } catch (error) {
    await t.rollback();
    console.error('추가 공모 오류:', error);
    res.status(500).json({ error: '추가 공모 중 오류가 발생했습니다' });
  }
};

/**
 * 자사주 매입
 */
exports.buybackShares = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const { shares, maxPrice } = req.body;

    const user = await User.findByPk(userId, { transaction: t });
    const stock = await Stock.findOne({ where: { userId }, transaction: t });

    if (!stock) {
      await t.rollback();
      return res.status(404).json({ error: '발행한 주식이 없습니다' });
    }

    const totalCost = shares * (maxPrice || stock.sharePrice);
    if (user.poBalance < totalCost) {
      await t.rollback();
      return res.status(400).json({ error: 'PO가 부족합니다', required: totalCost, available: user.poBalance });
    }

    // 시장에서 가장 낮은 가격의 매도 주문 체결
    const sellOrders = await StockOrder.findAll({
      where: {
        stockId: stock.id,
        orderType: 'SELL',
        status: 'PENDING',
        limitPrice: { [Op.lte]: maxPrice || stock.sharePrice }
      },
      order: [['limitPrice', 'ASC']],
      transaction: t
    });

    let remainingShares = shares;
    let totalSpent = 0;
    let filledShares = 0;

    for (const order of sellOrders) {
      if (remainingShares <= 0) break;

      const fillQty = Math.min(remainingShares, order.quantity - order.filledQuantity);
      const cost = fillQty * order.limitPrice;

      if (user.poBalance - totalSpent < cost) break;

      // 주문 체결 처리
      await order.update({
        filledQuantity: order.filledQuantity + fillQty,
        status: order.filledQuantity + fillQty >= order.quantity ? 'FILLED' : 'PARTIAL'
      }, { transaction: t });

      totalSpent += cost;
      filledShares += fillQty;
      remainingShares -= fillQty;
    }

    // 잔액 차감 및 자사주 추가
    await user.update({ poBalance: user.poBalance - totalSpent }, { transaction: t });
    await stock.update({
      treasuryShares: (stock.treasuryShares || 0) + filledShares,
      issuedShares: stock.issuedShares - filledShares
    }, { transaction: t });

    await t.commit();

    res.json({
      message: '자사주 매입이 완료되었습니다',
      sharesBought: filledShares,
      totalSpent,
      averagePrice: filledShares > 0 ? Math.floor(totalSpent / filledShares) : 0,
      treasuryShares: (stock.treasuryShares || 0) + filledShares
    });
  } catch (error) {
    await t.rollback();
    console.error('자사주 매입 오류:', error);
    res.status(500).json({ error: '자사주 매입 중 오류가 발생했습니다' });
  }
};

/**
 * 자사주 소각
 */
exports.burnTreasuryShares = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const { shares } = req.body;

    const stock = await Stock.findOne({ where: { userId }, transaction: t });
    if (!stock) {
      await t.rollback();
      return res.status(404).json({ error: '발행한 주식이 없습니다' });
    }

    if ((stock.treasuryShares || 0) < shares) {
      await t.rollback();
      return res.status(400).json({
        error: '소각할 자사주가 부족합니다',
        available: stock.treasuryShares || 0
      });
    }

    await stock.update({
      treasuryShares: stock.treasuryShares - shares,
      totalShares: stock.totalShares - shares
    }, { transaction: t });

    await t.commit();

    res.json({
      message: `${shares}주가 소각되었습니다`,
      remainingTreasury: stock.treasuryShares - shares,
      newTotalShares: stock.totalShares - shares
    });
  } catch (error) {
    await t.rollback();
    console.error('자사주 소각 오류:', error);
    res.status(500).json({ error: '자사주 소각 중 오류가 발생했습니다' });
  }
};

/**
 * 티어 업그레이드 확인
 */
exports.checkTierUpgrade = async (req, res) => {
  try {
    const userId = req.user.id;
    const stock = await Stock.findOne({
      where: { userId },
      include: [{ model: Holding, as: 'holdings' }]
    });

    if (!stock) {
      return res.status(404).json({ error: '발행한 주식이 없습니다' });
    }

    const currentTier = stock.tier;
    const shareholders = stock.shareholderCount || 0;
    const transactions = stock.transactionCount || 0;

    let eligibleTier = 'BRONZE';
    for (const [tier, limits] of Object.entries(TIER_LIMITS).reverse()) {
      if (shareholders >= limits.minShareholders && transactions >= limits.minTransactions) {
        eligibleTier = tier;
        break;
      }
    }

    const nextTierInfo = Object.entries(TIER_LIMITS).find(([tier]) => {
      const tierOrder = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
      return tierOrder.indexOf(tier) > tierOrder.indexOf(currentTier);
    });

    res.json({
      currentTier,
      eligibleTier,
      canUpgrade: eligibleTier !== currentTier &&
        ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'].indexOf(eligibleTier) >
        ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'].indexOf(currentTier),
      currentStats: { shareholders, transactions },
      currentLimit: TIER_LIMITS[currentTier],
      nextTier: nextTierInfo ? {
        tier: nextTierInfo[0],
        requirements: nextTierInfo[1],
        remaining: {
          shareholders: Math.max(0, nextTierInfo[1].minShareholders - shareholders),
          transactions: Math.max(0, nextTierInfo[1].minTransactions - transactions)
        }
      } : null
    });
  } catch (error) {
    console.error('티어 확인 오류:', error);
    res.status(500).json({ error: '티어 확인 중 오류가 발생했습니다' });
  }
};

/**
 * 티어 업그레이드 실행
 */
exports.upgradeTier = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const stock = await Stock.findOne({ where: { userId }, transaction: t });

    if (!stock) {
      await t.rollback();
      return res.status(404).json({ error: '발행한 주식이 없습니다' });
    }

    const shareholders = stock.shareholderCount || 0;
    const transactions = stock.transactionCount || 0;
    const tierOrder = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
    const currentIndex = tierOrder.indexOf(stock.tier);

    let newTier = stock.tier;
    for (let i = tierOrder.length - 1; i > currentIndex; i--) {
      const tier = tierOrder[i];
      const limits = TIER_LIMITS[tier];
      if (shareholders >= limits.minShareholders && transactions >= limits.minTransactions) {
        newTier = tier;
        break;
      }
    }

    if (newTier === stock.tier) {
      await t.rollback();
      return res.status(400).json({ error: '업그레이드 조건을 충족하지 않습니다' });
    }

    await stock.update({ tier: newTier }, { transaction: t });
    await t.commit();

    res.json({
      message: `티어가 ${stock.tier}에서 ${newTier}로 업그레이드되었습니다`,
      previousTier: stock.tier,
      newTier,
      newLimit: TIER_LIMITS[newTier]
    });
  } catch (error) {
    await t.rollback();
    console.error('티어 업그레이드 오류:', error);
    res.status(500).json({ error: '티어 업그레이드 중 오류가 발생했습니다' });
  }
};

/**
 * 상장폐지 신청
 */
exports.requestDelisting = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const { reason, buybackPrice } = req.body;

    const stock = await Stock.findOne({
      where: { userId },
      include: [{ model: Holding, as: 'holdings' }],
      transaction: t
    });

    if (!stock) {
      await t.rollback();
      return res.status(404).json({ error: '발행한 주식이 없습니다' });
    }

    if (stock.status !== 'active') {
      await t.rollback();
      return res.status(400).json({ error: '이미 상장폐지 진행 중이거나 완료된 주식입니다' });
    }

    // 락업 기간 확인
    if (stock.lockupEndDate && new Date() < new Date(stock.lockupEndDate)) {
      await t.rollback();
      return res.status(400).json({
        error: '락업 기간 중에는 상장폐지를 신청할 수 없습니다',
        lockupEndDate: stock.lockupEndDate
      });
    }

    // 모든 주주에게 매수 제안 (buybackPrice로)
    const totalBuybackCost = stock.issuedShares * buybackPrice;
    const user = await User.findByPk(userId, { transaction: t });

    if (user.poBalance < totalBuybackCost) {
      await t.rollback();
      return res.status(400).json({
        error: '모든 주식을 매입할 PO가 부족합니다',
        required: totalBuybackCost,
        available: user.poBalance
      });
    }

    // 상장폐지 대기 상태로 변경
    await stock.update({
      status: 'suspended',
      delistingRequestedAt: new Date(),
      delistingReason: reason,
      buybackPrice
    }, { transaction: t });

    await t.commit();

    res.json({
      message: '상장폐지가 신청되었습니다. 7일 후 자동으로 처리됩니다.',
      buybackPrice,
      totalCost: totalBuybackCost,
      processDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
  } catch (error) {
    await t.rollback();
    console.error('상장폐지 신청 오류:', error);
    res.status(500).json({ error: '상장폐지 신청 중 오류가 발생했습니다' });
  }
};

/**
 * 락업 상태 확인
 */
exports.getLockupStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const stock = await Stock.findOne({ where: { userId } });

    if (!stock) {
      return res.status(404).json({ error: '발행한 주식이 없습니다' });
    }

    const isLocked = stock.lockupEndDate && new Date() < new Date(stock.lockupEndDate);
    const daysRemaining = isLocked
      ? Math.ceil((new Date(stock.lockupEndDate) - new Date()) / (1000 * 60 * 60 * 24))
      : 0;

    res.json({
      isLocked,
      lockupEndDate: stock.lockupEndDate,
      daysRemaining,
      restrictions: isLocked ? [
        '발행자 매도 불가',
        '상장폐지 신청 불가',
        '추가 공모 가격 제한'
      ] : []
    });
  } catch (error) {
    console.error('락업 상태 확인 오류:', error);
    res.status(500).json({ error: '락업 상태 확인 중 오류가 발생했습니다' });
  }
};

/**
 * 내 IPO 현황 조회
 */
exports.getMyIPOStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const stock = await Stock.findOne({
      where: { userId },
      include: [
        { model: Holding, as: 'holdings', attributes: ['id'] }
      ]
    });

    if (!stock) {
      return res.json({
        hasStock: false,
        canApplyIPO: true
      });
    }

    const tierInfo = TIER_LIMITS[stock.tier];

    res.json({
      hasStock: true,
      stock: {
        id: stock.id,
        status: stock.status,
        tier: stock.tier,
        sharePrice: stock.sharePrice,
        issuedShares: stock.issuedShares,
        availableShares: stock.availableShares,
        treasuryShares: stock.treasuryShares || 0,
        totalShares: stock.totalShares,
        shareholderCount: stock.shareholderCount || 0,
        transactionCount: stock.transactionCount || 0,
        marketCap: stock.sharePrice * stock.issuedShares,
        tierLimit: tierInfo.maxShares,
        lockupEndDate: stock.lockupEndDate,
        ipoApproved: stock.ipoApproved
      }
    });
  } catch (error) {
    console.error('IPO 현황 조회 오류:', error);
    res.status(500).json({ error: '조회 중 오류가 발생했습니다' });
  }
};
