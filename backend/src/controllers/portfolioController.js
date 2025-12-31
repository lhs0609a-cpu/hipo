const { User, Stock, Holding, Transaction, Dividend, PriceHistory, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * 포트폴리오 요약
 */
exports.getPortfolioSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const holdings = await Holding.findAll({
      where: { holderId: userId },
      include: [{
        model: Stock,
        as: 'stock',
        include: [{ model: User, as: 'issuer', attributes: ['username', 'profileImage'] }]
      }]
    });

    let totalValue = 0;
    let totalCost = 0;
    let totalDividends = 0;

    const portfolioItems = holdings.map(holding => {
      const currentValue = holding.shares * holding.stock.sharePrice;
      const costBasis = holding.shares * holding.averagePrice;
      const profit = currentValue - costBasis;
      const profitPercent = costBasis > 0 ? ((profit / costBasis) * 100).toFixed(2) : 0;

      totalValue += currentValue;
      totalCost += costBasis;

      return {
        stockId: holding.stockId,
        creator: holding.stock.issuer,
        shares: holding.shares,
        averagePrice: holding.averagePrice,
        currentPrice: holding.stock.sharePrice,
        currentValue,
        costBasis,
        profit,
        profitPercent: parseFloat(profitPercent),
        priceChange: holding.stock.priceChangePercent,
        weight: 0 // 나중에 계산
      };
    });

    // 비중 계산
    portfolioItems.forEach(item => {
      item.weight = totalValue > 0 ? parseFloat(((item.currentValue / totalValue) * 100).toFixed(2)) : 0;
    });

    // 받은 배당금 총액
    const dividendSum = await Dividend.sum('amount', {
      where: { holderId: userId }
    });
    totalDividends = dividendSum || 0;

    const user = await User.findByPk(userId);
    const totalProfit = totalValue - totalCost;
    const totalProfitPercent = totalCost > 0 ? ((totalProfit / totalCost) * 100).toFixed(2) : 0;

    res.json({
      summary: {
        totalValue,
        totalCost,
        totalProfit,
        totalProfitPercent: parseFloat(totalProfitPercent),
        totalDividends,
        cashBalance: user.poBalance,
        totalAssets: totalValue + user.poBalance,
        holdingsCount: holdings.length
      },
      holdings: portfolioItems.sort((a, b) => b.currentValue - a.currentValue)
    });
  } catch (error) {
    console.error('포트폴리오 요약 오류:', error);
    res.status(500).json({ error: '조회 중 오류가 발생했습니다' });
  }
};

/**
 * 수익률 분석
 */
exports.getProfitAnalysis = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '30d' } = req.query;

    let startDate;
    switch (period) {
      case '7d': startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); break;
      case '1y': startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // 거래 내역 기반 실현 손익
    const buyTransactions = await Transaction.findAll({
      where: {
        buyerId: userId,
        createdAt: { [Op.gte]: startDate }
      },
      include: [{ model: Stock, as: 'stock' }]
    });

    const sellTransactions = await Transaction.findAll({
      where: {
        sellerId: userId,
        createdAt: { [Op.gte]: startDate }
      },
      include: [{ model: Stock, as: 'stock' }]
    });

    let totalBought = 0;
    let totalSold = 0;

    buyTransactions.forEach(tx => {
      totalBought += tx.totalAmount;
    });

    sellTransactions.forEach(tx => {
      totalSold += tx.totalAmount;
    });

    // 배당 수익
    const dividends = await Dividend.sum('amount', {
      where: {
        holderId: userId,
        createdAt: { [Op.gte]: startDate }
      }
    }) || 0;

    // 일별 자산 추이 (간단한 시뮬레이션)
    const dailyValues = [];
    const holdings = await Holding.findAll({
      where: { holderId: userId },
      include: [{ model: Stock, as: 'stock' }]
    });

    // 현재 보유 주식의 최근 가격 이력
    for (const holding of holdings) {
      const history = await PriceHistory.findAll({
        where: {
          stockId: holding.stockId,
          createdAt: { [Op.gte]: startDate }
        },
        order: [['createdAt', 'ASC']]
      });

      history.forEach(h => {
        const dateStr = h.createdAt.toISOString().split('T')[0];
        const existing = dailyValues.find(d => d.date === dateStr);
        const value = holding.shares * h.price;
        if (existing) {
          existing.value += value;
        } else {
          dailyValues.push({ date: dateStr, value });
        }
      });
    }

    dailyValues.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      period,
      realized: {
        totalBought,
        totalSold,
        netTrading: totalSold - totalBought,
        dividends,
        totalRealized: totalSold - totalBought + dividends
      },
      transactionCount: {
        buys: buyTransactions.length,
        sells: sellTransactions.length
      },
      dailyValues: dailyValues.slice(-30) // 최근 30일
    });
  } catch (error) {
    console.error('수익률 분석 오류:', error);
    res.status(500).json({ error: '분석 중 오류가 발생했습니다' });
  }
};

/**
 * 섹터별 분석
 */
exports.getSectorAnalysis = async (req, res) => {
  try {
    const userId = req.user.id;

    const holdings = await Holding.findAll({
      where: { holderId: userId },
      include: [{
        model: Stock,
        as: 'stock',
        include: [{ model: User, as: 'issuer' }]
      }]
    });

    const sectorData = {};
    let totalValue = 0;

    holdings.forEach(holding => {
      const sector = holding.stock.category || 'other';
      const value = holding.shares * holding.stock.sharePrice;
      totalValue += value;

      if (!sectorData[sector]) {
        sectorData[sector] = {
          name: sector,
          value: 0,
          count: 0,
          stocks: []
        };
      }

      sectorData[sector].value += value;
      sectorData[sector].count++;
      sectorData[sector].stocks.push({
        stockId: holding.stockId,
        creator: holding.stock.issuer.username,
        shares: holding.shares,
        value
      });
    });

    // 비중 계산
    const sectors = Object.values(sectorData).map(sector => ({
      ...sector,
      weight: totalValue > 0 ? parseFloat(((sector.value / totalValue) * 100).toFixed(2)) : 0
    }));

    sectors.sort((a, b) => b.value - a.value);

    const sectorLabels = {
      entertainment: '연예',
      sports: '스포츠',
      influencer: '인플루언서',
      business: '비즈니스',
      creator: '크리에이터',
      other: '기타'
    };

    res.json({
      totalValue,
      sectors: sectors.map(s => ({
        ...s,
        displayName: sectorLabels[s.name] || s.name
      }))
    });
  } catch (error) {
    console.error('섹터 분석 오류:', error);
    res.status(500).json({ error: '분석 중 오류가 발생했습니다' });
  }
};

/**
 * 거래 통계
 */
exports.getTradeStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'all' } = req.query;

    let startDate = new Date('2020-01-01');
    if (period !== 'all') {
      const days = parseInt(period.replace('d', ''));
      startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }

    const whereClause = {
      createdAt: { [Op.gte]: startDate }
    };

    const buyCount = await Transaction.count({
      where: { ...whereClause, buyerId: userId }
    });

    const sellCount = await Transaction.count({
      where: { ...whereClause, sellerId: userId }
    });

    const buyVolume = await Transaction.sum('totalAmount', {
      where: { ...whereClause, buyerId: userId }
    }) || 0;

    const sellVolume = await Transaction.sum('totalAmount', {
      where: { ...whereClause, sellerId: userId }
    }) || 0;

    // 가장 많이 거래한 주식
    const topTraded = await Transaction.findAll({
      attributes: [
        'stockId',
        [sequelize.fn('COUNT', sequelize.col('Transaction.id')), 'tradeCount'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'volume']
      ],
      where: {
        [Op.or]: [
          { buyerId: userId },
          { sellerId: userId }
        ],
        createdAt: { [Op.gte]: startDate }
      },
      include: [{
        model: Stock,
        as: 'stock',
        include: [{ model: User, as: 'issuer', attributes: ['username'] }]
      }],
      group: ['stockId'],
      order: [[sequelize.fn('COUNT', sequelize.col('Transaction.id')), 'DESC']],
      limit: 5
    });

    // 수익률 높은/낮은 거래
    const profitableHoldings = await Holding.findAll({
      where: { holderId: userId },
      include: [{ model: Stock, as: 'stock' }]
    });

    const profitRanking = profitableHoldings.map(h => {
      const profit = (h.stock.sharePrice - h.averagePrice) / h.averagePrice * 100;
      return {
        stockId: h.stockId,
        profitPercent: parseFloat(profit.toFixed(2))
      };
    }).sort((a, b) => b.profitPercent - a.profitPercent);

    res.json({
      period,
      summary: {
        totalTrades: buyCount + sellCount,
        buyCount,
        sellCount,
        buyVolume,
        sellVolume,
        netFlow: sellVolume - buyVolume
      },
      topTraded: topTraded.map(t => ({
        stockId: t.stockId,
        creator: t.stock?.issuer?.username,
        tradeCount: parseInt(t.dataValues.tradeCount),
        volume: parseFloat(t.dataValues.volume)
      })),
      profitRanking: {
        best: profitRanking.slice(0, 3),
        worst: profitRanking.slice(-3).reverse()
      }
    });
  } catch (error) {
    console.error('거래 통계 오류:', error);
    res.status(500).json({ error: '통계 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 배당 분석
 */
exports.getDividendAnalysis = async (req, res) => {
  try {
    const userId = req.user.id;

    // 총 배당금
    const totalDividends = await Dividend.sum('amount', {
      where: { holderId: userId }
    }) || 0;

    // 월별 배당금
    const monthlyDividends = await Dividend.findAll({
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'month'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      where: { holderId: userId },
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m')],
      order: [[sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'DESC']],
      limit: 12
    });

    // 주식별 배당금
    const dividendsByStock = await Dividend.findAll({
      attributes: [
        'stockId',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('Dividend.id')), 'count']
      ],
      where: { holderId: userId },
      include: [{
        model: Stock,
        as: 'stock',
        include: [{ model: User, as: 'issuer', attributes: ['username'] }]
      }],
      group: ['stockId'],
      order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']]
    });

    // 현재 예상 월 배당금
    const holdings = await Holding.findAll({
      where: { holderId: userId },
      include: [{ model: Stock, as: 'stock' }]
    });

    let estimatedMonthlyDividend = 0;
    holdings.forEach(h => {
      const stockValue = h.shares * h.stock.sharePrice;
      const dividendRate = h.stock.dividendRate / 100;
      // 월간 예상 (연 배당률 / 12)
      estimatedMonthlyDividend += (stockValue * dividendRate) / 12;
    });

    res.json({
      totalDividends,
      estimatedMonthlyDividend: Math.floor(estimatedMonthlyDividend),
      monthlyDividends: monthlyDividends.map(m => ({
        month: m.dataValues.month,
        total: parseFloat(m.dataValues.total)
      })),
      byStock: dividendsByStock.map(d => ({
        stockId: d.stockId,
        creator: d.stock?.issuer?.username,
        total: parseFloat(d.dataValues.total),
        count: parseInt(d.dataValues.count)
      }))
    });
  } catch (error) {
    console.error('배당 분석 오류:', error);
    res.status(500).json({ error: '분석 중 오류가 발생했습니다' });
  }
};

/**
 * 포트폴리오 리포트 생성
 */
exports.generateReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);

    const holdings = await Holding.findAll({
      where: { holderId: userId },
      include: [{
        model: Stock,
        as: 'stock',
        include: [{ model: User, as: 'issuer', attributes: ['username', 'profileImage'] }]
      }]
    });

    let totalValue = 0;
    let totalCost = 0;

    const portfolioItems = holdings.map(h => {
      const value = h.shares * h.stock.sharePrice;
      const cost = h.shares * h.averagePrice;
      totalValue += value;
      totalCost += cost;
      return {
        name: h.stock.issuer.username,
        shares: h.shares,
        avgPrice: h.averagePrice,
        currentPrice: h.stock.sharePrice,
        value,
        profit: value - cost,
        profitPercent: ((value - cost) / cost * 100).toFixed(2)
      };
    });

    const totalDividends = await Dividend.sum('amount', { where: { holderId: userId } }) || 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentBuys = await Transaction.count({
      where: { buyerId: userId, createdAt: { [Op.gte]: thirtyDaysAgo } }
    });
    const recentSells = await Transaction.count({
      where: { sellerId: userId, createdAt: { [Op.gte]: thirtyDaysAgo } }
    });

    res.json({
      generatedAt: new Date(),
      user: {
        username: user.username,
        trustLevel: user.trustLevel
      },
      summary: {
        totalValue,
        totalCost,
        totalProfit: totalValue - totalCost,
        profitPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost * 100).toFixed(2) : '0',
        totalDividends,
        cashBalance: user.poBalance,
        totalAssets: totalValue + user.poBalance
      },
      holdings: portfolioItems.sort((a, b) => b.value - a.value),
      activity: {
        last30Days: {
          buys: recentBuys,
          sells: recentSells
        }
      },
      recommendations: generateRecommendations(portfolioItems, totalValue)
    });
  } catch (error) {
    console.error('리포트 생성 오류:', error);
    res.status(500).json({ error: '리포트 생성 중 오류가 발생했습니다' });
  }
};

// 추천 생성 헬퍼 함수
function generateRecommendations(holdings, totalValue) {
  const recommendations = [];

  // 분산 투자 확인
  if (holdings.length < 3) {
    recommendations.push({
      type: 'diversification',
      message: '포트폴리오 분산을 위해 더 많은 종목에 투자하는 것을 권장합니다'
    });
  }

  // 과도한 집중 확인
  holdings.forEach(h => {
    const weight = totalValue > 0 ? (h.value / totalValue) * 100 : 0;
    if (weight > 50) {
      recommendations.push({
        type: 'concentration',
        message: `${h.name} 주식 비중이 ${weight.toFixed(1)}%로 높습니다. 분산 투자를 권장합니다`
      });
    }
  });

  // 손실 종목 확인
  const losers = holdings.filter(h => parseFloat(h.profitPercent) < -20);
  if (losers.length > 0) {
    recommendations.push({
      type: 'loss_management',
      message: `${losers.length}개 종목에서 20% 이상 손실 중입니다. 손절 전략을 검토해보세요`
    });
  }

  return recommendations;
}
