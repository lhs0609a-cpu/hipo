const { StockTransaction } = require('../models');
const { Op } = require('sequelize');

/**
 * 주주 등급 정의
 */
const SHAREHOLDER_TIERS = {
  GENERAL: {
    name: '일반 주주',
    minShares: 1,
    maxShares: 99,
    permissions: {
      viewBasicContent: true,
      monthlyComments: 1,
      viewPremiumContent: false,
      weeklyQA: false,
      directMessage: false,
      monthlyVideoCall: false,
      phoneCall: false,
      offlineMeeting: false,
      votingRight: false
    }
  },
  EXCELLENT: {
    name: '우량 주주',
    minShares: 100,
    maxShares: 999,
    permissions: {
      viewBasicContent: true,
      monthlyComments: Infinity,
      viewPremiumContent: true,
      weeklyQA: true,
      directMessage: false,
      monthlyVideoCall: false,
      phoneCall: false,
      offlineMeeting: false,
      votingRight: false
    }
  },
  MAJOR: {
    name: '대주주',
    minShares: 1000,
    maxShares: 9999,
    permissions: {
      viewBasicContent: true,
      monthlyComments: Infinity,
      viewPremiumContent: true,
      weeklyQA: true,
      directMessage: true,
      monthlyVideoCall: true,
      phoneCall: false,
      offlineMeeting: false,
      votingRight: false
    }
  },
  LARGEST: {
    name: '최대주주',
    minShares: 10000,
    maxShares: Infinity,
    permissions: {
      viewBasicContent: true,
      monthlyComments: Infinity,
      viewPremiumContent: true,
      weeklyQA: true,
      directMessage: true,
      monthlyVideoCall: true,
      phoneCall: true,
      offlineMeeting: true,
      votingRight: true
    }
  }
};

/**
 * 사용자가 특정 사용자의 주식을 얼마나 보유하고 있는지 계산
 * @param {number} userId - 주식 보유자 ID
 * @param {number} targetUserId - 주식 대상 사용자 ID
 * @returns {Promise<number>} - 보유 주식 수
 */
async function getShareholding(userId, targetUserId) {
  try {
    // 매수한 주식 합계
    const bought = await StockTransaction.sum('quantity', {
      where: {
        buyerId: userId,
        targetUserId: targetUserId
      }
    }) || 0;

    // 매도한 주식 합계
    const sold = await StockTransaction.sum('quantity', {
      where: {
        sellerId: userId,
        targetUserId: targetUserId
      }
    }) || 0;

    return bought - sold;
  } catch (error) {
    console.error('주식 보유량 계산 오류:', error);
    return 0;
  }
}

/**
 * 주식 보유량에 따른 주주 등급 결정
 * @param {number} shares - 보유 주식 수
 * @returns {Object} - 주주 등급 정보
 */
function getShareholderTier(shares) {
  if (shares >= SHAREHOLDER_TIERS.LARGEST.minShares) {
    return { tier: 'LARGEST', ...SHAREHOLDER_TIERS.LARGEST, shares };
  } else if (shares >= SHAREHOLDER_TIERS.MAJOR.minShares) {
    return { tier: 'MAJOR', ...SHAREHOLDER_TIERS.MAJOR, shares };
  } else if (shares >= SHAREHOLDER_TIERS.EXCELLENT.minShares) {
    return { tier: 'EXCELLENT', ...SHAREHOLDER_TIERS.EXCELLENT, shares };
  } else if (shares >= SHAREHOLDER_TIERS.GENERAL.minShares) {
    return { tier: 'GENERAL', ...SHAREHOLDER_TIERS.GENERAL, shares };
  }
  return null; // 주식 미보유
}

/**
 * 사용자의 주주 등급 및 권한 조회
 * @param {number} userId - 주식 보유자 ID
 * @param {number} targetUserId - 주식 대상 사용자 ID
 * @returns {Promise<Object>} - 등급 및 권한 정보
 */
async function getShareholderStatus(userId, targetUserId) {
  const shares = await getShareholding(userId, targetUserId);
  const tierInfo = getShareholderTier(shares);

  return {
    shareholding: shares,
    tier: tierInfo ? tierInfo.tier : 'NONE',
    tierName: tierInfo ? tierInfo.name : '비주주',
    permissions: tierInfo ? tierInfo.permissions : {},
    minShares: tierInfo ? tierInfo.minShares : 0,
    maxShares: tierInfo ? tierInfo.maxShares : 0
  };
}

/**
 * 특정 권한이 있는지 확인
 * @param {number} userId - 주식 보유자 ID
 * @param {number} targetUserId - 주식 대상 사용자 ID
 * @param {string} permission - 확인할 권한명
 * @returns {Promise<boolean>} - 권한 여부
 */
async function hasPermission(userId, targetUserId, permission) {
  const status = await getShareholderStatus(userId, targetUserId);
  return status.permissions[permission] === true || status.permissions[permission] === Infinity;
}

/**
 * 월간 댓글 제한 확인
 * @param {number} userId - 주식 보유자 ID
 * @param {number} targetUserId - 주식 대상 사용자 ID
 * @returns {Promise<Object>} - { allowed: boolean, limit: number, used: number }
 */
async function checkCommentLimit(userId, targetUserId) {
  const status = await getShareholderStatus(userId, targetUserId);
  const monthlyLimit = status.permissions.monthlyComments || 0;

  if (monthlyLimit === Infinity) {
    return { allowed: true, limit: Infinity, used: 0 };
  }

  const { CommentLimit } = require('../models');
  const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

  const [limitRecord] = await CommentLimit.findOrCreate({
    where: {
      userId,
      targetUserId,
      month: currentMonth
    },
    defaults: {
      commentCount: 0
    }
  });

  const allowed = limitRecord.commentCount < monthlyLimit;

  return {
    allowed,
    limit: monthlyLimit,
    used: limitRecord.commentCount
  };
}

/**
 * 댓글 작성 후 카운트 증가
 * @param {number} userId - 주식 보유자 ID
 * @param {number} targetUserId - 주식 대상 사용자 ID
 */
async function incrementCommentCount(userId, targetUserId) {
  const { CommentLimit } = require('../models');
  const currentMonth = new Date().toISOString().substring(0, 7);

  const [limitRecord] = await CommentLimit.findOrCreate({
    where: {
      userId,
      targetUserId,
      month: currentMonth
    },
    defaults: {
      commentCount: 0
    }
  });

  await limitRecord.increment('commentCount');
}

/**
 * 월간 DM 제한 확인
 * @param {number} userId - DM 발송자 ID
 * @param {number} targetUserId - DM 수신자 ID
 * @returns {Promise<Object>} - { allowed: boolean, limit: number, used: number, hasReadReceipt: boolean }
 */
async function checkDMLimit(userId, targetUserId) {
  const shareholding = await getShareholding(userId, targetUserId);

  // 100주 미만: DM 불가
  if (shareholding < 100) {
    return {
      allowed: false,
      limit: 0,
      used: 0,
      hasReadReceipt: false,
      reason: '100주 이상 보유자만 DM을 보낼 수 있습니다.'
    };
  }

  // 1,000주 이상: 무제한 DM + 읽음 확인
  if (shareholding >= 1000) {
    return {
      allowed: true,
      limit: Infinity,
      used: 0,
      hasReadReceipt: true
    };
  }

  // 100주 이상 1,000주 미만: 월 1회 DM 가능
  const { DMLimit } = require('../models');
  const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

  const [limitRecord] = await DMLimit.findOrCreate({
    where: {
      userId,
      targetUserId,
      month: currentMonth
    },
    defaults: {
      dmCount: 0
    }
  });

  const monthlyLimit = 1;
  const allowed = limitRecord.dmCount < monthlyLimit;

  return {
    allowed,
    limit: monthlyLimit,
    used: limitRecord.dmCount,
    hasReadReceipt: false
  };
}

/**
 * DM 발송 후 카운트 증가
 * @param {number} userId - DM 발송자 ID
 * @param {number} targetUserId - DM 수신자 ID
 */
async function incrementDMCount(userId, targetUserId) {
  const shareholding = await getShareholding(userId, targetUserId);

  // 1,000주 이상은 무제한이므로 카운트하지 않음
  if (shareholding >= 1000) {
    return;
  }

  const { DMLimit } = require('../models');
  const currentMonth = new Date().toISOString().substring(0, 7);

  const [limitRecord] = await DMLimit.findOrCreate({
    where: {
      userId,
      targetUserId,
      month: currentMonth
    },
    defaults: {
      dmCount: 0
    }
  });

  await limitRecord.increment('dmCount');
}

module.exports = {
  SHAREHOLDER_TIERS,
  getShareholding,
  getShareholderTier,
  getShareholderStatus,
  hasPermission,
  checkCommentLimit,
  incrementCommentCount,
  checkDMLimit,
  incrementDMCount
};
