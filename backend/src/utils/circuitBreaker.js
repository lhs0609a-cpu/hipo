/**
 * 서킷브레이커 유틸리티
 * 주식 가격이 일일 제한(dailyPriceLimit)을 초과하면 거래를 일시 중단
 */

const { Stock } = require('../models');

/**
 * 서킷브레이커가 현재 활성 상태인지 확인
 * @param {object} stock - Stock 모델 인스턴스
 * @returns {boolean}
 */
function isCircuitBreakerActive(stock) {
  if (!stock.circuitBreakerTriggered) return false;
  if (!stock.circuitBreakerEndTime) return false;
  return new Date() < new Date(stock.circuitBreakerEndTime);
}

/**
 * 서킷브레이커 발동
 * @param {string} stockId - 주식 UUID
 * @param {number} durationMinutes - 중단 시간(분), 기본 20분
 * @param {object} [transaction] - Sequelize 트랜잭션
 */
async function triggerCircuitBreaker(stockId, durationMinutes = 20, transaction = null) {
  const endTime = new Date(Date.now() + durationMinutes * 60 * 1000);

  await Stock.update(
    {
      circuitBreakerTriggered: true,
      circuitBreakerEndTime: endTime
    },
    {
      where: { id: stockId },
      ...(transaction && { transaction })
    }
  );

  console.log(`🚨 서킷브레이커 발동: stockId=${stockId}, 해제 시각=${endTime.toISOString()}`);
}

/**
 * 가격 변동률이 dailyPriceLimit을 초과하면 자동으로 서킷브레이커를 발동
 * @param {object} stock - Stock 모델 인스턴스 (갱신 후)
 * @param {number} oldPrice - 이전 가격
 * @param {number} newPrice - 새 가격
 * @param {object} [transaction] - Sequelize 트랜잭션
 * @returns {boolean} 서킷브레이커가 발동되었으면 true
 */
async function checkAndTriggerCircuitBreaker(stock, oldPrice, newPrice, transaction = null) {
  if (!oldPrice || oldPrice === 0) return false;

  const changePercent = Math.abs((newPrice - oldPrice) / oldPrice * 100);
  const limit = parseFloat(stock.dailyPriceLimit || 30);

  if (changePercent >= limit) {
    // 이미 활성 상태면 스킵
    if (isCircuitBreakerActive(stock)) return false;

    await triggerCircuitBreaker(stock.id, 20, transaction);
    return true;
  }

  // 서킷브레이커 종료 시간이 지났으면 자동 해제
  if (stock.circuitBreakerTriggered && stock.circuitBreakerEndTime && new Date() >= new Date(stock.circuitBreakerEndTime)) {
    await Stock.update(
      { circuitBreakerTriggered: false, circuitBreakerEndTime: null },
      {
        where: { id: stock.id },
        ...(transaction && { transaction })
      }
    );
  }

  return false;
}

module.exports = {
  isCircuitBreakerActive,
  triggerCircuitBreaker,
  checkAndTriggerCircuitBreaker
};
