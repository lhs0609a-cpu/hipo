/**
 * 상장 티어 등급 서비스
 *
 * 티어 시스템:
 * - BRONZE: 신규 상장 기본 등급
 * - SILVER: 성장 단계
 * - GOLD: 중견 크리에이터
 * - PLATINUM: 상위 크리에이터
 * - DIAMOND: 최상위 크리에이터
 * - MASTER: 엘리트 크리에이터
 * - LEGEND: 전설 크리에이터
 */

const { Stock, User, Transaction, Holding, sequelize } = require('../models');
const { Op } = require('sequelize');

// 티어 정의
const TIERS = {
  BRONZE: {
    name: 'BRONZE',
    displayName: '브론즈',
    color: '#CD7F32',
    icon: '🥉',
    minScore: 0,
    maxShares: 100000,        // 최대 발행 가능 주식
    tradingFeeRate: 0.003,    // 거래 수수료 0.3%
    dividendBonus: 0,         // 배당 보너스 없음
    exposureBoost: 1.0,       // 노출 가중치
    benefits: ['기본 상장 혜택']
  },
  SILVER: {
    name: 'SILVER',
    displayName: '실버',
    color: '#C0C0C0',
    icon: '🥈',
    minScore: 1000,
    maxShares: 200000,
    tradingFeeRate: 0.0028,
    dividendBonus: 0.02,      // 2% 배당 보너스
    exposureBoost: 1.2,
    benefits: ['기본 상장 혜택', '실버 배지', '주간 리포트']
  },
  GOLD: {
    name: 'GOLD',
    displayName: '골드',
    color: '#FFD700',
    icon: '🥇',
    minScore: 5000,
    maxShares: 500000,
    tradingFeeRate: 0.0025,
    dividendBonus: 0.05,
    exposureBoost: 1.5,
    benefits: ['실버 혜택 포함', '골드 배지', '홈 노출 우선', '주주 전용 채팅방']
  },
  PLATINUM: {
    name: 'PLATINUM',
    displayName: '플래티넘',
    color: '#E5E4E2',
    icon: '💠',
    minScore: 15000,
    maxShares: 1000000,
    tradingFeeRate: 0.0022,
    dividendBonus: 0.08,
    exposureBoost: 2.0,
    benefits: ['골드 혜택 포함', '플래티넘 배지', '추천 피드 노출', 'VIP 고객 지원', '맞춤 분석 리포트']
  },
  DIAMOND: {
    name: 'DIAMOND',
    displayName: '다이아몬드',
    color: '#B9F2FF',
    icon: '💎',
    minScore: 50000,
    maxShares: 2000000,
    tradingFeeRate: 0.002,
    dividendBonus: 0.10,
    exposureBoost: 3.0,
    benefits: ['플래티넘 혜택 포함', '다이아몬드 배지', '메인 배너 노출', '전담 매니저', '수익 정산 우선']
  },
  MASTER: {
    name: 'MASTER',
    displayName: '마스터',
    color: '#9B59B6',
    icon: '👑',
    minScore: 150000,
    maxShares: 5000000,
    tradingFeeRate: 0.0018,
    dividendBonus: 0.12,
    exposureBoost: 4.0,
    benefits: ['다이아몬드 혜택 포함', '마스터 배지', '프리미엄 홍보', '독점 이벤트 주최권', '크리에이터 협업 매칭']
  },
  LEGEND: {
    name: 'LEGEND',
    displayName: '레전드',
    color: '#FF6B6B',
    icon: '🏆',
    minScore: 500000,
    maxShares: 10000000,
    tradingFeeRate: 0.0015,
    dividendBonus: 0.15,
    exposureBoost: 5.0,
    benefits: ['마스터 혜택 포함', '레전드 배지', '플랫폼 파트너십', 'NFT 발행권', '수익 분배 최우선']
  }
};

const TIER_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'LEGEND'];

/**
 * 티어 점수 계산
 * 점수 = 시가총액 점수 + 주주수 점수 + 거래량 점수 + 활동 점수
 */
function calculateTierScore(stock, metrics = {}) {
  let score = 0;

  // 1. 시가총액 점수 (최대 40%)
  const marketCap = stock.marketCapTotal || 0;
  const marketCapScore = Math.min(200000, Math.floor(marketCap / 10000)); // 1만원당 1점, 최대 20만점
  score += marketCapScore;

  // 2. 주주 수 점수 (최대 25%)
  const shareholderCount = stock.shareholderCount || 0;
  const shareholderScore = Math.min(125000, shareholderCount * 100); // 1명당 100점, 최대 12.5만점
  score += shareholderScore;

  // 3. 거래량 점수 (최대 20%)
  const monthlyVolume = stock.monthlyVolume || metrics.monthlyVolume || 0;
  const volumeScore = Math.min(100000, Math.floor(monthlyVolume / 10000)); // 1만원 거래량당 1점
  score += volumeScore;

  // 4. 거래 횟수 점수 (최대 10%)
  const transactionCount = stock.transactionCount || 0;
  const txScore = Math.min(50000, transactionCount * 10); // 1거래당 10점
  score += txScore;

  // 5. 상장 기간 보너스 (최대 5%)
  const listingDate = stock.listingDate || stock.createdAt;
  const daysListed = Math.floor((Date.now() - new Date(listingDate)) / (1000 * 60 * 60 * 24));
  const daysScore = Math.min(25000, daysListed * 10); // 1일당 10점
  score += daysScore;

  return Math.floor(score);
}

/**
 * 점수에 따른 티어 결정
 */
function getTierByScore(score) {
  for (let i = TIER_ORDER.length - 1; i >= 0; i--) {
    const tierName = TIER_ORDER[i];
    if (score >= TIERS[tierName].minScore) {
      return tierName;
    }
  }
  return 'BRONZE';
}

/**
 * 단일 주식의 티어 업데이트
 */
async function updateStockTier(stockId, options = {}) {
  const { force = false, transaction: t } = options;

  const stock = await Stock.findByPk(stockId, { transaction: t });
  if (!stock) {
    throw new Error('주식을 찾을 수 없습니다');
  }

  // 월간 거래량 계산
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const volumeResult = await Transaction.findOne({
    where: {
      stockId,
      createdAt: { [Op.gte]: thirtyDaysAgo }
    },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalVolume'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'txCount']
    ],
    raw: true,
    transaction: t
  });

  const monthlyVolume = parseInt(volumeResult?.totalVolume) || 0;

  // 티어 점수 계산
  const newScore = calculateTierScore(stock, { monthlyVolume });
  const newTier = getTierByScore(newScore);
  const oldTier = stock.tier;

  const oldTierIndex = TIER_ORDER.indexOf(oldTier);
  const newTierIndex = TIER_ORDER.indexOf(newTier);

  let tierChanged = false;
  let finalTier = oldTier;

  // 승급 처리
  if (newTierIndex > oldTierIndex) {
    tierChanged = true;
    finalTier = newTier;
  }
  // 강등 처리 (보호 기간 체크)
  else if (newTierIndex < oldTierIndex) {
    const now = new Date();
    if (!stock.tierProtectedUntil || now > stock.tierProtectedUntil || force) {
      tierChanged = true;
      finalTier = newTier;
    }
  }

  // 업데이트
  const updateData = {
    tierScore: newScore,
    monthlyVolume,
    tierUpdatedAt: new Date()
  };

  if (tierChanged) {
    updateData.tier = finalTier;

    // 승급 시 강등 보호 기간 설정 (7일)
    if (newTierIndex > oldTierIndex) {
      const protectedUntil = new Date();
      protectedUntil.setDate(protectedUntil.getDate() + 7);
      updateData.tierProtectedUntil = protectedUntil;
    }

    // 티어에 따른 수수료율 업데이트
    updateData.tradingFeeRate = TIERS[finalTier].tradingFeeRate;
  }

  // 최고 시가총액 갱신
  if (stock.marketCapTotal > (stock.peakMarketCap || 0)) {
    updateData.peakMarketCap = stock.marketCapTotal;
  }

  await stock.update(updateData, { transaction: t });

  return {
    stockId,
    oldTier,
    newTier: finalTier,
    tierChanged,
    score: newScore,
    tierInfo: TIERS[finalTier]
  };
}

/**
 * 모든 주식의 티어 일괄 업데이트
 */
async function updateAllTiers(options = {}) {
  const { batchSize = 50 } = options;

  const stocks = await Stock.findAll({
    where: { status: 'active' },
    attributes: ['id']
  });

  const results = {
    total: stocks.length,
    updated: 0,
    upgraded: 0,
    downgraded: 0,
    unchanged: 0,
    errors: 0
  };

  for (let i = 0; i < stocks.length; i += batchSize) {
    const batch = stocks.slice(i, i + batchSize);

    await Promise.all(batch.map(async (stock) => {
      try {
        const result = await updateStockTier(stock.id);
        results.updated++;

        if (result.tierChanged) {
          const oldIndex = TIER_ORDER.indexOf(result.oldTier);
          const newIndex = TIER_ORDER.indexOf(result.newTier);
          if (newIndex > oldIndex) {
            results.upgraded++;
          } else {
            results.downgraded++;
          }
        } else {
          results.unchanged++;
        }
      } catch (error) {
        console.error(`Tier update error for stock ${stock.id}:`, error);
        results.errors++;
      }
    }));
  }

  return results;
}

/**
 * 티어 정보 조회
 */
function getTierInfo(tier) {
  return TIERS[tier] || TIERS.BRONZE;
}

/**
 * 모든 티어 정보 조회
 */
function getAllTiers() {
  return TIER_ORDER.map(tier => ({
    ...TIERS[tier],
    order: TIER_ORDER.indexOf(tier)
  }));
}

/**
 * 다음 티어까지 필요한 점수 계산
 */
function getNextTierProgress(currentTier, currentScore) {
  const currentIndex = TIER_ORDER.indexOf(currentTier);

  if (currentIndex >= TIER_ORDER.length - 1) {
    return {
      isMaxTier: true,
      currentTier,
      currentScore
    };
  }

  const nextTier = TIER_ORDER[currentIndex + 1];
  const nextTierInfo = TIERS[nextTier];
  const currentTierInfo = TIERS[currentTier];

  const scoreNeeded = nextTierInfo.minScore - currentScore;
  const progressPercent = ((currentScore - currentTierInfo.minScore) /
    (nextTierInfo.minScore - currentTierInfo.minScore)) * 100;

  return {
    isMaxTier: false,
    currentTier,
    nextTier,
    currentScore,
    nextTierMinScore: nextTierInfo.minScore,
    scoreNeeded: Math.max(0, scoreNeeded),
    progressPercent: Math.min(100, Math.max(0, progressPercent)).toFixed(1)
  };
}

/**
 * 티어별 주식 목록 조회
 */
async function getStocksByTier(tier, options = {}) {
  const { page = 1, limit = 20, sortBy = 'tierScore', sortOrder = 'DESC' } = options;

  const whereClause = { status: 'active' };
  if (tier) {
    whereClause.tier = tier;
  }

  const { count, rows } = await Stock.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'issuer',
        attributes: ['id', 'username', 'displayName', 'profileImage', 'category']
      }
    ],
    order: [[sortBy, sortOrder]],
    limit,
    offset: (page - 1) * limit
  });

  return {
    stocks: rows.map(stock => ({
      ...stock.toJSON(),
      tierInfo: TIERS[stock.tier]
    })),
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    }
  };
}

/**
 * 티어 통계 조회
 */
async function getTierStatistics() {
  const stats = await Stock.findAll({
    where: { status: 'active' },
    attributes: [
      'tier',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('market_cap_total')), 'totalMarketCap'],
      [sequelize.fn('AVG', sequelize.col('tier_score')), 'avgScore']
    ],
    group: ['tier'],
    raw: true
  });

  const result = {};
  for (const tier of TIER_ORDER) {
    const tierStats = stats.find(s => s.tier === tier);
    result[tier] = {
      ...TIERS[tier],
      count: tierStats ? parseInt(tierStats.count) : 0,
      totalMarketCap: tierStats ? parseInt(tierStats.totalMarketCap) : 0,
      avgScore: tierStats ? Math.floor(parseFloat(tierStats.avgScore)) : 0
    };
  }

  return result;
}

/**
 * 주식의 티어 상세 정보 조회
 */
async function getStockTierDetail(stockId) {
  const stock = await Stock.findByPk(stockId, {
    include: [
      {
        model: User,
        as: 'issuer',
        attributes: ['id', 'username', 'displayName', 'profileImage']
      }
    ]
  });

  if (!stock) {
    return { success: false, message: '주식을 찾을 수 없습니다' };
  }

  const tierInfo = TIERS[stock.tier];
  const nextTierProgress = getNextTierProgress(stock.tier, stock.tierScore);

  // 점수 분석
  const scoreBreakdown = {
    marketCap: {
      label: '시가총액',
      value: stock.marketCapTotal || 0,
      score: Math.min(200000, Math.floor((stock.marketCapTotal || 0) / 10000)),
      maxScore: 200000
    },
    shareholders: {
      label: '주주 수',
      value: stock.shareholderCount || 0,
      score: Math.min(125000, (stock.shareholderCount || 0) * 100),
      maxScore: 125000
    },
    volume: {
      label: '월간 거래량',
      value: stock.monthlyVolume || 0,
      score: Math.min(100000, Math.floor((stock.monthlyVolume || 0) / 10000)),
      maxScore: 100000
    },
    transactions: {
      label: '거래 횟수',
      value: stock.transactionCount || 0,
      score: Math.min(50000, (stock.transactionCount || 0) * 10),
      maxScore: 50000
    },
    listing: {
      label: '상장 기간',
      value: Math.floor((Date.now() - new Date(stock.listingDate || stock.createdAt)) / (1000 * 60 * 60 * 24)),
      score: Math.min(25000, Math.floor((Date.now() - new Date(stock.listingDate || stock.createdAt)) / (1000 * 60 * 60 * 24)) * 10),
      maxScore: 25000
    }
  };

  return {
    success: true,
    stock: {
      id: stock.id,
      issuer: stock.issuer,
      sharePrice: stock.sharePrice,
      marketCapTotal: stock.marketCapTotal
    },
    tier: {
      current: stock.tier,
      info: tierInfo,
      score: stock.tierScore,
      updatedAt: stock.tierUpdatedAt,
      protectedUntil: stock.tierProtectedUntil
    },
    progress: nextTierProgress,
    scoreBreakdown,
    allTiers: getAllTiers()
  };
}

/**
 * 티어 랭킹 조회
 */
async function getTierRanking(options = {}) {
  const { tier, limit = 50 } = options;

  const whereClause = { status: 'active' };
  if (tier) {
    whereClause.tier = tier;
  }

  const stocks = await Stock.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'issuer',
        attributes: ['id', 'username', 'displayName', 'profileImage', 'category']
      }
    ],
    order: [['tierScore', 'DESC']],
    limit
  });

  return stocks.map((stock, index) => ({
    rank: index + 1,
    stock: {
      id: stock.id,
      issuer: stock.issuer,
      tier: stock.tier,
      tierInfo: TIERS[stock.tier],
      tierScore: stock.tierScore,
      sharePrice: stock.sharePrice,
      marketCapTotal: stock.marketCapTotal,
      shareholderCount: stock.shareholderCount,
      priceChangePercent: stock.priceChangePercent
    }
  }));
}

module.exports = {
  TIERS,
  TIER_ORDER,
  calculateTierScore,
  getTierByScore,
  updateStockTier,
  updateAllTiers,
  getTierInfo,
  getAllTiers,
  getNextTierProgress,
  getStocksByTier,
  getTierStatistics,
  getStockTierDetail,
  getTierRanking
};
