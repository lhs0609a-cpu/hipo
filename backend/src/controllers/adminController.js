const {
  User,
  Stock,
  StockTransaction,
  Wallet,
  CoinTransaction,
  Post,
  Comment,
  SuspiciousActivity
} = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

// 봇 의심 계정 목록 조회
exports.getSuspiciousAccounts = async (req, res) => {
  try {
    const { page = 1, limit = 20, minScore = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: users } = await User.findAndCountAll({
      where: {
        botSuspicionScore: {
          [Op.gte]: minScore
        }
      },
      attributes: [
        'id',
        'username',
        'email',
        'botSuspicionScore',
        'isVerified',
        'createdAt',
        'lastLoginAt',
        'poBalance'
      ],
      order: [['botSuspicionScore', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // 각 사용자의 최근 활동 조회
    const usersWithActivity = await Promise.all(
      users.map(async (user) => {
        const recentPosts = await Post.count({
          where: {
            userId: user.id,
            createdAt: {
              [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // 최근 24시간
            }
          }
        });

        const recentComments = await Comment.count({
          where: {
            userId: user.id,
            createdAt: {
              [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        });

        return {
          ...user.toJSON(),
          recentActivity: {
            posts24h: recentPosts,
            comments24h: recentComments
          }
        };
      })
    );

    res.json({
      success: true,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
      users: usersWithActivity
    });
  } catch (error) {
    console.error('봇 의심 계정 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '봇 의심 계정 조회에 실패했습니다',
      error: error.message
    });
  }
};

// 사용자 통계
exports.getUserStats = async (req, res) => {
  try {
    // 전체 사용자 수
    const totalUsers = await User.count();

    // 오늘 가입한 사용자
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayUsers = await User.count({
      where: {
        createdAt: {
          [Op.gte]: today
        }
      }
    });

    // 이번 주 가입한 사용자
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekUsers = await User.count({
      where: {
        createdAt: {
          [Op.gte]: weekAgo
        }
      }
    });

    // 이번 달 가입한 사용자
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthUsers = await User.count({
      where: {
        createdAt: {
          [Op.gte]: monthAgo
        }
      }
    });

    // 활성 사용자 (최근 7일 로그인)
    const activeUsers = await User.count({
      where: {
        lastLoginAt: {
          [Op.gte]: weekAgo
        }
      }
    });

    // 신뢰도 등급별 사용자 수
    const usersByTrustLevel = await User.findAll({
      attributes: [
        'trustLevel',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['trustLevel']
    });

    const trustLevelDistribution = {};
    usersByTrustLevel.forEach(item => {
      trustLevelDistribution[item.trustLevel] = parseInt(item.dataValues.count);
    });

    // 인증된 사용자 수
    const verifiedUsers = await User.count({
      where: { isVerified: true }
    });

    // 크리에이터 수
    const creators = await User.count({
      where: { isCreator: true }
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        todayUsers,
        weekUsers,
        monthUsers,
        activeUsers,
        verifiedUsers,
        creators,
        trustLevelDistribution,
        activityRate: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('사용자 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 통계 조회에 실패했습니다',
      error: error.message
    });
  }
};

// 거래 통계
exports.getTransactionStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // 오늘 거래 수
    const todayTransactions = await StockTransaction.count({
      where: {
        createdAt: {
          [Op.gte]: today
        }
      }
    });

    // 오늘 거래량 (PO)
    const todayVolume = await StockTransaction.sum('totalAmount', {
      where: {
        createdAt: {
          [Op.gte]: today
        }
      }
    }) || 0;

    // 이번 주 거래 통계
    const weekTransactions = await StockTransaction.count({
      where: {
        createdAt: {
          [Op.gte]: weekAgo
        }
      }
    });

    const weekVolume = await StockTransaction.sum('totalAmount', {
      where: {
        createdAt: {
          [Op.gte]: weekAgo
        }
      }
    }) || 0;

    // 매수/매도 비율
    const buyCount = await StockTransaction.count({
      where: {
        type: 'BUY',
        createdAt: {
          [Op.gte]: weekAgo
        }
      }
    });

    const sellCount = await StockTransaction.count({
      where: {
        type: 'SELL',
        createdAt: {
          [Op.gte]: weekAgo
        }
      }
    });

    // 가장 활발한 주식 Top 5
    const topStocks = await StockTransaction.findAll({
      attributes: [
        'stockId',
        [sequelize.fn('COUNT', sequelize.col('StockTransaction.id')), 'transactionCount'],
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity']
      ],
      where: {
        createdAt: {
          [Op.gte]: weekAgo
        }
      },
      include: [{
        model: Stock,
        as: 'stock',
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'displayName']
        }]
      }],
      group: ['stockId'],
      order: [[sequelize.fn('COUNT', sequelize.col('StockTransaction.id')), 'DESC']],
      limit: 5
    });

    res.json({
      success: true,
      stats: {
        today: {
          transactions: todayTransactions,
          volume: todayVolume
        },
        week: {
          transactions: weekTransactions,
          volume: weekVolume,
          buyCount,
          sellCount,
          buySellRatio: sellCount > 0 ? (buyCount / sellCount).toFixed(2) : buyCount
        },
        topStocks: topStocks.map(item => ({
          stockId: item.stockId,
          creator: item.stock?.creator,
          transactionCount: parseInt(item.dataValues.transactionCount),
          totalQuantity: parseInt(item.dataValues.totalQuantity)
        }))
      }
    });
  } catch (error) {
    console.error('거래 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '거래 통계 조회에 실패했습니다',
      error: error.message
    });
  }
};

// PO 코인 통계
exports.getCoinStats = async (req, res) => {
  try {
    // 전체 PO 발행량
    const totalPO = await Wallet.sum('poBalance') || 0;

    // 오늘 지급된 PO
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEarned = await CoinTransaction.sum('amount', {
      where: {
        transactionType: 'EARN',
        createdAt: {
          [Op.gte]: today
        }
      }
    }) || 0;

    // 오늘 사용된 PO
    const todaySpent = await CoinTransaction.sum('amount', {
      where: {
        transactionType: 'SPEND',
        createdAt: {
          [Op.gte]: today
        },
        amount: {
          [Op.lt]: 0
        }
      }
    }) || 0;

    // 오늘 지급된 배당
    const todayDividends = await Wallet.sum('todayDividendReceived') || 0;

    // PO 획득 소스별 통계 (최근 7일)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const sourceStats = await CoinTransaction.findAll({
      attributes: [
        'source',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount']
      ],
      where: {
        transactionType: 'EARN',
        createdAt: {
          [Op.gte]: weekAgo
        }
      },
      group: ['source'],
      order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      stats: {
        totalPO: parseFloat(totalPO),
        today: {
          earned: parseFloat(todayEarned),
          spent: Math.abs(parseFloat(todaySpent)),
          dividends: parseFloat(todayDividends),
          net: parseFloat(todayEarned) + parseFloat(todaySpent)
        },
        topSources: sourceStats.map(item => ({
          source: item.source,
          count: parseInt(item.dataValues.count),
          totalAmount: parseFloat(item.dataValues.totalAmount)
        }))
      }
    });
  } catch (error) {
    console.error('PO 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: 'PO 통계 조회에 실패했습니다',
      error: error.message
    });
  }
};

// 시스템 상태
exports.getSystemStatus = async (req, res) => {
  try {
    // 데이터베이스 상태
    const dbStatus = await sequelize.authenticate()
      .then(() => 'connected')
      .catch(() => 'disconnected');

    // 총 데이터 건수
    const totalPosts = await Post.count();
    const totalComments = await Comment.count();
    const totalStocks = await Stock.count();

    // 서버 업타임
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    // 메모리 사용량
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
    const memoryTotalMB = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);

    res.json({
      success: true,
      status: {
        server: 'running',
        database: dbStatus,
        uptime: `${hours}h ${minutes}m`,
        memory: {
          used: `${memoryUsedMB} MB`,
          total: `${memoryTotalMB} MB`,
          percentage: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2)
        },
        dataCount: {
          posts: totalPosts,
          comments: totalComments,
          stocks: totalStocks
        },
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('시스템 상태 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '시스템 상태 조회에 실패했습니다',
      error: error.message
    });
  }
};

// 봇 의심 점수 초기화
exports.resetBotScore = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다'
      });
    }

    await user.update({ botSuspicionScore: 0 });

    res.json({
      success: true,
      message: '봇 의심 점수가 초기화되었습니다',
      user: {
        id: user.id,
        username: user.username,
        botSuspicionScore: user.botSuspicionScore
      }
    });
  } catch (error) {
    console.error('봇 점수 초기화 오류:', error);
    res.status(500).json({
      success: false,
      message: '봇 점수 초기화에 실패했습니다',
      error: error.message
    });
  }
};

// 사용자 차단
exports.banUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, duration } = req.body; // duration in days

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다'
      });
    }

    // 봇 점수를 최대로 설정하여 제재
    await user.update({
      botSuspicionScore: 100
    });

    res.json({
      success: true,
      message: `사용자가 차단되었습니다 (사유: ${reason})`,
      user: {
        id: user.id,
        username: user.username,
        botSuspicionScore: user.botSuspicionScore
      }
    });
  } catch (error) {
    console.error('사용자 차단 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 차단에 실패했습니다',
      error: error.message
    });
  }
};

// 시계열 데이터 - 사용자 가입 추이 (최근 30일)
exports.getUserGrowthChart = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    // 날짜별 신규 가입자 수
    const dailySignups = await User.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        createdAt: {
          [Op.gte]: daysAgo
        }
      },
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
    });

    // 모든 날짜에 대해 0으로 초기화
    const chartData = [];
    for (let i = parseInt(days) - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = dailySignups.find(d => d.dataValues.date === dateStr);
      chartData.push({
        date: dateStr,
        signups: dayData ? parseInt(dayData.dataValues.count) : 0
      });
    }

    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('사용자 증가 차트 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 증가 차트 조회에 실패했습니다',
      error: error.message
    });
  }
};

// 시계열 데이터 - 거래량 추이 (최근 30일)
exports.getTransactionVolumeChart = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    const dailyTransactions = await StockTransaction.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'volume']
      ],
      where: {
        createdAt: {
          [Op.gte]: daysAgo
        }
      },
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
    });

    const chartData = [];
    for (let i = parseInt(days) - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = dailyTransactions.find(d => d.dataValues.date === dateStr);
      chartData.push({
        date: dateStr,
        transactions: dayData ? parseInt(dayData.dataValues.count) : 0,
        volume: dayData ? parseFloat(dayData.dataValues.volume) : 0
      });
    }

    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('거래량 차트 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '거래량 차트 조회에 실패했습니다',
      error: error.message
    });
  }
};

// 시계열 데이터 - PO 발행/사용 추이 (최근 30일)
exports.getCoinFlowChart = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    // 일별 발행량 (EARN)
    const dailyEarned = await CoinTransaction.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'amount']
      ],
      where: {
        transactionType: 'EARN',
        createdAt: {
          [Op.gte]: daysAgo
        }
      },
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
    });

    // 일별 사용량 (SPEND)
    const dailySpent = await CoinTransaction.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'amount']
      ],
      where: {
        transactionType: 'SPEND',
        createdAt: {
          [Op.gte]: daysAgo
        }
      },
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
    });

    const chartData = [];
    for (let i = parseInt(days) - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const earnedData = dailyEarned.find(d => d.dataValues.date === dateStr);
      const spentData = dailySpent.find(d => d.dataValues.date === dateStr);

      chartData.push({
        date: dateStr,
        earned: earnedData ? parseFloat(earnedData.dataValues.amount) : 0,
        spent: spentData ? Math.abs(parseFloat(spentData.dataValues.amount)) : 0
      });
    }

    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('PO 흐름 차트 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: 'PO 흐름 차트 조회에 실패했습니다',
      error: error.message
    });
  }
};

// 활성 사용자 추이 (최근 30일)
exports.getActiveUsersChart = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const chartData = [];
    for (let i = parseInt(days) - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      // 해당 날짜에 로그인한 사용자 수
      const activeCount = await User.count({
        where: {
          lastLoginAt: {
            [Op.gte]: date,
            [Op.lt]: nextDay
          }
        }
      });

      chartData.push({
        date: dateStr,
        activeUsers: activeCount
      });
    }

    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('활성 사용자 차트 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '활성 사용자 차트 조회에 실패했습니다',
      error: error.message
    });
  }
};

module.exports = exports;
