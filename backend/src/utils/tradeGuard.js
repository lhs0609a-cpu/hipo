/**
 * 거래 가드
 *
 * 초상권/퍼블리시티권 보호: 본인이 확인·동의하지 않은 인물의 종목은 거래할 수 없다.
 *
 * 현재 정책상 동의 전에는 종목(Stock) 자체가 생성되지 않으므로
 * (virtualCelebrityController.createVirtualCelebrity 참조) 이 가드에 걸릴 일은
 * 원칙적으로 없다. 구버전 데이터에 남아 있는 isVirtualListing 종목을 막기 위한
 * 2차 방어선으로 유지한다.
 *
 * 이 가드에는 우회 스위치를 두지 않는다. 환경변수 하나로 동의 없는 인물의 거래가
 * 열리는 상황을 만들지 않기 위함이다.
 */
const { UNCLAIMED_TRADE_MESSAGE } = require('./publicityGuard');

/**
 * 종목이 거래 가능한지 검사.
 * @param {object} stock Stock 인스턴스
 * @returns {{ ok: boolean, message?: string }}
 */
function checkTradable(stock) {
  if (stock && stock.isVirtualListing === true) {
    return { ok: false, message: UNCLAIMED_TRADE_MESSAGE };
  }
  return { ok: true };
}

module.exports = {
  checkTradable,
  UNCLAIMED_TRADE_MESSAGE,
};
