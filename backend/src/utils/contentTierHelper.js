const { getShareholding } = require('./shareholderHelper');

/**
 * 콘텐츠 티어별 필요 주식 수
 */
const TIER_REQUIREMENTS = {
  PUBLIC: 0,
  BRONZE: 10,
  SILVER: 100,
  GOLD: 1000,
  PLATINUM: 10000
};

/**
 * 콘텐츠 티어 이름 (한글)
 */
const TIER_NAMES = {
  PUBLIC: '공개',
  BRONZE: '브론즈',
  SILVER: '실버',
  GOLD: '골드',
  PLATINUM: '플래티넘'
};

/**
 * 사용자가 특정 티어의 콘텐츠에 접근할 수 있는지 확인
 * @param {number} userId - 사용자 ID
 * @param {number} authorId - 콘텐츠 작성자 ID
 * @param {string} contentTier - 콘텐츠 티어 (PUBLIC, BRONZE, SILVER, GOLD, PLATINUM)
 * @returns {Promise<boolean>} - 접근 가능 여부
 */
async function canAccessContentTier(userId, authorId, contentTier) {
  // PUBLIC 콘텐츠는 모두 접근 가능
  if (contentTier === 'PUBLIC') {
    return true;
  }

  // 작성자 본인은 모든 콘텐츠 접근 가능
  if (userId === authorId) {
    return true;
  }

  // 필요한 주식 수 확인
  const requiredShares = TIER_REQUIREMENTS[contentTier] || 0;

  // 사용자가 보유한 주식 수 조회
  const shareholding = await getShareholding(userId, authorId);

  return shareholding >= requiredShares;
}

/**
 * 사용자가 접근할 수 있는 최고 티어 반환
 * @param {number} userId - 사용자 ID
 * @param {number} authorId - 콘텐츠 작성자 ID
 * @returns {Promise<string>} - 접근 가능한 최고 티어
 */
async function getUserMaxTier(userId, authorId) {
  // 작성자 본인은 PLATINUM
  if (userId === authorId) {
    return 'PLATINUM';
  }

  const shareholding = await getShareholding(userId, authorId);

  if (shareholding >= TIER_REQUIREMENTS.PLATINUM) return 'PLATINUM';
  if (shareholding >= TIER_REQUIREMENTS.GOLD) return 'GOLD';
  if (shareholding >= TIER_REQUIREMENTS.SILVER) return 'SILVER';
  if (shareholding >= TIER_REQUIREMENTS.BRONZE) return 'BRONZE';
  return 'PUBLIC';
}

/**
 * 티어별 필요 주식 수 반환
 * @param {string} tier - 티어명
 * @returns {number} - 필요한 주식 수
 */
function getRequiredShares(tier) {
  return TIER_REQUIREMENTS[tier] || 0;
}

/**
 * 티어 한글 이름 반환
 * @param {string} tier - 티어명
 * @returns {string} - 한글 이름
 */
function getTierName(tier) {
  return TIER_NAMES[tier] || '알 수 없음';
}

module.exports = {
  TIER_REQUIREMENTS,
  TIER_NAMES,
  canAccessContentTier,
  getUserMaxTier,
  getRequiredShares,
  getTierName
};
