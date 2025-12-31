const {
  getDividendHistory,
  getCreatorDividendStats,
  calculateExpectedDividend
} = require('../utils/dividendCalculator');
const { Holding, Stock, User } = require('../models');

// 내 배당 히스토리 조회
exports.getMyDividendHistory = async (req, res) => {
  try {
    const { period = 'month', limit = 50 } = req.query;

    const result = await getDividendHistory(req.user.id, { period, limit: parseInt(limit) });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('배당 히스토리 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '배당 히스토리 조회에 실패했습니다',
      error: error.message
    });
  }
};

// 크리에이터의 배당 지급 통계
exports.getCreatorDividendStats = async (req, res) => {
  try {
    const { creatorId } = req.params;

    const result = await getCreatorDividendStats(creatorId);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('크리에이터 배당 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '크리에이터 배당 통계 조회에 실패했습니다',
      error: error.message
    });
  }
};

// 특정 크리에이터 주식의 예상 배당 계산
exports.calculateExpectedDividend = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { shareholding } = req.query;

    if (!shareholding) {
      return res.status(400).json({
        success: false,
        message: '보유 주식 수를 입력해주세요'
      });
    }

    const result = await calculateExpectedDividend(creatorId, parseInt(shareholding));

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('예상 배당 계산 오류:', error);
    res.status(500).json({
      success: false,
      message: '예상 배당 계산에 실패했습니다',
      error: error.message
    });
  }
};

// 내가 보유한 모든 주식의 예상 배당 조회
exports.getMyExpectedDividends = async (req, res) => {
  try {
    const holdings = await Holding.findAll({
      where: { holderId: req.user.id },
      include: [{
        model: Stock,
        as: 'stock',
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'displayName', 'profileImage', 'isCreator']
        }]
      }]
    });

    const expectedDividends = await Promise.all(
      holdings.map(async (holding) => {
        const result = await calculateExpectedDividend(
          holding.stock.userId,
          holding.quantity
        );

        return {
          stock: {
            id: holding.stock.id,
            userId: holding.stock.userId,
            currentPrice: holding.stock.currentPrice
          },
          creator: {
            id: holding.stock.creator.id,
            username: holding.stock.creator.username,
            displayName: holding.stock.creator.displayName,
            profileImage: holding.stock.creator.profileImage,
            trustLevel: result.trustLevel
          },
          quantity: holding.quantity,
          creatorId: holding.stock.userId,
          creatorName: holding.stock.creator.username,
          displayName: holding.stock.creator.displayName,
          profileImage: holding.stock.creator.profileImage,
          shareholding: holding.quantity,
          purchasePrice: holding.purchasePrice,
          currentPrice: holding.stock.currentPrice,
          totalInvestment: holding.quantity * holding.purchasePrice,
          currentValue: holding.quantity * holding.stock.currentPrice,
          profitLoss: (holding.stock.currentPrice - holding.purchasePrice) * holding.quantity,
          expectedDividend: result.expectedDailyDividend,
          dividendRate: result.dividendRate,
          ...result
        };
      })
    );

    // 일일 예상 배당 총합
    const totalDailyDividend = expectedDividends.reduce(
      (sum, div) => sum + (div.expectedDailyDividend || 0),
      0
    );

    // 월간 예상 배당 총합
    const totalMonthlyDividend = expectedDividends.reduce(
      (sum, div) => sum + (div.expectedMonthlyDividend || 0),
      0
    );

    // 연간 예상 배당 총합
    const totalYearlyDividend = expectedDividends.reduce(
      (sum, div) => sum + (div.expectedYearlyDividend || 0),
      0
    );

    res.json({
      success: true,
      totalHoldings: holdings.length,
      totalDailyDividend,
      totalMonthlyDividend,
      totalYearlyDividend,
      dividends: expectedDividends
    });
  } catch (error) {
    console.error('내 예상 배당 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '예상 배당 조회에 실패했습니다',
      error: error.message
    });
  }
};

// 크리에이터의 배당 대시보드 (본인만 조회 가능)
exports.getCreatorDividendDashboard = async (req, res) => {
  try {
    const creatorId = req.user.id;

    // 본인의 크리에이터 통계만 조회 가능
    const user = await User.findByPk(creatorId);
    if (!user || !user.isCreator) {
      return res.status(403).json({
        success: false,
        message: '크리에이터만 접근 가능합니다'
      });
    }

    const stats = await getCreatorDividendStats(creatorId);

    res.json({
      success: true,
      ...stats
    });
  } catch (error) {
    console.error('크리에이터 배당 대시보드 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '배당 대시보드 조회에 실패했습니다',
      error: error.message
    });
  }
};

// === 고급 배당 기능 ===
const { Dividend, sequelize } = require('../models');
const { Op } = require('sequelize');

// 배당 일정 조회
exports.getDividendSchedule = async (req, res) => {
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

    // 각 주식의 다음 배당 예정 정보
    const schedule = holdings.map(h => {
      const stock = h.stock;
      const dailyDividend = Math.floor(h.shares * stock.sharePrice * (stock.dividendRate / 100) / 365);

      return {
        stockId: stock.id,
        creator: stock.issuer,
        shares: h.shares,
        dividendRate: stock.dividendRate,
        estimatedDaily: dailyDividend,
        estimatedMonthly: dailyDividend * 30,
        nextPayment: getNextDividendDate(), // 매일 자정
        frequency: 'daily'
      };
    });

    const totalDaily = schedule.reduce((sum, s) => sum + s.estimatedDaily, 0);
    const totalMonthly = schedule.reduce((sum, s) => sum + s.estimatedMonthly, 0);

    res.json({
      success: true,
      totalEstimatedDaily: totalDaily,
      totalEstimatedMonthly: totalMonthly,
      schedule
    });
  } catch (error) {
    console.error('배당 일정 조회 오류:', error);
    res.status(500).json({ success: false, message: '배당 일정 조회 실패' });
  }
};

// 배당 재투자 설정
exports.setDividendReinvestment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stockId, enabled, percentage = 100 } = req.body;

    const holding = await Holding.findOne({
      where: { holderId: userId, stockId }
    });

    if (!holding) {
      return res.status(404).json({ success: false, message: '보유 주식을 찾을 수 없습니다' });
    }

    // 재투자 설정 저장 (Holding 모델에 필드 추가 필요)
    await holding.update({
      dividendReinvest: enabled,
      reinvestPercentage: percentage
    });

    res.json({
      success: true,
      message: enabled ? '배당 재투자가 설정되었습니다' : '배당 재투자가 해제되었습니다',
      reinvestPercentage: percentage
    });
  } catch (error) {
    console.error('배당 재투자 설정 오류:', error);
    res.status(500).json({ success: false, message: '설정 실패' });
  }
};

// 배당률 변경 (크리에이터용)
exports.updateDividendRate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { newRate } = req.body;

    if (newRate < 0 || newRate > 50) {
      return res.status(400).json({
        success: false,
        message: '배당률은 0~50% 사이여야 합니다'
      });
    }

    const stock = await Stock.findOne({ where: { userId } });
    if (!stock) {
      return res.status(404).json({ success: false, message: '발행한 주식이 없습니다' });
    }

    const oldRate = stock.dividendRate;
    await stock.update({ dividendRate: newRate });

    // 주주들에게 알림 발송 (Socket.io)
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      const holdings = await Holding.findAll({ where: { stockId: stock.id } });
      holdings.forEach(h => {
        io.to(`user:${h.holderId}`).emit('dividend:rate_changed', {
          stockId: stock.id,
          oldRate,
          newRate,
          message: `배당률이 ${oldRate}%에서 ${newRate}%로 변경되었습니다`
        });
      });
    } catch (err) {}

    res.json({
      success: true,
      message: '배당률이 변경되었습니다',
      oldRate,
      newRate
    });
  } catch (error) {
    console.error('배당률 변경 오류:', error);
    res.status(500).json({ success: false, message: '배당률 변경 실패' });
  }
};

// 특별 배당 지급 (크리에이터용)
exports.paySpecialDividend = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const { amount, reason } = req.body;

    const user = await User.findByPk(userId, { transaction: t });
    const stock = await Stock.findOne({ where: { userId }, transaction: t });

    if (!stock) {
      await t.rollback();
      return res.status(404).json({ success: false, message: '발행한 주식이 없습니다' });
    }

    // 특별 배당 총액 계산
    const holdings = await Holding.findAll({
      where: { stockId: stock.id },
      transaction: t
    });

    const totalShares = holdings.reduce((sum, h) => sum + h.shares, 0);
    const totalDividend = amount * totalShares;

    if (user.poBalance < totalDividend) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'PO가 부족합니다',
        required: totalDividend,
        available: user.poBalance
      });
    }

    // 각 주주에게 배당 지급
    for (const holding of holdings) {
      const dividendAmount = amount * holding.shares;

      await User.increment('poBalance', {
        by: dividendAmount,
        where: { id: holding.holderId },
        transaction: t
      });

      await Dividend.create({
        holderId: holding.holderId,
        stockId: stock.id,
        amount: dividendAmount,
        type: 'special',
        reason
      }, { transaction: t });
    }

    // 발행자 잔액 차감
    await user.update({ poBalance: user.poBalance - totalDividend }, { transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: '특별 배당이 지급되었습니다',
      totalPaid: totalDividend,
      recipientCount: holdings.length,
      amountPerShare: amount
    });
  } catch (error) {
    await t.rollback();
    console.error('특별 배당 지급 오류:', error);
    res.status(500).json({ success: false, message: '특별 배당 지급 실패' });
  }
};

// 배당 통계 (상세)
exports.getDetailedDividendStats = async (req, res) => {
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

    // 기간 내 배당금 합계
    const totalReceived = await Dividend.sum('amount', {
      where: {
        holderId: userId,
        createdAt: { [Op.gte]: startDate }
      }
    }) || 0;

    // 일별 배당금
    const dailyDividends = await Dividend.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      where: {
        holderId: userId,
        createdAt: { [Op.gte]: startDate }
      },
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']]
    });

    // 주식별 배당금
    const byStock = await Dividend.findAll({
      attributes: [
        'stockId',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      where: {
        holderId: userId,
        createdAt: { [Op.gte]: startDate }
      },
      include: [{
        model: Stock,
        as: 'stock',
        include: [{ model: User, as: 'issuer', attributes: ['username'] }]
      }],
      group: ['stockId']
    });

    res.json({
      success: true,
      period,
      totalReceived,
      averageDaily: dailyDividends.length > 0 ? totalReceived / dailyDividends.length : 0,
      dailyDividends: dailyDividends.map(d => ({
        date: d.dataValues.date,
        amount: parseFloat(d.dataValues.total)
      })),
      byStock: byStock.map(b => ({
        stockId: b.stockId,
        creator: b.stock?.issuer?.username,
        total: parseFloat(b.dataValues.total)
      }))
    });
  } catch (error) {
    console.error('배당 통계 조회 오류:', error);
    res.status(500).json({ success: false, message: '통계 조회 실패' });
  }
};

// 다음 배당 지급일 계산 헬퍼
function getNextDividendDate() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}
