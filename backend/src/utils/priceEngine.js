/**
 * 가격 엔진 (체결가 기반)
 *
 * 진짜 거래소처럼 "마지막 체결가 = 현재가" 원칙을 모든 체결 경로에서 통일 적용한다.
 *
 * - applyTradePrice: 체결이 일어나면 sharePrice 를 체결가로 갱신하고
 *   당일 시고저/거래량/등락률을 업데이트하고, 서킷브레이커를 점검하고,
 *   실시간 가격 변동을 브로드캐스트한다.
 * - computeMarketImpact: 호가창이 없는 시장가 즉시매매(발행/소각 방식)에서
 *   주문 규모에 비례한 가격 충격(impact)을 계산한다. (매수→상승, 매도→하락)
 *
 * 공식 기반 stockPriceService.calculateStockPrice 는 더 이상 sharePrice 를
 * 직접 덮어쓰지 않고 보조지표(fair value)로만 쓰인다.
 */

const { sendStockPriceUpdate } = require('../config/socket');
const { checkAndTriggerCircuitBreaker } = require('./circuitBreaker');

const MIN_PRICE = 1;
// 시장가 1회 체결이 가격에 줄 수 있는 최대 충격 (±%)
const MAX_IMPACT_PCT = 10;
// 시장가 충격 민감도 계수 (발행주식 대비 주문비율에 곱함)
const IMPACT_SENSITIVITY = 1;

/**
 * 시장가 체결의 가격 충격 후 새 가격 계산
 * @param {number} oldPrice 현재가
 * @param {number} shares 체결 수량
 * @param {number} totalShares 총 발행 가능 주식 수 (유동성 기준)
 * @param {'buy'|'sell'} side 매수/매도
 * @returns {number} 충격 반영된 새 가격 (정수, 최소 MIN_PRICE)
 */
function computeMarketImpact(oldPrice, shares, totalShares, side) {
  const price = parseFloat(oldPrice) || 0;
  if (price <= 0) return Math.max(MIN_PRICE, Math.round(price));

  const base = Math.max(parseInt(totalShares, 10) || 0, 1);
  const qty = Math.max(parseInt(shares, 10) || 0, 0);

  let impactPct = (qty / base) * 100 * IMPACT_SENSITIVITY;
  if (impactPct > MAX_IMPACT_PCT) impactPct = MAX_IMPACT_PCT;

  const direction = side === 'sell' ? -1 : 1;
  const newPrice = price * (1 + (direction * impactPct) / 100);

  return Math.max(MIN_PRICE, Math.round(newPrice));
}

/**
 * 체결가를 현재가로 반영 (모든 체결 경로 공용)
 *
 * @param {object} stock 갱신할 Stock 인스턴스 (트랜잭션 안에서 잠긴 인스턴스 권장)
 * @param {number} tradePrice 체결 가격 (= 새 현재가)
 * @param {object} [options]
 * @param {number} [options.volume=0] 이번 체결 수량 (당일 거래량에 누적)
 * @param {object} [options.transaction=null] Sequelize 트랜잭션
 * @param {boolean} [options.broadcast=true] 소켓 브로드캐스트 여부
 * @returns {Promise<{oldPrice:number,newPrice:number,changePercent:number,circuitTriggered:boolean}>}
 */
async function applyTradePrice(stock, tradePrice, options = {}) {
  const { volume = 0, transaction = null, broadcast = true } = options;

  const oldPrice = parseFloat(stock.sharePrice) || 0;
  const newPrice = Math.max(MIN_PRICE, Math.round(parseFloat(tradePrice) || oldPrice));

  // 등락 기준가: 전일 종가가 있으면 그것, 없으면 직전 가격(첫 거래)
  const reference = parseFloat(stock.previousClose) || oldPrice || newPrice;

  // 당일 시고저/거래량 (값이 없으면 이번 체결가로 초기화)
  const dayOpen = stock.dayOpen != null ? parseFloat(stock.dayOpen) : newPrice;
  const prevHigh = stock.dayHigh != null ? parseFloat(stock.dayHigh) : newPrice;
  const prevLow = stock.dayLow != null ? parseFloat(stock.dayLow) : newPrice;
  const dayHigh = Math.max(prevHigh, newPrice);
  const dayLow = Math.min(prevLow, newPrice);
  const dayVolume = (parseInt(stock.dayVolume, 10) || 0) + (parseInt(volume, 10) || 0);

  const changePercent = reference > 0 ? ((newPrice - reference) / reference) * 100 : 0;

  await stock.update(
    {
      sharePrice: newPrice,
      previousClose: stock.previousClose != null ? stock.previousClose : reference,
      dayOpen,
      dayHigh,
      dayLow,
      dayVolume,
      priceChangePercent: Number(changePercent.toFixed(2))
    },
    transaction ? { transaction } : {}
  );

  // 서킷브레이커: 기준가(전일 종가) 대비 일일 변동 한도 점검
  let circuitTriggered = false;
  try {
    circuitTriggered = await checkAndTriggerCircuitBreaker(stock, reference, newPrice, transaction);
  } catch (err) {
    console.error('서킷브레이커 점검 오류:', err);
  }

  // 실시간 가격 변동 브로드캐스트 (가격이 실제로 변했을 때만)
  if (broadcast && oldPrice !== newPrice) {
    try {
      sendStockPriceUpdate({
        stockId: stock.id,
        userId: stock.userId,
        oldPrice,
        newPrice,
        changePercent: Number(changePercent.toFixed(2)),
        volume
      });
    } catch (err) {
      console.error('가격 브로드캐스트 오류:', err);
    }
  }

  return {
    oldPrice,
    newPrice,
    changePercent: Number(changePercent.toFixed(2)),
    circuitTriggered
  };
}

module.exports = {
  applyTradePrice,
  computeMarketImpact,
  MIN_PRICE,
  MAX_IMPACT_PCT
};
