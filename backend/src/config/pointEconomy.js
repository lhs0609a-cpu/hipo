/**
 * 포인트 이코노미 정책
 *
 * ─────────────────────────────────────────────────────────────
 * ⚠️ PO 는 앱 내 포인트다. 실제 화폐도, 예치금도, 금융상품도 아니다.
 *    - 현금 인출 통로 없음 (config/featureFlags.js 의 CASH_OUT_ENABLED=false)
 *    - 환매 준비 포인트는 "고객 자금 예치"가 아니라 종목에 귀속된 포인트 카운터다.
 *    - 따라서 신탁·에스크로·예치금 같은 표현을 쓰지 않는다.
 * ─────────────────────────────────────────────────────────────
 *
 * ## 왜 환매 준비 포인트가 필요한가
 *
 * 기존 구조는 매도 시 판매자에게 PO 를 지급하면서 아무 데서도 차감하지 않았다.
 *
 *   매수: 구매자 −P,  크리에이터 +P    → 총량 보존
 *   매도: 판매자 +P,  차감 주체 없음    → 총량 증가 (무한 발행)
 *
 * 충전 → 매수 → 매도 를 반복하면 포인트가 무제한 늘어난다.
 * 발행시장에서 산 주식을 시스템이 무조건 되사 주는 구조 때문이다.
 *
 * ## 해결
 *
 * 발행시장 매수 대금을 둘로 나눈다.
 *
 *   매수 10,000 PO
 *     ├─ 5,000 → 크리에이터 자유 잔고 (즉시 사용 가능)
 *     └─ 5,000 → 종목의 환매 준비 포인트 (매도 시 지급 재원)
 *
 * 매도는 이 풀에서 지급하므로 총량이 보존된다.
 * 풀이 마르면 발행시장 매도는 막히고, 호가창(주주 간 거래)으로만 팔 수 있다.
 * 주주가 늘어 호가창이 살아나면 자연스럽게 그쪽이 주 시장이 된다.
 */

/**
 * 발행시장 매수 대금 중 환매 준비 포인트로 적립할 비율 (0~1).
 *
 * 초기에는 높게 잡아 "언제든 팔 수 있다"는 신뢰를 주고,
 * 호가창에 거래가 붙으면 낮춰 크리에이터 몫을 늘리는 식으로 운영한다.
 */
const BUYBACK_RESERVE_RATE = (() => {
  const raw = parseFloat(process.env.BUYBACK_RESERVE_RATE);
  if (!Number.isFinite(raw) || raw < 0 || raw > 1) return 0.5;
  return raw;
})();

/**
 * 환매(발행시장 매도) 자체를 켤지 여부.
 * false 로 두면 매도는 호가창에서만 가능해진다.
 */
const BUYBACK_ENABLED = process.env.BUYBACK_ENABLED !== 'false';

/** 매수 금액에서 준비 포인트로 갈 몫과 크리에이터 몫을 나눈다. */
function splitPurchase(totalCost) {
  const total = Math.max(0, Math.floor(Number(totalCost) || 0));
  const reserve = Math.floor(total * BUYBACK_RESERVE_RATE);
  return {
    total,
    toReserve: reserve,
    toCreator: total - reserve,
  };
}

const BUYBACK_UNAVAILABLE_MESSAGE =
  '지금은 발행시장 환매가 불가능합니다. 호가창에 매도 주문을 올리면 다른 주주와 거래할 수 있어요.';

const BUYBACK_INSUFFICIENT_MESSAGE =
  '이 종목의 환매 준비 포인트가 부족합니다. 호가창에 매도 주문을 올려 다른 주주와 거래해 주세요.';

module.exports = {
  BUYBACK_RESERVE_RATE,
  BUYBACK_ENABLED,
  splitPurchase,
  BUYBACK_UNAVAILABLE_MESSAGE,
  BUYBACK_INSUFFICIENT_MESSAGE,
};
