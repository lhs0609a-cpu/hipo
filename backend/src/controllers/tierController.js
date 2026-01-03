const tierService = require('../services/tierService');

/**
 * 모든 티어 정보 조회
 */
exports.getAllTiers = async (req, res) => {
  try {
    const tiers = tierService.getAllTiers();
    res.json({
      success: true,
      tiers
    });
  } catch (error) {
    console.error('Get all tiers error:', error);
    res.status(500).json({
      success: false,
      message: '티어 정보 조회에 실패했습니다.',
      error: error.message
    });
  }
};

/**
 * 티어별 통계 조회
 */
exports.getTierStatistics = async (req, res) => {
  try {
    const statistics = await tierService.getTierStatistics();
    res.json({
      success: true,
      statistics
    });
  } catch (error) {
    console.error('Get tier statistics error:', error);
    res.status(500).json({
      success: false,
      message: '티어 통계 조회에 실패했습니다.',
      error: error.message
    });
  }
};

/**
 * 티어별 주식 목록 조회
 */
exports.getStocksByTier = async (req, res) => {
  try {
    const { tier } = req.params;
    const { page = 1, limit = 20, sortBy = 'tierScore', sortOrder = 'DESC' } = req.query;

    // 티어 유효성 검사
    if (tier && !tierService.TIER_ORDER.includes(tier.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 티어입니다.'
      });
    }

    const result = await tierService.getStocksByTier(tier?.toUpperCase(), {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder: sortOrder.toUpperCase()
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get stocks by tier error:', error);
    res.status(500).json({
      success: false,
      message: '티어별 주식 조회에 실패했습니다.',
      error: error.message
    });
  }
};

/**
 * 주식의 티어 상세 정보 조회
 */
exports.getStockTierDetail = async (req, res) => {
  try {
    const { stockId } = req.params;

    const result = await tierService.getStockTierDetail(stockId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Get stock tier detail error:', error);
    res.status(500).json({
      success: false,
      message: '티어 상세 조회에 실패했습니다.',
      error: error.message
    });
  }
};

/**
 * 티어 랭킹 조회
 */
exports.getTierRanking = async (req, res) => {
  try {
    const { tier, limit = 50 } = req.query;

    const ranking = await tierService.getTierRanking({
      tier: tier?.toUpperCase(),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      ranking
    });
  } catch (error) {
    console.error('Get tier ranking error:', error);
    res.status(500).json({
      success: false,
      message: '티어 랭킹 조회에 실패했습니다.',
      error: error.message
    });
  }
};

/**
 * 내 주식의 티어 정보 조회
 */
exports.getMyTierInfo = async (req, res) => {
  try {
    const userId = req.user.id;

    // 사용자의 주식 찾기
    const { Stock } = require('../models');
    const stock = await Stock.findOne({ where: { userId } });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: '상장된 주식이 없습니다.'
      });
    }

    const result = await tierService.getStockTierDetail(stock.id);
    res.json(result);
  } catch (error) {
    console.error('Get my tier info error:', error);
    res.status(500).json({
      success: false,
      message: '내 티어 정보 조회에 실패했습니다.',
      error: error.message
    });
  }
};

/**
 * 티어 업데이트 요청 (수동)
 */
exports.requestTierUpdate = async (req, res) => {
  try {
    const userId = req.user.id;

    const { Stock } = require('../models');
    const stock = await Stock.findOne({ where: { userId } });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: '상장된 주식이 없습니다.'
      });
    }

    // 마지막 업데이트로부터 24시간 체크
    const lastUpdate = stock.tierUpdatedAt;
    if (lastUpdate) {
      const hoursSinceUpdate = (Date.now() - new Date(lastUpdate)) / (1000 * 60 * 60);
      if (hoursSinceUpdate < 24) {
        return res.status(429).json({
          success: false,
          message: '티어 업데이트는 24시간에 한 번만 가능합니다.',
          nextUpdateAt: new Date(new Date(lastUpdate).getTime() + 24 * 60 * 60 * 1000)
        });
      }
    }

    const result = await tierService.updateStockTier(stock.id);

    res.json({
      success: true,
      message: result.tierChanged
        ? `티어가 ${result.oldTier}에서 ${result.newTier}로 변경되었습니다!`
        : '현재 티어가 유지됩니다.',
      ...result
    });
  } catch (error) {
    console.error('Request tier update error:', error);
    res.status(500).json({
      success: false,
      message: '티어 업데이트에 실패했습니다.',
      error: error.message
    });
  }
};

/**
 * 모든 주식 티어 일괄 업데이트 (관리자)
 */
exports.updateAllTiers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '관리자 권한이 필요합니다.'
      });
    }

    const results = await tierService.updateAllTiers();

    res.json({
      success: true,
      message: '전체 티어 업데이트가 완료되었습니다.',
      results
    });
  } catch (error) {
    console.error('Update all tiers error:', error);
    res.status(500).json({
      success: false,
      message: '전체 티어 업데이트에 실패했습니다.',
      error: error.message
    });
  }
};

/**
 * 다음 티어까지 진행률 조회
 */
exports.getNextTierProgress = async (req, res) => {
  try {
    const { stockId } = req.params;

    const { Stock } = require('../models');
    const stock = await Stock.findByPk(stockId);

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: '주식을 찾을 수 없습니다.'
      });
    }

    const progress = tierService.getNextTierProgress(stock.tier, stock.tierScore);

    res.json({
      success: true,
      progress
    });
  } catch (error) {
    console.error('Get next tier progress error:', error);
    res.status(500).json({
      success: false,
      message: '진행률 조회에 실패했습니다.',
      error: error.message
    });
  }
};

/**
 * 티어 혜택 정보 조회
 */
exports.getTierBenefits = async (req, res) => {
  try {
    const { tier } = req.params;

    if (!tierService.TIER_ORDER.includes(tier.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 티어입니다.'
      });
    }

    const tierInfo = tierService.getTierInfo(tier.toUpperCase());

    res.json({
      success: true,
      tier: tier.toUpperCase(),
      ...tierInfo
    });
  } catch (error) {
    console.error('Get tier benefits error:', error);
    res.status(500).json({
      success: false,
      message: '티어 혜택 조회에 실패했습니다.',
      error: error.message
    });
  }
};
