/**
 * 티어 시스템 유틸리티
 * 주식 발행량 한도와 업그레이드 조건 관리
 */

const TIER_CONFIG = {
  BRONZE: {
    name: 'Bronze',
    icon: '🥉',
    maxShares: 5000,
    nextTier: 'SILVER',
    upgradeConditions: {
      shareholders: 0, // Bronze는 기본 티어
      transactions: 0
    }
  },
  SILVER: {
    name: 'Silver',
    icon: '🥈',
    maxShares: 15000,
    nextTier: 'GOLD',
    upgradeConditions: {
      shareholders: 10,
      transactions: 50
    }
  },
  GOLD: {
    name: 'Gold',
    icon: '🥇',
    maxShares: 50000,
    nextTier: 'PLATINUM',
    upgradeConditions: {
      shareholders: 50,
      transactions: 200
    }
  },
  PLATINUM: {
    name: 'Platinum',
    icon: '💎',
    maxShares: 150000,
    nextTier: 'DIAMOND',
    upgradeConditions: {
      shareholders: 200,
      transactions: 1000
    }
  },
  DIAMOND: {
    name: 'Diamond',
    icon: '👑',
    maxShares: 500000,
    nextTier: null, // 최고 티어
    upgradeConditions: {
      shareholders: 500,
      transactions: 5000
    }
  }
};

/**
 * 티어 정보 가져오기
 */
const getTierInfo = (tierName) => {
  return TIER_CONFIG[tierName] || TIER_CONFIG.BRONZE;
};

/**
 * 티어별 최대 발행량 가져오기
 */
const getMaxSharesByTier = (tierName) => {
  return getTierInfo(tierName).maxShares;
};

/**
 * 다음 티어로 업그레이드 가능한지 확인
 */
const canUpgradeTier = (stock) => {
  const currentTier = getTierInfo(stock.tier);

  // 이미 최고 티어면 업그레이드 불가
  if (!currentTier.nextTier) {
    return {
      canUpgrade: false,
      reason: '이미 최고 티어입니다',
      nextTier: null
    };
  }

  const nextTierInfo = getTierInfo(currentTier.nextTier);
  const conditions = nextTierInfo.upgradeConditions;

  const meetsShareholderRequirement = stock.shareholderCount >= conditions.shareholders;
  const meetsTransactionRequirement = stock.transactionCount >= conditions.transactions;

  const canUpgrade = meetsShareholderRequirement && meetsTransactionRequirement;

  return {
    canUpgrade,
    currentTier: {
      tier: stock.tier,
      ...currentTier
    },
    nextTier: {
      tier: currentTier.nextTier,
      ...nextTierInfo
    },
    progress: {
      shareholders: {
        current: stock.shareholderCount,
        required: conditions.shareholders,
        percentage: Math.min(100, Math.round((stock.shareholderCount / conditions.shareholders) * 100))
      },
      transactions: {
        current: stock.transactionCount,
        required: conditions.transactions,
        percentage: Math.min(100, Math.round((stock.transactionCount / conditions.transactions) * 100))
      }
    },
    meetsShareholderRequirement,
    meetsTransactionRequirement
  };
};

/**
 * 주식 확장 가능 여부 확인
 */
const canExpandShares = (stock, requestedShares) => {
  const maxShares = getMaxSharesByTier(stock.tier);
  const newTotal = stock.totalShares + requestedShares;

  if (newTotal > maxShares) {
    return {
      canExpand: false,
      reason: `현재 티어(${stock.tier})의 최대 발행량(${maxShares.toLocaleString()}주)을 초과합니다`,
      maxShares,
      currentTotal: stock.totalShares,
      requestedTotal: newTotal,
      maxAllowedExpansion: maxShares - stock.totalShares
    };
  }

  return {
    canExpand: true,
    maxShares,
    currentTotal: stock.totalShares,
    requestedTotal: newTotal,
    remainingCapacity: maxShares - newTotal
  };
};

/**
 * 모든 티어 정보 가져오기
 */
const getAllTiers = () => {
  return Object.entries(TIER_CONFIG).map(([key, value]) => ({
    tier: key,
    ...value
  }));
};

module.exports = {
  TIER_CONFIG,
  getTierInfo,
  getMaxSharesByTier,
  canUpgradeTier,
  canExpandShares,
  getAllTiers
};
