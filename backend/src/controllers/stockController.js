const { User, Stock, Holding, Transaction, PriceHistory, Wallet, StockOrder, StockTrade, sequelize } = require('../models');
const { buildOrderBook, planExecution } = require('../services/orderBookService');
const stockPriceService = require('../services/stockPriceService');
const { getIO } = require('../config/socket');
const { Op } = require('sequelize');
const {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateRSI,
  calculateMACD
} = require('../utils/technicalIndicators');
const { getMaxSharesByTier } = require('../utils/tierSystem');
const viralController = require('./viralController');
const {
  validatePagination,
  validatePositiveInt,
  sanitizeSearchQuery,
  isValidUUID
} = require('../utils/validation');
const { updateBalance } = require('../utils/balanceService');
const { isCircuitBreakerActive } = require('../utils/circuitBreaker');
const { checkDailyTradeLimit, recordDailyTradeAmount } = require('../utils/dailyTradeLimit');
const { applyTradePrice, computeMarketImpact } = require('../utils/priceEngine');
const { checkTradable } = require('../utils/tradeGuard');
const {
  splitPurchase,
  BUYBACK_ENABLED,
  BUYBACK_UNAVAILABLE_MESSAGE,
  BUYBACK_INSUFFICIENT_MESSAGE
} = require('../config/pointEconomy');

/**
 * 주식 목록 조회
 */
exports.getStocks = async (req, res) => {
  try {
    // 입력 검증 (DoS 방지)
    const { page, limit, offset } = validatePagination(req.query);
    const sortBy = req.query.sortBy || 'marketCap';

    let order = [['marketCapTotal', 'DESC']]; // 기본: 시가총액 순

    if (sortBy === 'price') order = [['sharePrice', 'DESC']];
    else if (sortBy === 'change') order = [['priceChangePercent', 'DESC']];

    const stocks = await Stock.findAll({
      include: [{
        model: User,
        as: 'issuer',
        attributes: ['id', 'username', 'displayName', 'profileImage', 'trustLevel', 'bio']
      }],
      order,
      limit,
      offset
    });

    // Add holderCount for each stock
    const stocksWithHolders = await Promise.all(
      stocks.map(async (stock) => {
        const holderCount = await Holding.count({
          where: { stockId: stock.id }
        });
        return {
          ...stock.toJSON(),
          holderCount
        };
      })
    );

    const total = await Stock.count();

    res.json({
      stocks: stocksWithHolders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('주식 목록 조회 오류:', error);
    res.status(500).json({ error: '주식 목록 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 주식 검색
 */
exports.searchStocks = async (req, res) => {
  try {
    // 입력 검증 (XSS 및 DoS 방지)
    const searchTerm = sanitizeSearchQuery(req.query.q, 100);
    const { limit } = validatePagination({ limit: req.query.limit });

    if (!searchTerm || searchTerm.length < 1) {
      return res.json({ stocks: [] });
    }

    const stocks = await Stock.findAll({
      where: {
        status: 'active'
      },
      include: [{
        model: User,
        as: 'issuer',
        attributes: ['id', 'username', 'displayName', 'profileImage', 'bio'],
        where: {
          [Op.or]: [
            { username: { [Op.like]: `%${searchTerm}%` } },
            { displayName: { [Op.like]: `%${searchTerm}%` } }
          ]
        }
      }],
      order: [['marketCapTotal', 'DESC']],
      limit
    });

    res.json({
      stocks: stocks.map(stock => ({
        id: stock.id,
        userId: stock.userId,
        issuer: stock.issuer,
        sharePrice: stock.sharePrice,
        priceChangePercent: parseFloat(stock.priceChangePercent || 0),
        marketCap: stock.marketCapTotal,
        tier: stock.tier
      })),
      query: searchTerm
    });
  } catch (error) {
    console.error('주식 검색 오류:', error);
    res.status(500).json({ error: '주식 검색 중 오류가 발생했습니다' });
  }
};

/**
 * 주식 상세 조회
 */
exports.getStockDetail = async (req, res) => {
  try {
    const { stockId } = req.params;

    // UUID 형식 검증
    if (!isValidUUID(stockId)) {
      return res.status(400).json({ error: '유효하지 않은 주식 ID입니다' });
    }

    const stock = await Stock.findByPk(stockId, {
      include: [{
        model: User,
        as: 'issuer',
        attributes: ['id', 'username', 'displayName', 'profileImage', 'bio', 'trustLevel', 'trustMultiplier']
      }]
    });

    if (!stock) {
      return res.status(404).json({ error: '주식을 찾을 수 없습니다' });
    }

    // 최근 거래 내역
    const recentTrades = await Transaction.findAll({
      where: { stockId },
      order: [[sequelize.col('Transaction.created_at'), 'DESC']],
      limit: 10,
      include: [{
        model: User,
        as: 'buyer',
        attributes: ['username']
      }]
    });

    // 보유자 수
    const holderCount = await Holding.count({
      where: { stockId }
    });

    // 환매 여력 (게임 포인트 풀 기준). 실제 자금 예치가 아니다.
    const reserve = Number(stock.buybackReserve) || 0;
    const price = parseFloat(stock.sharePrice) || 0;

    res.json({
      stock,
      recentTrades,
      holderCount,
      buyback: {
        enabled: BUYBACK_ENABLED,
        reservePoints: reserve,
        maxShares: price > 0 ? Math.floor(reserve / price) : 0
      }
    });
  } catch (error) {
    console.error('주식 상세 조회 오류:', error);
    res.status(500).json({ error: '주식 상세 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 주식 매수
 */
exports.buyStock = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { stockId } = req.body;
    const buyerId = req.user.id;

    // 입력 검증 (최소 1주, 최대 100만주)
    if (!stockId || !isValidUUID(stockId)) {
      await t.rollback();
      return res.status(400).json({ error: '유효하지 않은 주식 ID입니다' });
    }

    // 프론트가 'shares' 또는 'quantity' 키로 보낼 수 있어 둘 다 허용
    const shares = validatePositiveInt(req.body.shares ?? req.body.quantity, {
      min: 1,
      max: 1000000,
      defaultValue: null
    });

    if (shares === null) {
      await t.rollback();
      return res.status(400).json({ error: '유효하지 않은 주식 수입니다 (1~1,000,000주)' });
    }

    // 주식 정보 조회
    const stock = await Stock.findByPk(stockId, { transaction: t });
    if (!stock) {
      await t.rollback();
      return res.status(404).json({ error: '주식을 찾을 수 없습니다' });
    }

    // 자기 주식 매수 방지
    if (stock.userId === buyerId) {
      await t.rollback();
      return res.status(400).json({ error: '자신의 주식은 매수할 수 없습니다' });
    }

    // 본인 미인증(가상 사전상장) 종목 거래 차단 (초상권 보호)
    const buyTradable = checkTradable(stock);
    if (!buyTradable.ok) {
      await t.rollback();
      return res.status(403).json({ error: buyTradable.message });
    }

    // 서킷브레이커 확인
    if (isCircuitBreakerActive(stock)) {
      await t.rollback();
      return res.status(403).json({
        error: '서킷브레이커가 발동되어 거래가 일시 중단되었습니다',
        circuitBreakerEndTime: stock.circuitBreakerEndTime
      });
    }

    // 구매자 정보
    const buyer = await User.findByPk(buyerId, { transaction: t });
    const totalCost = stock.sharePrice * shares;

    // 일일 거래 한도 확인
    const tradeCheck = await checkDailyTradeLimit(buyer, totalCost, t);
    if (!tradeCheck.allowed) {
      await t.rollback();
      return res.status(400).json({
        error: '일일 거래 한도를 초과했습니다',
        dailyLimit: tradeCheck.dailyLimit,
        usedToday: tradeCheck.usedToday,
        remaining: tradeCheck.remaining,
        required: totalCost
      });
    }

    // 잔액 확인
    if (buyer.poBalance < totalCost) {
      await t.rollback();
      return res.status(400).json({
        error: 'PO가 부족합니다',
        required: totalCost,
        available: buyer.poBalance
      });
    }

    // 매수 가능 주식 수 확인 (초기 공모 수량 기준)
    if (stock.issuedShares + shares > stock.availableShares) {
      await t.rollback();
      return res.status(400).json({
        error: '매수 가능한 주식이 부족합니다',
        requested: shares,
        available: stock.availableShares - stock.issuedShares,
        message: '크리에이터가 추가 공모를 진행할 때까지 기다려주세요'
      });
    }

    /**
     * 매수 대금을 크리에이터 몫과 환매 준비 포인트로 나눈다.
     *
     * 준비 포인트는 이 종목에 귀속된 포인트 카운터이며 실제 자금 예치가 아니다.
     * 주주가 되팔 때 여기서 지급하므로 PO 총량이 보존된다.
     * (예전에는 매도 시 지급만 하고 차감 주체가 없어 포인트가 무한 발행됐다)
     */
    const split = splitPurchase(totalCost);

    // PO 차감 (User + Wallet 동시)
    await updateBalance(buyerId, -totalCost, {
      transaction: t,
      walletFields: { totalPOSpent: totalCost }
    });

    // 크리에이터에게 자유 사용분 지급
    if (split.toCreator > 0) {
      await updateBalance(stock.userId, split.toCreator, {
        transaction: t,
        walletFields: { totalPOEarned: split.toCreator }
      });
    }

    // 나머지는 종목의 환매 준비 포인트로 적립
    if (split.toReserve > 0) {
      await stock.increment(
        {
          buybackReserve: split.toReserve,
          buybackReserveFunded: split.toReserve
        },
        { transaction: t }
      );
    }

    // 보유 주식 추가/업데이트
    const [holding, created] = await Holding.findOrCreate({
      where: { holderId: buyerId, stockId },
      defaults: {
        shares,
        averagePrice: stock.sharePrice,
        acquiredAt: new Date()
      },
      transaction: t
    });

    if (!created) {
      // 기존 보유 주식 업데이트
      const newTotalShares = holding.shares + shares;
      const newAveragePrice = Math.floor(
        (holding.averagePrice * holding.shares + totalCost) / newTotalShares
      );

      await holding.update(
        {
          shares: newTotalShares,
          averagePrice: newAveragePrice
        },
        { transaction: t }
      );
    }

    // 거래 내역 저장
    await Transaction.create({
      buyerId,
      stockId,
      shares,
      pricePerShare: stock.sharePrice,
      totalAmount: totalCost,
      transactionType: 'buy'
    }, { transaction: t });

    // 주식 발행량 증가
    await stock.update(
      { issuedShares: stock.issuedShares + shares },
      { transaction: t }
    );

    // 일일 거래 사용량 기록
    await recordDailyTradeAmount(buyer, totalCost, t);

    // 체결가 기반 현재가 반영: 매수 압력으로 가격 상승 (시장 충격)
    const buyImpactPrice = computeMarketImpact(stock.sharePrice, shares, stock.totalShares, 'buy');
    await applyTradePrice(stock, buyImpactPrice, { volume: shares, transaction: t });

    await t.commit();

    // 실시간 거래 피드 브로드캐스트
    try {
      const io = getIO();
      io.emit('trade:new', {
        tradeType: 'buy',
        traderId: buyer.id,
        traderUsername: buyer.username,
        traderDisplayName: buyer.displayName || buyer.username,
        traderProfileImage: buyer.profileImage,
        stockId: stock.id,
        stockUsername: stock.issuer?.username || 'Unknown',
        stockDisplayName: stock.issuer?.displayName || stock.issuer?.username,
        shares,
        pricePerShare: stock.sharePrice,
        totalAmount: totalCost,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('거래 피드 브로드캐스트 오류:', err);
    }

    // 바이럴 기능 실행 (비동기, 에러가 나도 매수에 영향 없음)
    try {
      // 1. Ego Viral - 크리에이터에게 알림
      await viralController.notifyStockPurchaseInternal(buyerId, stock.id, shares);

      // 2. 얼리버드 뱃지 확인 및 부여
      await viralController.grantEarlyBirdBadgeInternal(buyerId, stock.id);

      // 3. 첫 거래인지 확인하고 추천인 보상 처리
      const transactionCount = await Transaction.count({
        where: { buyerId }
      });
      if (transactionCount === 1) {
        // 첫 거래! 추천인에게 보상
        await viralController.onReferredUserFirstTradeInternal(buyerId);
      }
    } catch (viralError) {
      console.error('바이럴 기능 실행 오류 (무시됨):', viralError);
    }

    res.json({
      message: '매수 완료',
      transaction: {
        shares,
        pricePerShare: stock.sharePrice,
        totalCost,
        newBalance: buyer.poBalance - totalCost
      },
      holding: {
        totalShares: created ? shares : holding.shares + shares,
        averagePrice: created ? stock.sharePrice : Math.floor(
          (holding.averagePrice * holding.shares + totalCost) / (holding.shares + shares)
        )
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('주식 매수 오류:', error);
    res.status(500).json({ error: '주식 매수 중 오류가 발생했습니다' });
  }
};

/**
 * 주식 매도
 */
exports.sellStock = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { stockId } = req.body;
    const sellerId = req.user.id;

    // 입력 검증 (최소 1주, 최대 100만주)
    if (!stockId || !isValidUUID(stockId)) {
      await t.rollback();
      return res.status(400).json({ error: '유효하지 않은 주식 ID입니다' });
    }

    // 프론트가 'shares' 또는 'quantity' 키로 보낼 수 있어 둘 다 허용
    const shares = validatePositiveInt(req.body.shares ?? req.body.quantity, {
      min: 1,
      max: 1000000,
      defaultValue: null
    });

    if (shares === null) {
      await t.rollback();
      return res.status(400).json({ error: '유효하지 않은 주식 수입니다 (1~1,000,000주)' });
    }

    // 보유 주식 확인
    const holding = await Holding.findOne({
      where: { holderId: sellerId, stockId },
      transaction: t
    });

    if (!holding || holding.shares < shares) {
      await t.rollback();
      return res.status(400).json({
        error: '보유 주식이 부족합니다',
        requested: shares,
        available: holding ? holding.shares : 0
      });
    }

    // 주식 정보
    const stock = await Stock.findByPk(stockId, { transaction: t });
    const totalRevenue = stock.sharePrice * shares;

    // 본인 미인증(가상 사전상장) 종목 거래 차단 (초상권 보호)
    const sellTradable = checkTradable(stock);
    if (!sellTradable.ok) {
      await t.rollback();
      return res.status(403).json({ error: sellTradable.message });
    }

    // 서킷브레이커 확인
    if (isCircuitBreakerActive(stock)) {
      await t.rollback();
      return res.status(403).json({
        error: '서킷브레이커가 발동되어 거래가 일시 중단되었습니다',
        circuitBreakerEndTime: stock.circuitBreakerEndTime
      });
    }

    // 판매자 정보
    const seller = await User.findByPk(sellerId, { transaction: t });

    // 일일 거래 한도 확인
    const tradeCheck = await checkDailyTradeLimit(seller, totalRevenue, t);
    if (!tradeCheck.allowed) {
      await t.rollback();
      return res.status(400).json({
        error: '일일 거래 한도를 초과했습니다',
        dailyLimit: tradeCheck.dailyLimit,
        usedToday: tradeCheck.usedToday,
        remaining: tradeCheck.remaining,
        required: totalRevenue
      });
    }

    /**
     * 환매 재원 확인.
     *
     * 발행시장 매도(= 환매)는 종목의 환매 준비 포인트에서 지급한다.
     * 예전에는 차감 없이 지급만 해서 PO 총량이 계속 늘어났다.
     * 재원이 부족하면 여기서 막고, 호가창(주주 간 거래)으로 안내한다.
     */
    if (!BUYBACK_ENABLED) {
      await t.rollback();
      return res.status(400).json({
        error: BUYBACK_UNAVAILABLE_MESSAGE,
        code: 'BUYBACK_DISABLED',
        useOrderBook: true
      });
    }

    const reserve = Number(stock.buybackReserve) || 0;
    if (reserve < totalRevenue) {
      await t.rollback();
      return res.status(400).json({
        error: BUYBACK_INSUFFICIENT_MESSAGE,
        code: 'BUYBACK_INSUFFICIENT',
        useOrderBook: true,
        buybackReserve: reserve,
        required: totalRevenue,
        // 준비 포인트로 지금 되팔 수 있는 최대 수량
        maxBuybackShares: stock.sharePrice > 0 ? Math.floor(reserve / stock.sharePrice) : 0
      });
    }

    // 준비 포인트에서 차감 → 판매자에게 지급 (총량 보존). 원자적 갱신 1회.
    await stock.increment(
      { buybackReserve: -totalRevenue, buybackReserveUsed: totalRevenue },
      { transaction: t }
    );
    await updateBalance(sellerId, totalRevenue, { transaction: t });

    // 보유 주식 감소
    if (holding.shares === shares) {
      // 전량 매도 - 보유 기록 삭제
      await holding.destroy({ transaction: t });
    } else {
      // 일부 매도
      await holding.update(
        { shares: holding.shares - shares },
        { transaction: t }
      );
    }

    // 거래 내역 저장
    await Transaction.create({
      sellerId,
      stockId,
      shares,
      pricePerShare: stock.sharePrice,
      totalAmount: totalRevenue,
      transactionType: 'sell'
    }, { transaction: t });

    // 주식 발행량 감소
    await stock.update(
      { issuedShares: stock.issuedShares - shares },
      { transaction: t }
    );

    // 일일 거래 사용량 기록
    await recordDailyTradeAmount(seller, totalRevenue, t);

    // 체결가 기반 현재가 반영: 매도 압력으로 가격 하락 (시장 충격)
    const sellImpactPrice = computeMarketImpact(stock.sharePrice, shares, stock.totalShares, 'sell');
    await applyTradePrice(stock, sellImpactPrice, { volume: shares, transaction: t });

    await t.commit();

    // 실시간 거래 피드 브로드캐스트
    try {
      const io = getIO();
      io.emit('trade:new', {
        tradeType: 'sell',
        traderId: seller.id,
        traderUsername: seller.username,
        traderDisplayName: seller.displayName || seller.username,
        traderProfileImage: seller.profileImage,
        stockId: stock.id,
        stockUsername: stock.issuer?.username || 'Unknown',
        stockDisplayName: stock.issuer?.displayName || stock.issuer?.username,
        shares,
        pricePerShare: stock.sharePrice,
        totalAmount: totalRevenue,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('거래 피드 브로드캐스트 오류:', err);
    }

    res.json({
      message: '매도 완료',
      transaction: {
        shares,
        pricePerShare: stock.sharePrice,
        totalRevenue,
        newBalance: seller.poBalance + totalRevenue
      },
      holding: {
        remainingShares: holding.shares - shares
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('주식 매도 오류:', error);
    res.status(500).json({ error: '주식 매도 중 오류가 발생했습니다' });
  }
};

/**
 * 내 보유 주식 조회
 */
exports.getMyHoldings = async (req, res) => {
  try {
    const userId = req.user.id;

    const holdings = await Holding.findAll({
      where: { holderId: userId },
      include: [{
        model: Stock,
        as: 'stock',
        include: [{
          model: User,
          as: 'issuer',
          attributes: ['id', 'username', 'displayName', 'profileImage']
        }]
      }]
    });

    // 총 평가액 계산
    const totalValue = holdings.reduce((sum, holding) => {
      return sum + (holding.stock.sharePrice * holding.shares);
    }, 0);

    // 총 투자액 계산
    const totalInvested = holdings.reduce((sum, holding) => {
      return sum + (holding.averagePrice * holding.shares);
    }, 0);

    // 수익률 계산
    const profitRate = totalInvested > 0
      ? ((totalValue - totalInvested) / totalInvested * 100).toFixed(2)
      : 0;

    res.json({
      holdings,
      summary: {
        totalValue,
        totalInvested,
        profitRate: parseFloat(profitRate),
        profitAmount: totalValue - totalInvested
      }
    });
  } catch (error) {
    console.error('보유 주식 조회 오류:', error);
    res.status(500).json({ error: '보유 주식 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 내 주주 목록 조회 (내 주식을 보유한 사람들)
 */
exports.getMyShareholders = async (req, res) => {
  try {
    const userId = req.user.id;

    // 내 주식 찾기
    const myStock = await Stock.findOne({
      where: { userId }
    });

    if (!myStock) {
      return res.json({ shareholders: [], total: 0 });
    }

    // 내 주식을 보유한 사람들 조회
    const shareholders = await Holding.findAll({
      where: {
        stockId: myStock.id,
        shares: { [Op.gt]: 0 }
      },
      include: [{
        model: User,
        as: 'holder',
        attributes: ['id', 'username', 'profileImage', 'trustLevel']
      }],
      order: [['shares', 'DESC']]
    });

    // 전체 발행 주식 중 보유 비율 계산
    const enrichedShareholders = shareholders.map(sh => ({
      ...sh.toJSON(),
      percentage: ((sh.shares / myStock.issuedShares) * 100).toFixed(2),
      totalValue: sh.shares * myStock.sharePrice
    }));

    res.json({
      shareholders: enrichedShareholders,
      total: shareholders.length,
      myStock: {
        sharePrice: myStock.sharePrice,
        issuedShares: myStock.issuedShares
      }
    });
  } catch (error) {
    console.error('주주 목록 조회 오류:', error);
    res.status(500).json({ error: '주주 목록 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 거래 내역 조회
 */
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    // 입력 검증 (DoS 방지)
    const { page, limit, offset } = validatePagination(req.query);

    const transactions = await Transaction.findAll({
      where: {
        [Op.or]: [
          { buyerId: userId },
          { sellerId: userId }
        ]
      },
      include: [{
        model: Stock,
        as: 'stock',
        include: [{
          model: User,
          as: 'issuer',
          attributes: ['username', 'profileImage']
        }]
      }],
      order: [[sequelize.col('Transaction.created_at'), 'DESC']],
      limit,
      offset
    });

    const total = await Transaction.count({
      where: {
        [Op.or]: [
          { buyerId: userId },
          { sellerId: userId }
        ]
      }
    });

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('거래 내역 조회 오류:', error);
    res.status(500).json({ error: '거래 내역 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 특정 사용자의 주식 조회
 */
exports.getUserStock = async (req, res) => {
  try {
    const { userId } = req.params;

    // UUID 형식 검증
    if (!isValidUUID(userId)) {
      return res.status(400).json({ error: '유효하지 않은 사용자 ID입니다' });
    }

    // userId로 주식 찾기
    const stock = await Stock.findOne({
      where: { userId },
      include: [{
        model: User,
        as: 'issuer',
        attributes: ['id', 'username', 'displayName', 'profileImage', 'bio', 'trustLevel', 'trustMultiplier']
      }]
    });

    if (!stock) {
      return res.status(404).json({ error: '해당 사용자의 주식을 찾을 수 없습니다' });
    }

    // 최근 거래 내역
    const recentTrades = await Transaction.findAll({
      where: { stockId: stock.id },
      order: [[sequelize.col('Transaction.created_at'), 'DESC']],
      limit: 10,
      include: [{
        model: User,
        as: 'buyer',
        attributes: ['username']
      }]
    });

    // 보유자 수
    const holderCount = await Holding.count({
      where: { stockId: stock.id }
    });

    res.json({
      stock,
      recentTrades,
      holderCount
    });
  } catch (error) {
    console.error('사용자 주식 조회 오류:', error);
    res.status(500).json({ error: '사용자 주식 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 추천 주식 목록 조회
 */
exports.getRecommendedStocks = async (req, res) => {
  try {
    // 급상승 주식 (가격 변동률 기준)
    const trending = await Stock.findAll({
      where: {
        priceChangePercent: {
          [Op.gt]: 0
        }
      },
      include: [{
        model: User,
        as: 'issuer',
        attributes: ['id', 'username', 'displayName', 'profileImage', 'trustLevel', 'bio']
      }],
      order: [['priceChangePercent', 'DESC']],
      limit: 5
    });

    // 인기 주식 (발행량 기준)
    const popular = await Stock.findAll({
      include: [{
        model: User,
        as: 'issuer',
        attributes: ['id', 'username', 'displayName', 'profileImage', 'trustLevel', 'bio']
      }],
      order: [['issuedShares', 'DESC']],
      limit: 5
    });

    // 신규 상장 주식
    const newest = await Stock.findAll({
      include: [{
        model: User,
        as: 'issuer',
        attributes: ['id', 'username', 'displayName', 'profileImage', 'trustLevel', 'bio']
      }],
      order: [[sequelize.col('Stock.created_at'), 'DESC']],
      limit: 5
    });

    res.json({
      trending,
      popular,
      newest
    });
  } catch (error) {
    console.error('추천 주식 조회 오류:', error);
    res.status(500).json({ error: '추천 주식 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 주식 가격 히스토리 조회
 */
exports.getPriceHistory = async (req, res) => {
  try {
    const { stockId } = req.params;

    // UUID 형식 검증
    if (!isValidUUID(stockId)) {
      return res.status(400).json({ error: '유효하지 않은 주식 ID입니다' });
    }

    /**
     * 지원 타임프레임.
     *
     * '1m'/'5m'/'15m'/'1h' 는 분·시간봉이다. 예전에는 화이트리스트에 없어서
     * 프론트가 '1h' 를 보내도 조용히 '1d' 로 폴백됐고, 결과적으로 "1일" 탭에
     * 일봉이 나왔다. priceHistoryScheduler 가 이 단위들을 기록한다.
     *
     * 주의: 'm' 은 분(minute)이다. 월봉은 '1M'(대문자)로 구분한다.
     */
    const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M'];
    const timeframe = TIMEFRAMES.includes(req.query.timeframe)
      ? req.query.timeframe
      : '1d';

    /**
     * 캔들 개수는 일반 목록 페이지네이션(MAX_LIMIT 100)과 성격이 다르다.
     * 100개로 자르면 1년 차트(365봉)나 분봉이 잘려 나온다.
     */
    const MAX_CANDLES = 500;
    const parsedLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.max(1, Math.min(parsedLimit, MAX_CANDLES))
      : 200;

    /**
     * 최신 캔들부터 limit 개를 가져온 뒤 오름차순으로 뒤집는다.
     *
     * 예전에는 ASC + limit 이라 이력이 쌓일수록 "가장 오래된 N개"만 반환됐고,
     * 차트가 과거에 멈춰 있었다.
     */
    const history = (
      await PriceHistory.findAll({
        where: { stockId, timeframe },
        order: [['timestamp', 'DESC']],
        limit
      })
    ).reverse();

    if (history.length === 0) {
      return res.json({ history: [], indicators: {}, timeframe });
    }

    // 종가 데이터 추출
    const closePrices = history.map(h => parseFloat(h.close));
    const highPrices = history.map(h => parseFloat(h.high));
    const lowPrices = history.map(h => parseFloat(h.low));

    // 기술적 지표 계산
    const sma20 = calculateSMA(closePrices, 20);
    const sma50 = calculateSMA(closePrices, 50);
    const ema12 = calculateEMA(closePrices, 12);
    const ema26 = calculateEMA(closePrices, 26);
    const bollingerBands = calculateBollingerBands(closePrices, 20, 2);
    const rsi = calculateRSI(closePrices, 14);
    const macd = calculateMACD(closePrices, 12, 26, 9);

    // 히스토리 데이터에 지표 결합
    const enrichedHistory = history.map((h, i) => ({
      ...h.toJSON(),
      sma20: sma20[i],
      sma50: sma50[i],
      ema12: ema12[i],
      ema26: ema26[i],
      bollingerUpper: bollingerBands.upper[i],
      bollingerMiddle: bollingerBands.middle[i],
      bollingerLower: bollingerBands.lower[i],
      rsi: rsi[i],
      macd: macd.macd[i],
      macdSignal: macd.signal[i],
      macdHistogram: macd.histogram[i]
    }));

    res.json({
      history: enrichedHistory,
      indicators: {
        sma20: sma20.filter(v => v !== null),
        sma50: sma50.filter(v => v !== null),
        bollingerBands,
        rsi: rsi.filter(v => v !== null),
        macd
      }
    });
  } catch (error) {
    console.error('가격 히스토리 조회 오류:', error);
    res.status(500).json({ error: '가격 히스토리 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 데모용 가격 히스토리 생성
 */
exports.generateDemoHistory = async (req, res) => {
  try {
    const { stockId } = req.params;

    // UUID 형식 검증
    if (!isValidUUID(stockId)) {
      return res.status(400).json({ error: '유효하지 않은 주식 ID입니다' });
    }

    // 입력 검증 (최소 1일, 최대 365일)
    const days = validatePositiveInt(req.body.days, {
      min: 1,
      max: 365,
      defaultValue: 90
    });

    const stock = await Stock.findByPk(stockId);
    if (!stock) {
      return res.status(404).json({ error: '주식을 찾을 수 없습니다' });
    }

    // 기존 히스토리 삭제
    await PriceHistory.destroy({
      where: { stockId, timeframe: '1d' }
    });

    const basePrice = parseFloat(stock.sharePrice);
    let currentPrice = basePrice;
    const historyData = [];

    // 과거 날짜부터 현재까지 데이터 생성
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(9, 0, 0, 0); // 오전 9시로 설정

      // 랜덤 가격 변동 (일일 ±5%)
      const changePercent = (Math.random() - 0.5) * 10;
      const priceChange = currentPrice * (changePercent / 100);
      currentPrice = Math.max(basePrice * 0.5, currentPrice + priceChange);

      // OHLC 데이터 생성
      const volatility = currentPrice * 0.03; // 3% 변동성
      const open = currentPrice + (Math.random() - 0.5) * volatility;
      const close = currentPrice + (Math.random() - 0.5) * volatility;
      const high = Math.max(open, close) + Math.random() * volatility;
      const low = Math.min(open, close) - Math.random() * volatility;
      const volume = Math.floor(Math.random() * 1000) + 100;

      historyData.push({
        stockId,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume,
        timeframe: '1d',
        timestamp: date
      });
    }

    // 벌크 인서트
    await PriceHistory.bulkCreate(historyData);

    res.json({
      message: `${days}일치 가격 히스토리가 생성되었습니다`,
      count: historyData.length
    });
  } catch (error) {
    console.error('데모 히스토리 생성 오류:', error);
    res.status(500).json({ error: '데모 히스토리 생성 중 오류가 발생했습니다' });
  }
};

/**
 * 주식 발행 (IPO)
 */
exports.issueStock = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const userId = req.user.id;

    // 입력 검증 (DoS 및 악의적 입력 방지)
    const initialPrice = validatePositiveInt(req.body.initialPrice, {
      min: 1,
      max: 1000000000, // 최대 10억 PO
      defaultValue: null
    });

    const totalShares = validatePositiveInt(req.body.totalShares, {
      min: 1,
      max: 100000000, // 최대 1억주
      defaultValue: null
    });

    const initialOffering = validatePositiveInt(req.body.initialOffering, {
      min: 1,
      max: 100000000,
      defaultValue: null
    });

    const dividendRate = validatePositiveInt(req.body.dividendRate, {
      min: 0,
      max: 100,
      defaultValue: null
    });

    if (initialPrice === null) {
      await t.rollback();
      return res.status(400).json({ error: '주가는 1 PO 이상이어야 합니다' });
    }

    if (totalShares === null) {
      await t.rollback();
      return res.status(400).json({ error: '발행 주식은 1주 이상이어야 합니다' });
    }

    if (initialOffering === null || initialOffering > totalShares) {
      await t.rollback();
      return res.status(400).json({ error: '초기 공모 수량은 1주 이상, 총 발행량 이하여야 합니다' });
    }

    if (dividendRate === null) {
      await t.rollback();
      return res.status(400).json({ error: '배당률은 0%~100% 사이여야 합니다' });
    }

    // 이미 주식을 발행했는지 확인 (1인 1주식)
    const existingStock = await Stock.findOne({
      where: { userId },
      transaction: t
    });

    // 티어별 발행량 한도 검증
    const currentTier = existingStock?.tier || 'BRONZE'; // 신규는 Bronze
    const maxShares = getMaxSharesByTier(currentTier);

    if (totalShares > maxShares) {
      await t.rollback();
      return res.status(400).json({
        error: `현재 티어(${currentTier})의 최대 발행량은 ${maxShares.toLocaleString()}주입니다`
      });
    }

    let stock;

    if (existingStock) {
      // 이미 주식이 있고 availableShares > 0이면 중복 발행 불가
      if (existingStock.availableShares > 0) {
        await t.rollback();
        return res.status(400).json({ error: '이미 주식을 발행했습니다. 1인당 1개의 주식만 발행할 수 있습니다.' });
      }

      // availableShares가 0이면 재발행 (기존 레코드 업데이트)
      await existingStock.update({
        totalShares,
        issuedShares: 0,
        availableShares: initialOffering,
        sharePrice: initialPrice,
        dividendRate,
        marketCapTotal: 0,
        // 티어 관련 필드는 유지 (기존 값 보존)
      }, { transaction: t });

      stock = existingStock;
    } else {
      // 주식이 없으면 새로 생성
      stock = await Stock.create({
        userId,
        totalShares,
        issuedShares: 0, // 초기에는 0주 발행
        availableShares: initialOffering, // 초기 공모 수량만큼 매수 가능
        sharePrice: initialPrice,
        dividendRate,
        marketCapTotal: 0, // beforeSave 훅에서 자동 계산됨
        tier: 'BRONZE', // 신규 주식은 Bronze 티어
        shareholderCount: 0,
        transactionCount: 0
      }, { transaction: t });
    }

    await t.commit();

    // 주가 계산 서비스 호출 (비동기)
    stockPriceService.calculateStockPrice(userId).catch(console.error);

    // 실시간 알림 브로드캐스트
    try {
      const io = getIO();
      const user = await User.findByPk(userId, {
        attributes: ['id', 'username', 'displayName', 'profileImage']
      });

      io.emit('stock:new', {
        stockId: stock.id,
        userId: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        profileImage: user.profileImage,
        sharePrice: stock.sharePrice,
        totalShares: stock.totalShares,
        dividendRate: stock.dividendRate,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('신규 상장 알림 브로드캐스트 오류:', err);
    }

    res.json({
      message: '주식 발행에 성공했습니다',
      stock: {
        id: stock.id,
        userId: stock.userId,
        sharePrice: stock.sharePrice,
        totalShares: stock.totalShares,
        availableShares: stock.availableShares,
        initialOffering: initialOffering,
        dividendRate: stock.dividendRate,
        marketCap: stock.sharePrice * stock.totalShares,
        initialOfferingValue: stock.sharePrice * initialOffering
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('주식 발행 오류:', error);
    res.status(500).json({ error: '주식 발행 중 오류가 발생했습니다' });
  }
};

/**
 * 호가창 데이터 조회 (실제 주문 기반)
 */
/**
 * 호가창 조회.
 * 집계 로직은 services/orderBookService 에 있다 (소켓 브로드캐스트와 동일한 결과를 쓰기 위함).
 */
exports.getOrderBook = async (req, res) => {
  try {
    const { stockId } = req.params;

    if (!isValidUUID(stockId)) {
      return res.status(400).json({ error: '유효하지 않은 주식 ID입니다' });
    }

    const book = await buildOrderBook(stockId);
    if (!book) {
      return res.status(404).json({ error: '주식을 찾을 수 없습니다' });
    }

    res.json(book);
  } catch (error) {
    console.error('호가창 조회 오류:', error);
    res.status(500).json({ error: '호가창 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 체결 경로 미리보기.
 *
 * 매수/매도 버튼을 누르기 전에 "발행시장과 호가창 중 어디서 체결되는지"를 알려준다.
 * 프론트는 route 값에 따라 호출할 API 를 고른다.
 *   secondary → stockOrders(시장가)   primary → buyStock/sellStock
 */
exports.getExecutionQuote = async (req, res) => {
  try {
    const { stockId } = req.params;

    if (!isValidUUID(stockId)) {
      return res.status(400).json({ error: '유효하지 않은 주식 ID입니다' });
    }

    const side = req.query.side === 'sell' ? 'sell' : 'buy';
    const quantity = validatePositiveInt(req.query.quantity, {
      min: 1,
      max: 1000000,
      defaultValue: null,
    });

    if (quantity === null) {
      return res.status(400).json({ error: '유효하지 않은 수량입니다' });
    }

    const plan = await planExecution(stockId, side, quantity);
    if (!plan) {
      return res.status(404).json({ error: '주식을 찾을 수 없습니다' });
    }

    res.json(plan);
  } catch (error) {
    console.error('체결 경로 조회 오류:', error);
    res.status(500).json({ error: '체결 경로 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 최근 체결 내역 (Time & Sales).
 */
exports.getRecentTrades = async (req, res) => {
  try {
    const { stockId } = req.params;

    if (!isValidUUID(stockId)) {
      return res.status(400).json({ error: '유효하지 않은 주식 ID입니다' });
    }

    const parsed = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsed) ? Math.max(1, Math.min(parsed, 100)) : 50;

    const trades = await StockTrade.findAll({
      where: { stockId },
      attributes: ['id', 'quantity', 'pricePerShare', 'totalAmount', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit,
    });

    // 직전 체결가와 비교해 상승/하락 체결을 구분한다 (호가창 옆 체결 목록의 색 구분용)
    const rows = trades.map((t) => ({
      id: t.id,
      quantity: t.quantity,
      price: Math.round(parseFloat(t.pricePerShare)),
      totalAmount: parseFloat(t.totalAmount),
      timestamp: t.createdAt,
    }));

    for (let i = 0; i < rows.length; i += 1) {
      const older = rows[i + 1];
      rows[i].direction = !older
        ? 'flat'
        : rows[i].price > older.price
          ? 'up'
          : rows[i].price < older.price
            ? 'down'
            : 'flat';
    }

    res.json({ trades: rows, count: rows.length });
  } catch (error) {
    console.error('체결 내역 조회 오류:', error);
    res.status(500).json({ error: '체결 내역 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 주식 상세 통계 조회 (시가, 고가, 저가, 거래량)
 */
exports.getStockStats = async (req, res) => {
  try {
    const { stockId } = req.params;

    // UUID 형식 검증
    if (!isValidUUID(stockId)) {
      return res.status(400).json({ error: '유효하지 않은 주식 ID입니다' });
    }

    const stock = await Stock.findByPk(stockId, {
      include: [{
        model: User,
        as: 'issuer',
        attributes: ['id', 'username', 'displayName', 'profileImage']
      }]
    });

    if (!stock) {
      return res.status(404).json({ error: '주식을 찾을 수 없습니다' });
    }

    // 오늘 시작 시간
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 오늘의 가격 히스토리 조회
    const todayHistory = await PriceHistory.findAll({
      where: {
        stockId,
        timestamp: { [Op.gte]: todayStart }
      },
      order: [['timestamp', 'ASC']]
    });

    // 52주 전 날짜
    const week52Ago = new Date();
    week52Ago.setDate(week52Ago.getDate() - 365);

    // 52주간 가격 히스토리 조회
    const yearHistory = await PriceHistory.findAll({
      where: {
        stockId,
        timestamp: { [Op.gte]: week52Ago }
      },
      attributes: [
        [sequelize.fn('MAX', sequelize.col('high')), 'maxHigh'],
        [sequelize.fn('MIN', sequelize.col('low')), 'minLow']
      ]
    });

    // 오늘 거래량 조회
    const todayVolume = await Transaction.sum('shares', {
      where: {
        stockId,
        createdAt: { [Op.gte]: todayStart }
      }
    });

    // 오늘 거래대금 조회
    const todayTurnover = await Transaction.sum('totalAmount', {
      where: {
        stockId,
        createdAt: { [Op.gte]: todayStart }
      }
    });

    // 시가, 고가, 저가 계산
    let openPrice = stock.sharePrice;
    let highPrice = stock.sharePrice;
    let lowPrice = stock.sharePrice;
    let previousClose = stock.sharePrice;

    if (todayHistory.length > 0) {
      openPrice = parseFloat(todayHistory[0].open);
      highPrice = Math.max(...todayHistory.map(h => parseFloat(h.high)));
      lowPrice = Math.min(...todayHistory.map(h => parseFloat(h.low)));
    }

    // 전일 종가 조회
    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayHistory = await PriceHistory.findOne({
      where: {
        stockId,
        timestamp: { [Op.lt]: todayStart, [Op.gte]: yesterday }
      },
      order: [['timestamp', 'DESC']]
    });

    if (yesterdayHistory) {
      previousClose = parseFloat(yesterdayHistory.close);
    }

    // 52주 고가/저가
    const week52High = yearHistory[0]?.dataValues?.maxHigh || stock.sharePrice;
    const week52Low = yearHistory[0]?.dataValues?.minLow || stock.sharePrice;

    // 변동 금액 계산
    const priceChange = stock.sharePrice - previousClose;
    const priceChangePercent = previousClose > 0
      ? ((priceChange / previousClose) * 100).toFixed(2)
      : 0;

    res.json({
      stockId: stock.id,
      currentPrice: stock.sharePrice,
      previousClose,
      priceChange,
      priceChangePercent: parseFloat(priceChangePercent),
      openPrice,
      highPrice,
      lowPrice,
      week52High: parseFloat(week52High),
      week52Low: parseFloat(week52Low),
      volume: todayVolume || 0,
      turnover: todayTurnover || 0,
      marketCap: stock.marketCapTotal || 0,
      issuedShares: stock.issuedShares,
      totalShares: stock.totalShares,
      dividendRate: stock.dividendRate,
      issuer: stock.issuer
    });
  } catch (error) {
    console.error('주식 통계 조회 오류:', error);
    res.status(500).json({ error: '주식 통계 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 실시간 차트 데이터 조회 (전체 주식 시장 트렌드)
 */
exports.getMarketChartData = async (req, res) => {
  try {
    // 입력 검증
    const timeframe = ['1d', '7d', '30d'].includes(req.query.timeframe)
      ? req.query.timeframe
      : '1d';
    const { limit } = validatePagination({ limit: req.query.limit || 24 });

    // 시간대별로 전체 시장의 평균 가격 변화 계산
    let timeframeHours = 24;
    if (timeframe === '7d') timeframeHours = 24 * 7;
    else if (timeframe === '30d') timeframeHours = 24 * 30;

    const sinceDate = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);

    // 가격 히스토리 데이터 조회
    const priceHistory = await PriceHistory.findAll({
      where: {
        timestamp: { [Op.gte]: sinceDate }
      },
      order: [['timestamp', 'ASC']],
      limit
    });

    // 시간대별로 그룹화하여 평균 계산
    const chartData = [];
    const groupedByTime = {};

    priceHistory.forEach(record => {
      const timeKey = record.timestamp.toISOString();
      if (!groupedByTime[timeKey]) {
        groupedByTime[timeKey] = {
          timestamp: record.timestamp,
          prices: [],
          volumes: []
        };
      }
      groupedByTime[timeKey].prices.push(record.close);
      groupedByTime[timeKey].volumes.push(record.volume);
    });

    // 평균 계산
    Object.values(groupedByTime).forEach(group => {
      const avgPrice = group.prices.reduce((a, b) => a + b, 0) / group.prices.length;
      const totalVolume = group.volumes.reduce((a, b) => a + b, 0);

      chartData.push({
        timestamp: group.timestamp,
        price: parseFloat(avgPrice.toFixed(2)),
        volume: totalVolume
      });
    });

    // 현재 전체 시장 통계
    const totalMarketCap = await Stock.sum('marketCapTotal');
    const avgChange = await Stock.findOne({
      attributes: [
        [sequelize.fn('AVG', sequelize.col('price_change_percent')), 'avgChange'],
        [sequelize.fn('AVG', sequelize.col('share_price')), 'avgPrice']
      ]
    });

    // 최근 24시간 거래대금 계산
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const totalVolume = await Transaction.sum('totalAmount', {
      where: {
        createdAt: { [Op.gte]: last24Hours }
      }
    });

    // 현재가 (시장 평균 주가)
    const currentPrice = parseFloat(avgChange?.dataValues?.avgPrice || 0);

    // 이전 데이터와 비교하여 등락 계산 (chartData가 있는 경우)
    let priceChange = 0;
    if (chartData.length >= 2) {
      const latestPrice = chartData[chartData.length - 1].price;
      const previousPrice = chartData[0].price;
      if (previousPrice > 0) {
        priceChange = ((latestPrice - previousPrice) / previousPrice) * 100;
      }
    }

    res.json({
      chartData,
      marketStats: {
        totalMarketCap: totalMarketCap || 0,
        currentPrice: currentPrice.toFixed(2),
        avgPriceChange: parseFloat(avgChange?.dataValues?.avgChange || 0).toFixed(2),
        priceChangePercent: priceChange.toFixed(2),
        totalVolume: totalVolume || 0,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('차트 데이터 조회 오류:', error);
    res.status(500).json({ error: '차트 데이터 조회 중 오류가 발생했습니다' });
  }
};
