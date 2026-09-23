const tradingTransaction = require('../services/tradingTransaction');
const { changeBalance } = require('../services/poAccountService');
const { Wallet, Holding, Stock, User, Notification } = require('../models');
const { calculateTrustLevel } = require('./trustLevel');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const { sendDividendNotification } = require('../config/socket');

// 실시간 배당 지급 시스템
async function distributeDividends(creatorId, earnedPO, source, options = {}) {
  const transaction = await tradingTransaction();

  try {
    // 1. 크리에이터 정보 조회
    const creator = await User.findByPk(creatorId, { transaction });
    if (!creator) {
      await transaction.rollback();
      return { success: false, error: 'Creator not found' };
    }

    // 2. 신뢰도 등급별 배당률 계산
    const trustInfo = calculateTrustLevel(creator.marketCap);
    const dividendRate = trustInfo.dividendRate || 0.20; // 기본 20%

    // 3. 배당 풀 계산
    const dividendPool = Math.floor(earnedPO * dividendRate);
    const creatorKeeps = earnedPO - dividendPool;

    if (dividendPool <= 0) {
      await transaction.rollback();
      return {
        success: true,
        dividendPool: 0,
        shareholdersCount: 0,
        creatorKeeps: earnedPO
      };
    }

    // 4. 크리에이터 주식 조회
    const stock = await Stock.findOne({
      where: { userId: creatorId },
      transaction
    });

    if (!stock) {
      await transaction.rollback();
      return {
        success: true,
        dividendPool: 0,
        shareholdersCount: 0,
        creatorKeeps: earnedPO,
        reason: 'No stock issued'
      };
    }

    // 5. 모든 주주 조회
    const holdings = await Holding.findAll({
      where: { stockId: stock.id, holderId: { [Op.ne]: creatorId } },
      include: [{ model: User, as: 'holder' }],
      transaction
    });

    if (holdings.length === 0) {
      await transaction.rollback();
      return {
        success: true,
        dividendPool: 0,
        shareholdersCount: 0,
        creatorKeeps: earnedPO,
        reason: 'No shareholders'
      };
    }

    // 6. 총 발행 주식 수
    const totalShares = stock.totalShares || 100000;

    // 7. 각 주주에게 배당 지급
    const dividendRecords = [];
    let totalDividendPaid = 0;

    for (const holding of holdings) {
      // 지분율 계산
      const shareholdingRatio = holding.shares / totalShares;

      // 해당 주주의 배당액
      const dividendAmount = Math.floor(dividendPool * shareholdingRatio);

      if (dividendAmount > 0) {
        // 주주 지갑 조회/생성
        let shareholderWallet = await Wallet.findOne({
          where: { userId: holding.holderId },
          transaction
        });

        if (!shareholderWallet) {
          shareholderWallet = await Wallet.create({
            userId: holding.holderId,
            poBalance: 0
          }, { transaction });
        }

        const credited = await changeBalance(holding.holderId, dividendAmount, transaction, { source: 'STOCK_DIVIDEND', description: '활동 배당 수령' });
        await require('../models').Dividend.create({ stockId: stock.id, holderId: holding.holderId, amount: dividendAmount }, { transaction });
        // 배당 지급
        await shareholderWallet.update({
          poBalance: credited.balance,
          totalDividendReceived: parseFloat(shareholderWallet.totalDividendReceived) + dividendAmount,
          todayDividendReceived: parseFloat(shareholderWallet.todayDividendReceived) + dividendAmount
        }, { transaction });

        totalDividendPaid += dividendAmount;

        // 배당 기록
        dividendRecords.push({
          holderId: holding.holderId,
          holderName: holding.holder.username,
          shares: holding.shares,
          ratio: shareholdingRatio,
          dividendAmount
        });

        // 배당 알림 전송 (데이터베이스)
        await Notification.create({
          userId: holding.holderId,
          type: 'DIVIDEND_RECEIVED',
          title: '💰 배당 수령',
          message: `${creator.username}님의 활동으로 ${dividendAmount}PO 배당을 받으셨습니다`,
          relatedId: creatorId,
          data: {
            source,
            creatorName: creator.username,
            dividendAmount,
            shares: holding.shares,
            description: options.description
          }
        }, { transaction });

        // 실시간 배당 알림 전송 (Socket.IO)
        transaction.afterCommit(() => { try { sendDividendNotification(holding.holderId, {
          amount: dividendAmount,
          creatorId: creatorId,
          creatorName: creator.username,
          source: source
        }); } catch (error) { console.error(error.message); } });
      }
    }

    if (totalDividendPaid > 0) await changeBalance(creatorId, -totalDividendPaid, transaction);
    // 8. 크리에이터 지갑 업데이트 (배당 지급 기록)
    const creatorWallet = await Wallet.findOne({
      where: { userId: creatorId },
      transaction
    });

    if (creatorWallet) {
      await creatorWallet.update({
        totalDividendPaid: parseFloat(creatorWallet.totalDividendPaid) + totalDividendPaid
      }, { transaction });
    }

    await transaction.commit();

    return {
      success: true,
      dividendPool,
      totalDividendPaid,
      creatorKeeps: earnedPO - totalDividendPaid,
      shareholdersCount: dividendRecords.length,
      dividendRate,
      trustLevel: trustInfo.level,
      dividendRecords
    };

  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error('배당 지급 오류:', error);
    throw error;
  }
}

// 예상 배당 계산 (실제 지급 전 시뮬레이션)
async function calculateExpectedDividend(creatorId, shareholding) {
  try {
    const creator = await User.findByPk(creatorId);
    if (!creator) return { success: false, error: 'Creator not found' };

    const stock = await Stock.findOne({ where: { userId: creatorId } });
    if (!stock) return { success: false, error: 'No stock issued' };

    const trustInfo = calculateTrustLevel(creator.marketCap);
    const dividendRate = trustInfo.dividendRate || 0.20;

    // 크리에이터가 하루 평균 얼마를 버는지 (가정: 3,500 PO)
    const avgDailyEarnings = 3500;
    const dailyDividendPool = Math.floor(avgDailyEarnings * dividendRate);

    const totalShares = stock.totalShares || 100000;
    const shareholdingRatio = shareholding / totalShares;

    const expectedDailyDividend = Math.floor(dailyDividendPool * shareholdingRatio);
    const expectedMonthlyDividend = expectedDailyDividend * 30;
    const expectedYearlyDividend = expectedDailyDividend * 365;

    return {
      success: true,
      shareholding,
      shareholdingRatio: (shareholdingRatio * 100).toFixed(2) + '%',
      dividendRate: (dividendRate * 100) + '%',
      trustLevel: trustInfo.level,
      expectedDailyDividend,
      expectedMonthlyDividend,
      expectedYearlyDividend,
      estimatedROI: stock.currentPrice > 0
        ? ((expectedYearlyDividend / (stock.currentPrice * shareholding)) * 100).toFixed(2) + '%'
        : 'N/A'
    };

  } catch (error) {
    console.error('예상 배당 계산 오류:', error);
    throw error;
  }
}

// 주주 배당 히스토리 조회
async function getDividendHistory(userId, options = {}) {
  const { period = 'month', limit = 50 } = options;

  try {
    const wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet) {
      return {
        success: true,
        totalReceived: 0,
        todayReceived: 0,
        weekReceived: 0,
        monthReceived: 0,
        dividends: []
      };
    }

    // 기간별 배당 합계는 Notification 기록에서 계산
    const startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setDate(startDate.getDate() - 30);
    }

    const dividendNotifications = await Notification.findAll({
      where: {
        userId,
        type: 'DIVIDEND_RECEIVED',
        createdAt: { [Op.gte]: startDate }
      },
      order: [['createdAt', 'DESC']],
      limit
    });

    const dividends = dividendNotifications.map(n => ({
      creatorName: n.data?.creatorName,
      amount: n.data?.dividendAmount || 0,
      shares: n.data?.shares || 0,
      source: n.data?.source,
      description: n.data?.description,
      receivedAt: n.createdAt
    }));

    const periodTotal = dividends.reduce((sum, d) => sum + d.amount, 0);

    return {
      success: true,
      totalReceived: parseFloat(wallet.totalDividendReceived),
      todayReceived: parseFloat(wallet.todayDividendReceived),
      periodReceived: periodTotal,
      period,
      dividends
    };

  } catch (error) {
    console.error('배당 히스토리 조회 오류:', error);
    throw error;
  }
}

// 크리에이터 배당 지급 내역
async function getCreatorDividendStats(creatorId) {
  try {
    const wallet = await Wallet.findOne({ where: { userId: creatorId } });
    if (!wallet) {
      return {
        success: true,
        totalPaid: 0,
        shareholdersCount: 0,
        avgDividendPerDay: 0
      };
    }

    const stock = await Stock.findOne({ where: { userId: creatorId } });
    const shareholdersCount = stock ? await Holding.count({ where: { stockId: stock.id } }) : 0;

    // 최근 7일 평균 배당
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentDividendNotifications = await Notification.count({
      where: {
        relatedId: creatorId,
        type: 'DIVIDEND_RECEIVED',
        createdAt: { [Op.gte]: sevenDaysAgo }
      }
    });

    const avgDividendPerDay = Math.floor(recentDividendNotifications / 7);

    return {
      success: true,
      totalPaid: parseFloat(wallet.totalDividendPaid),
      shareholdersCount,
      avgDividendPerDay,
      totalEarned: parseFloat(wallet.totalPOEarned),
      dividendRate: shareholdersCount > 0
        ? ((parseFloat(wallet.totalDividendPaid) / parseFloat(wallet.totalPOEarned)) * 100).toFixed(1) + '%'
        : '0%'
    };

  } catch (error) {
    console.error('크리에이터 배당 통계 오류:', error);
    throw error;
  }
}

module.exports = {
  distributeDividends,
  calculateExpectedDividend,
  getDividendHistory,
  getCreatorDividendStats
};
