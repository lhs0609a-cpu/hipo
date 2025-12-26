const { Wallet, CoinTransaction, User, DailyLimit } = require('../models');
const { applyTrustMultiplier, getDailyEarningLimit } = require('./trustLevel');
const { distributeDividends } = require('./dividendCalculator');
const { sequelize } = require('../config/database');

// 활동별 기본 보상 정의 (PO 단위, 100 PO = $0.10)
const BASE_REWARDS = {
  // 일상 활동
  LOGIN: { po: 100, maxPerDay: 1 },
  POST_CREATE: { po: 500, maxPerDay: 5 },
  COMMENT_CREATE: { po: 50, maxPerDay: 50 },
  LIKE: { po: 10, maxPerDay: 100 },
  SHARE: { po: 200, maxPerDay: 10 },
  PROFILE_VISIT: { po: 20, maxPerDay: 50 },

  // 주식 관련
  STOCK_PURCHASE: { po: 100, maxPerDay: null },
  STOCK_HOLDING_DAILY: { po: 1, maxPerDay: null }, // 주당

  // 특수 활동
  REFERRAL_INVITE: { po: 5000, maxPerDay: null },
  EARLY_INVESTMENT: { po: 10000, maxPerDay: null },
  ADMIN_REWARD: { po: 25000, maxPerDay: 1 },
  MONTHLY_CONTENT: { po: 50000, maxPerDay: 1 },

  // 커뮤니티 활동
  ATTENDANCE: { po: 10, maxPerDay: 1 },
  ATTENDANCE_STREAK_7: { po: 2000, maxPerDay: 1 },
  POLL_VOTE: { po: 10, maxPerDay: null },
  CREATOR_REVIEW_PERFECT: { po: 5000, maxPerDay: 1 },
  CHAT_MESSAGE: { po: 2, maxPerDay: 200 },
  VIDEO_WATCH: { po: 10, maxPerDay: 100 } // 1분당
};

// 코인 지급 메인 함수
async function awardCoins(userId, source, options = {}) {
  const transaction = await sequelize.transaction();

  try {
    // 1. 유저 정보 조회
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      throw new Error('User not found');
    }

    // 2. 지갑 조회/생성
    let wallet = await Wallet.findOne({ where: { userId }, transaction });
    if (!wallet) {
      wallet = await Wallet.create({ userId, poBalance: 1000 }, { transaction });
    }

    // 3. 오늘 날짜의 일일 한도 조회/생성
    const today = new Date().toISOString().split('T')[0];
    let dailyLimit = await DailyLimit.findOne({
      where: { userId, date: today },
      transaction
    });

    if (!dailyLimit) {
      dailyLimit = await DailyLimit.create({ userId, date: today }, { transaction });
    }

    // 4. 기본 보상 가져오기
    const baseReward = BASE_REWARDS[source];
    if (!baseReward) {
      await transaction.rollback();
      throw new Error(`Unknown reward source: ${source}`);
    }

    // 5. 일일 횟수 제한 체크
    if (baseReward.maxPerDay) {
      const activityField = getActivityField(source);
      if (dailyLimit[activityField] >= baseReward.maxPerDay) {
        await transaction.rollback();
        return {
          success: false,
          reason: 'DAILY_LIMIT_REACHED',
          message: `오늘의 ${source} 한도를 초과했습니다`
        };
      }
    }

    // 6. Bronze 등급 일일 PO 한도 체크
    const earningLimit = getDailyEarningLimit(user.trustLevel);
    if (earningLimit.hasLimit && dailyLimit.poEarned >= earningLimit.poLimit) {
      await transaction.rollback();
      return {
        success: false,
        reason: 'PO_DAILY_LIMIT',
        message: `Bronze 등급은 일일 ${earningLimit.poLimit} PO까지만 획득 가능합니다`,
        dailyLimit: dailyLimit.poEarned
      };
    }

    // 7. 신뢰도 배율 적용
    const poResult = applyTrustMultiplier(
      options.customPOAmount || baseReward.po,
      user.trustMultiplier,
      user.isVerified,
      user.botSuspicionScore
    );

    // 8. Bronze 한도 재체크 (배율 적용 후)
    let finalPOReward = poResult.finalReward;
    if (earningLimit.hasLimit) {
      const remainingPO = earningLimit.poLimit - dailyLimit.poEarned;
      if (finalPOReward > remainingPO) {
        finalPOReward = remainingPO;
      }
    }

    // 9. 지갑 업데이트
    await wallet.update({
      poBalance: parseFloat(wallet.poBalance) + finalPOReward,
      totalPOEarned: parseFloat(wallet.totalPOEarned || 0) + finalPOReward
    }, { transaction });

    // 10. 거래 기록
    if (finalPOReward > 0) {
      await CoinTransaction.create({
        userId,
        coinType: 'PO',
        transactionType: 'EARN',
        amount: finalPOReward,
        balanceAfter: parseFloat(wallet.poBalance),
        source,
        description: options.description || `${source} 보상`,
        relatedId: options.relatedId,
        relatedType: options.relatedType,
        metadata: {
          baseReward: poResult.baseReward,
          multiplier: poResult.multiplier,
          penaltyApplied: poResult.penaltyApplied,
          trustLevel: user.trustLevel
        }
      }, { transaction });
    }

    // 11. 일일 한도 업데이트
    const activityField = getActivityField(source);
    if (activityField) {
      await dailyLimit.update({
        poEarned: parseFloat(dailyLimit.poEarned || 0) + finalPOReward,
        [activityField]: dailyLimit[activityField] + 1
      }, { transaction });
    }

    // 12. 커밋 후 크리에이터라면 배당 지급
    await transaction.commit();

    // 13. 실시간 배당 지급 (트랜잭션 외부에서 실행)
    let dividendResult = null;
    if (user.isCreator && finalPOReward > 0) {
      try {
        dividendResult = await distributeDividends(userId, finalPOReward, source, {
          description: options.description
        });
      } catch (dividendError) {
        console.error('배당 지급 오류 (보상 지급은 완료됨):', dividendError);
      }
    }

    return {
      success: true,
      po: {
        base: poResult.baseReward,
        multiplier: poResult.multiplier,
        earned: finalPOReward,
        balance: parseFloat(wallet.poBalance)
      },
      trustLevel: user.trustLevel,
      penaltyApplied: poResult.penaltyApplied,
      dailyProgress: {
        poEarned: parseFloat(dailyLimit.poEarned),
        poLimit: earningLimit.hasLimit ? earningLimit.poLimit : null
      },
      dividend: dividendResult
    };

  } catch (error) {
    await transaction.rollback();
    console.error('코인 지급 오류:', error);
    throw error;
  }
}

// 활동별 필드명 매핑
function getActivityField(source) {
  const mapping = {
    POST_CREATE: 'postCount',
    COMMENT_CREATE: 'commentCount',
    LIKE: 'likeCount',
    STOCK_PURCHASE: 'stockPurchaseCount'
  };
  return mapping[source];
}

// 코인 차감 함수 (PO 사용)
async function deductCoins(userId, amount, source, options = {}) {
  const transaction = await sequelize.transaction();

  try {
    const wallet = await Wallet.findOne({ where: { userId }, transaction });
    if (!wallet) {
      await transaction.rollback();
      throw new Error('Wallet not found');
    }

    const currentBalance = parseFloat(wallet.poBalance);
    if (currentBalance < amount) {
      await transaction.rollback();
      return {
        success: false,
        reason: 'INSUFFICIENT_BALANCE',
        message: `PO 잔액이 부족합니다`,
        required: amount,
        available: currentBalance
      };
    }

    // 잔액 차감
    await wallet.update({
      poBalance: currentBalance - amount,
      totalPOSpent: parseFloat(wallet.totalPOSpent || 0) + amount
    }, { transaction });

    // 거래 기록
    await CoinTransaction.create({
      userId,
      coinType: 'PO',
      transactionType: 'SPEND',
      amount: -amount,
      balanceAfter: currentBalance - amount,
      source,
      description: options.description || `${source} 사용`,
      relatedId: options.relatedId,
      relatedType: options.relatedType,
      metadata: options.metadata
    }, { transaction });

    await transaction.commit();

    return {
      success: true,
      spent: amount,
      balance: currentBalance - amount
    };

  } catch (error) {
    await transaction.rollback();
    console.error('코인 차감 오류:', error);
    throw error;
  }
}

module.exports = {
  BASE_REWARDS,
  awardCoins,
  deductCoins
};
