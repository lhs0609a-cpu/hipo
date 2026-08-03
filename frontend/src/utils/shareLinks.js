/**
 * 공유 링크 생성 — 단일 소스.
 *
 * 예전에는 링크를 만드는 곳이 흩어져 있었고 도메인도 서로 달랐다.
 *   ShareModal        → https://hipo.kr
 *   deepLinkService   → https://hipo.app
 *   viralController   → https://hipo.app
 * 앱은 hipo.app 만 받도록 설정돼 있어서, ShareModal 로 공유한 링크는
 * 눌러도 앱이 열리지 않았다. 링크 생성은 전부 이 파일을 거친다.
 *
 * 모든 링크에는 추천 코드(ref)를 붙인다. 이게 없으면 유입이 누구 덕인지
 * 추적되지 않아 초대 보상이 지급되지 않는다.
 */

/** 커스텀 스킴. app.json 의 expo.scheme 과 반드시 같아야 한다. */
export const APP_SCHEME = 'hipo';

/** 웹 폴백 도메인. 앱 미설치 사용자가 여기로 떨어진다. */
export const WEB_ORIGIN = 'https://hipo.app';

const withParams = (base, params = {}) => {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  if (entries.length === 0) return base;
  const qs = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return `${base}${base.includes('?') ? '&' : '?'}${qs}`;
};

/**
 * 종목 링크. 받는 사람이 눌렀을 때 그 종목 화면으로 바로 간다.
 * @param {string} stockId
 * @param {string} [referralCode] 공유하는 사람의 추천 코드
 */
export const stockUrl = (stockId, referralCode) =>
  withParams(`${WEB_ORIGIN}/stock/${stockId}`, { ref: referralCode });

/** 초대 전용 링크 */
export const inviteUrl = (referralCode) =>
  referralCode ? `${WEB_ORIGIN}/invite/${referralCode}` : WEB_ORIGIN;

/** 게시물 링크 */
export const postUrl = (postId, referralCode) =>
  withParams(`${WEB_ORIGIN}/post/${postId}`, { ref: referralCode });

/** 프로필 링크 */
export const profileUrl = (username, referralCode) =>
  withParams(`${WEB_ORIGIN}/u/${username}`, { ref: referralCode });

/** 홈 */
export const homeUrl = (referralCode) => withParams(WEB_ORIGIN, { ref: referralCode });

/**
 * 링크에서 추천 코드를 뽑아낸다.
 * `/invite/CODE` 형태와 `?ref=CODE` 형태를 모두 처리한다.
 */
export const extractReferralCode = (url) => {
  if (!url || typeof url !== 'string') return null;

  const inviteMatch = url.match(/\/invite\/([A-Za-z0-9_-]+)/);
  if (inviteMatch) return inviteMatch[1];

  const refMatch = url.match(/[?&]ref=([A-Za-z0-9_-]+)/);
  if (refMatch) {
    // deepLinkService 가 예전에 ref='share' 같은 리터럴을 붙이던 흔적을 걸러낸다
    const code = refMatch[1];
    return code === 'share' ? null : code;
  }

  return null;
};

export default {
  APP_SCHEME,
  WEB_ORIGIN,
  stockUrl,
  inviteUrl,
  postUrl,
  profileUrl,
  homeUrl,
  extractReferralCode,
};
