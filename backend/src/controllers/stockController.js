const { User, Stock, Holding, Transaction, PriceHistory, Wallet, sequelize } = require('../models');
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

/**
 * 주식 목록 조회
 */
exports.getStocks = async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = 'marketCap' } = req.query;
    const offset = (page - 1) * limit;

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
      limit: parseInt(limit),
      offset: parseInt(offset)
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
        page: parseInt(page),
        limit: parseInt(limit),
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
 * 주식 상세 조회
 */
exports.getStockDetail = async (req, res) => {
  try {
    const { stockId } = req.params;

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

    res.json({
      stock,
      recentTrades,
      holderCount
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
    const { stockId, shares } = req.body;
    const buyerId = req.user.id;

    // 입력 검증
    if (!stockId || !shares || shares <= 0) {
      await t.rollback();
      return res.status(400).json({ error: '유효하지 않은 입력입니다' });
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

    // 구매자 정보
    const buyer = await User.findByPk(buyerId, { transaction: t });
    const totalCost = stock.sharePrice * shares;

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

    // PO 차감 (User 모델)
    await buyer.update(
      { poBalance: buyer.poBalance - totalCost },
      { transaction: t }
    );

    // PO 차감 (Wallet 모델)
    const buyerWallet = await Wallet.findOne({
      where: { userId: buyerId },
      transaction: t
    });

    if (buyerWallet) {
      await buyerWallet.update({
        poBalance: parseFloat(buyerWallet.poBalance) - totalCost,
        totalPOSpent: parseFloat(buyerWallet.totalPOSpent) + totalCost
      }, { transaction: t });
    }

    // 크리에이터에게 PO 지급 (User 모델)
    const creator = await User.findByPk(stock.userId, { transaction: t });
    await creator.update(
      { poBalance: creator.poBalance + totalCost },
      { transaction: t }
    );

    // 크리에이터에게 PO 지급 (Wallet 모델)
    const creatorWallet = await Wallet.findOne({
      where: { userId: stock.userId },
      transaction: t
    });

    if (creatorWallet) {
      await creatorWallet.update({
        poBalance: parseFloat(creatorWallet.poBalance) + totalCost,
        totalPOEarned: parseFloat(creatorWallet.totalPOEarned) + totalCost
      }, { transaction: t });
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

    await t.commit();

    // 주가 재계산 (비동기)
    stockPriceService.calculateStockPrice(stock.userId).catch(console.error);

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
    const { stockId, shares } = req.body;
    const sellerId = req.user.id;

    if (!stockId || !shares || shares <= 0) {
      await t.rollback();
      return res.status(400).json({ error: '유효하지 않은 입력입니다' });
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

    // 판매자 정보
    const seller = await User.findByPk(sellerId, { transaction: t });

    // PO 지급 (User 모델)
    await seller.update(
      { poBalance: seller.poBalance + totalRevenue },
      { transaction: t }
    );

    // PO 지급 (Wallet 모델)
    const sellerWallet = await Wallet.findOne({
      where: { userId: sellerId },
      transaction: t
    });

    if (sellerWallet) {
      await sellerWallet.update({
        poBalance: parseFloat(sellerWallet.poBalance) + totalRevenue
      }, { transaction: t });
    }

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

    await t.commit();

    // 주가 재계산 (비동기)
    stockPriceService.calculateStockPrice(stock.userId).catch(console.error);

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
      where: { issuerId: userId }
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
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

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
      limit: parseInt(limit),
      offset: parseInt(offset)
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
        page: parseInt(page),
        limit: parseInt(limit),
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
    const { timeframe = '1d', limit = 100 } = req.query;

    const history = await PriceHistory.findAll({
      where: {
        stockId,
        timeframe
      },
      order: [['timestamp', 'ASC']],
      limit: parseInt(limit)
    });

    if (history.length === 0) {
      return res.json({ history: [], indicators: {} });
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
    const { days = 90 } = req.body;

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
    const { initialPrice, totalShares, initialOffering, dividendRate } = req.body;
    const userId = req.user.id;

    // 입력 검증
    if (!initialPrice || !totalShares || !initialOffering || dividendRate === undefined) {
      await t.rollback();
      return res.status(400).json({ error: '필수 항목을 모두 입력해주세요' });
    }

    if (initialPrice < 1) {
      await t.rollback();
      return res.status(400).json({ error: '주가는 1 PO 이상이어야 합니다' });
    }

    if (totalShares < 1) {
      await t.rollback();
      return res.status(400).json({ error: '발행 주식은 1주 이상이어야 합니다' });
    }

    if (initialOffering < 1 || initialOffering > totalShares) {
      await t.rollback();
      return res.status(400).json({ error: '초기 공모 수량은 1주 이상, 총 발행량 이하여야 합니다' });
    }

    if (dividendRate < 0 || dividendRate > 100) {
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
 * 실시간 차트 데이터 조회 (전체 주식 시장 트렌드)
 */
exports.getMarketChartData = async (req, res) => {
  try {
    const { timeframe = '1d', limit = 24 } = req.query;

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
      limit: parseInt(limit)
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
