/**
 * 기능 플래그
 *
 * CASH_OUT_ENABLED: PO/코인을 현실 화폐로 인출(정산/출금)하는 기능 활성화 여부.
 *
 * 법적 사유로 기본값은 false (게임머니 모델).
 * - 충전(현금→PO)과 앱 내 거래는 허용하되, PO를 다시 현금으로 환전하는 통로는 차단한다.
 * - 현금 인출이 가능해지면 자본시장법/유사수신/사행성 규제 대상이 될 수 있으므로,
 *   금융 인허가 및 법률 검토가 끝나기 전에는 켜지 않는다.
 *
 * 환경변수 CASH_OUT_ENABLED=true 로 명시적으로 설정한 경우에만 활성화된다.
 */
const CASH_OUT_ENABLED = process.env.CASH_OUT_ENABLED === 'true';

// 현금 인출 차단 시 클라이언트에 내려줄 표준 안내 메시지
const CASH_OUT_DISABLED_MESSAGE =
  '현재 PO/코인의 현금 인출(정산·출금) 기능은 제공되지 않습니다. ' +
  '충전한 포인트는 앱 내 거래와 활동에만 사용할 수 있습니다.';

module.exports = {
  CASH_OUT_ENABLED,
  CASH_OUT_DISABLED_MESSAGE
};
