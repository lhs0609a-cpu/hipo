// 신뢰도 등급 및 배율 계산 유틸리티

// 신뢰도 등급 정의 (배당률 추가)
const TRUST_LEVELS = {
  BRONZE: { name: 'bronze', minMarketCap: 0, maxMarketCap: 10000, multiplier: 0.3, dividendRate: 0.10, emoji: '🥉' },
  SILVER: { name: 'silver', minMarketCap: 10001, maxMarketCap: 50000, multiplier: 0.6, dividendRate: 0.15, emoji: '🥈' },
  GOLD: { name: 'gold', minMarketCap: 50001, maxMarketCap: 200000, multiplier: 1.0, dividendRate: 0.20, emoji: '🥇' },
  PLATINUM: { name: 'platinum', minMarketCap: 200001, maxMarketCap: 1000000, multiplier: 1.5, dividendRate: 0.25, emoji: '💎' },
  DIAMOND: { name: 'diamond', minMarketCap: 1000001, maxMarketCap: 5000000, multiplier: 2.0, dividendRate: 0.30, emoji: '👑' },
  MASTER: { name: 'master', minMarketCap: 5000001, maxMarketCap: 20000000, multiplier: 3.0, dividendRate: 0.35, emoji: '⭐' },
  LEGEND: { name: 'legend', minMarketCap: 20000001, maxMarketCap: Infinity, multiplier: 5.0, dividendRate: 0.40, emoji: '🔥' }
};

// 시가총액으로 신뢰도 등급 계산
function calculateTrustLevel(marketCap) {
  for (const level of Object.values(TRUST_LEVELS)) {
    if (marketCap >= level.minMarketCap && marketCap <= level.maxMarketCap) {
      return {
        level: level.name,
        multiplier: level.multiplier,
        dividendRate: level.dividendRate,
        emoji: level.emoji,
        minMarketCap: level.minMarketCap,
        maxMarketCap: level.maxMarketCap === Infinity ? null : level.maxMarketCap
      };
    }
  }
  // 기본값: Bronze
  return {
    level: 'bronze',
    multiplier: 0.3,
    dividendRate: 0.10,
    emoji: '🥉',
    minMarketCap: 0,
    maxMarketCap: 10000
  };
}

// 배율 적용하여 실제 획득 코인 계산
function applyTrustMultiplier(baseReward, multiplier, isVerified = true, botSuspicionScore = 0) {
  let finalMultiplier = multiplier;

  // 미인증 계정: 배율 강제 0.1
  if (!isVerified) {
    finalMultiplier = 0.1;
  }

  // 봇 의심 계정: 배율 강제 0.1
  if (botSuspicionScore >= 70) {
    finalMultiplier = 0.1;
  }

  const finalReward = Math.floor(baseReward * finalMultiplier);
  return {
    baseReward,
    multiplier: finalMultiplier,
    finalReward,
    penaltyApplied: !isVerified || botSuspicionScore >= 70
  };
}

// 다음 등급까지 필요한 시가총액 계산
function getMarketCapToNextLevel(currentMarketCap) {
  const currentLevel = calculateTrustLevel(currentMarketCap);

  // 이미 최고 등급이면
  if (currentLevel.level === 'legend') {
    return {
      isMaxLevel: true,
      currentLevel: currentLevel.level,
      currentMultiplier: currentLevel.multiplier,
      nextLevel: null,
      marketCapNeeded: 0
    };
  }

  // 다음 등급 찾기
  const levelOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'legend'];
  const currentIndex = levelOrder.indexOf(currentLevel.level);
  const nextLevelName = levelOrder[currentIndex + 1];
  const nextLevel = Object.values(TRUST_LEVELS).find(l => l.name === nextLevelName);

  return {
    isMaxLevel: false,
    currentLevel: currentLevel.level,
    currentMultiplier: currentLevel.multiplier,
    nextLevel: nextLevel.name,
    nextMultiplier: nextLevel.multiplier,
    marketCapNeeded: nextLevel.minMarketCap - currentMarketCap
  };
}

// 일일 획득 한도 계산 (Bronze 등급 전용)
function getDailyEarningLimit(trustLevel) {
  if (trustLevel === 'bronze') {
    return {
      hasLimit: true,
      poLimit: 1000, // Bronze는 1일 1,000 PO까지만
      stockPurchaseLimit: 100 // 1일 100주까지만
    };
  }

  return {
    hasLimit: false,
    poLimit: null,
    stockPurchaseLimit: null
  };
}

// 신뢰도 등급 업그레이드 체크
async function checkAndUpgradeTrustLevel(user) {
  const currentTrust = calculateTrustLevel(user.marketCap);

  // 현재 DB에 저장된 등급과 계산된 등급이 다르면 업데이트
  if (user.trustLevel !== currentTrust.level) {
    await user.update({
      trustLevel: currentTrust.level,
      trustMultiplier: currentTrust.multiplier
    });

    return {
      upgraded: true,
      oldLevel: user.trustLevel,
      newLevel: currentTrust.level,
      oldMultiplier: user.trustMultiplier,
      newMultiplier: currentTrust.multiplier
    };
  }

  return { upgraded: false };
}

// 모든 신뢰도 등급 정보 반환
function getAllTrustLevels() {
  return Object.values(TRUST_LEVELS).map(level => ({
    name: level.name,
    minMarketCap: level.minMarketCap,
    maxMarketCap: level.maxMarketCap === Infinity ? null : level.maxMarketCap,
    multiplier: level.multiplier,
    dividendRate: level.dividendRate,
    emoji: level.emoji
  }));
}

module.exports = {
  TRUST_LEVELS,
  calculateTrustLevel,
  applyTrustMultiplier,
  getMarketCapToNextLevel,
  getDailyEarningLimit,
  checkAndUpgradeTrustLevel,
  getAllTrustLevels
};
