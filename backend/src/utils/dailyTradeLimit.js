/**
 * 일일 거래 한도 유틸리티
 * User.dailyTradeLimit, dailyTradeAmount, dailyTradeResetAt 필드를 활용
 */

const { User } = require('../models');

/**
 * 일일 거래 한도 초과 여부를 확인한다.
 * 자정이 지났으면 dailyTradeAmount를 자동으로 리셋한다.
 *
 * @param {object} user - User 모델 인스턴스
 * @param {number} tradeAmount - 이번 거래 금액 (PO)
 * @param {object} [transaction] - Sequelize 트랜잭션
 * @returns {{ allowed: boolean, remaining: number, dailyLimit: number, usedToday: number }}
 */
async function checkDailyTradeLimit(user, tradeAmount, transaction = null) {
  const now = new Date();
  const dailyLimit = user.dailyTradeLimit || 10000000;

  // 자정 리셋 확인
  let usedToday = user.dailyTradeAmount || 0;

  if (user.dailyTradeResetAt) {
    const resetAt = new Date(user.dailyTradeResetAt);
    if (now >= resetAt) {
      // 자정이 지남 → 리셋
      usedToday = 0;
      const nextMidnight = getNextMidnight();
      await user.update(
        { dailyTradeAmount: 0, dailyTradeResetAt: nextMidnight },
        { ...(transaction && { transaction }) }
      );
    }
  } else {
    // 첫 거래: 리셋 시간 설정
    const nextMidnight = getNextMidnight();
    await user.update(
      { dailyTradeResetAt: nextMidnight },
      { ...(transaction && { transaction }) }
    );
  }

  const remaining = dailyLimit - usedToday;
  const allowed = tradeAmount <= remaining;

  return {
    allowed,
    remaining,
    dailyLimit,
    usedToday
  };
}

/**
 * 거래 완료 후 일일 사용량을 기록한다.
 *
 * @param {object} user - User 모델 인스턴스
 * @param {number} tradeAmount - 거래 금액 (PO)
 * @param {object} [transaction] - Sequelize 트랜잭션
 */
async function recordDailyTradeAmount(user, tradeAmount, transaction = null) {
  const currentAmount = user.dailyTradeAmount || 0;
  await user.update(
    { dailyTradeAmount: currentAmount + tradeAmount },
    { ...(transaction && { transaction }) }
  );
}

/**
 * 다음 자정(KST) 시각을 반환
 */
function getNextMidnight() {
  const now = new Date();
  // KST = UTC + 9
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const kstMidnight = new Date(kstNow);
  kstMidnight.setDate(kstMidnight.getDate() + 1);
  kstMidnight.setHours(0, 0, 0, 0);
  // UTC로 변환
  return new Date(kstMidnight.getTime() - 9 * 60 * 60 * 1000);
}

module.exports = {
  checkDailyTradeLimit,
  recordDailyTradeAmount
};
