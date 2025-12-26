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
