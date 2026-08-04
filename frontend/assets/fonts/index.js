/**
 * 폰트 에셋 매니페스트
 *
 * ─────────────────────────────────────────────────────────────
 *  적용 방법 (2단계, 1분)
 *
 *  1. https://github.com/orioncactus/pretendard/releases 에서
 *     Pretendard(.otf) 패키지를 받아 아래 5개 파일을 이 폴더에 넣는다.
 *
 *       Pretendard-Regular.otf
 *       Pretendard-Medium.otf
 *       Pretendard-SemiBold.otf
 *       Pretendard-Bold.otf
 *       Pretendard-ExtraBold.otf
 *
 *  2. 아래 module.exports 두 줄을 서로 바꾼다.
 *     (null 을 주석 처리하고, 객체의 주석을 해제)
 * ─────────────────────────────────────────────────────────────
 *
 * 왜 이렇게 해두었나:
 * Metro 번들러는 require 를 정적으로 해석한다. 파일이 없는데 require 가 코드에
 * 남아 있으면 번들이 통째로 실패한다. 그래서 기본값을 null 로 두어, 폰트 파일이
 * 없어도 앱이 정상적으로 뜨고 시스템 폰트로 폴백하게 했다.
 */

module.exports = null;

// ── 폰트 파일을 넣은 뒤 위 줄을 지우고 아래 주석을 해제하세요 ──
//
// module.exports = {
//   'Pretendard-Regular': require('./Pretendard-Regular.otf'),
//   'Pretendard-Medium': require('./Pretendard-Medium.otf'),
//   'Pretendard-SemiBold': require('./Pretendard-SemiBold.otf'),
//   'Pretendard-Bold': require('./Pretendard-Bold.otf'),
//   'Pretendard-ExtraBold': require('./Pretendard-ExtraBold.otf'),
// };
