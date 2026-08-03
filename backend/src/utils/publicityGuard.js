/**
 * 퍼블리시티 가드
 *
 * 본인이 동의(인수·인증)하지 않은 실존 인물 프로필을 다룰 때의 단일 정책 지점.
 *
 * 정책 (동의 전에는 다음을 하지 않는다)
 *  1. 값을 매기지 않는다   — 주가·시가총액·등락률을 만들지도, 노출하지도 않는다.
 *  2. 얼굴을 쓰지 않는다   — 실사진 대신 이니셜 플레이스홀더만 내려보낸다.
 *  3. 줄을 세우지 않는다   — 전체 순위·백분위·하위 노출 금지. 상위 N만.
 *  4. 내려가지 않는다     — 기대지수는 단조 증가. 감소하면 "평가 하락 공표"가 된다.
 *  5. 신원정보를 최소화한다 — 실명·SNS 링크 등 식별정보는 공개 응답에서 제외한다.
 *
 * 이 정책의 배경은 문서 `docs/PUBLICITY_POLICY.md` 참고.
 */

/** 공개 목록에 한 번에 노출할 수 있는 최대 인원. 전체 랭킹을 만들지 않기 위한 상한. */
const PUBLIC_LIST_MAX = 30;

/** 동의 전 프로필의 공개 응답에서 반드시 제거되는 필드 */
const IDENTITY_FIELDS = [
  'realName',
  'newsKeywords',
  'externalLinks',
  'email',
  'profileImage',
];

/** 동의 전 프로필의 공개 응답에서 반드시 제거되는 금전 필드 */
const VALUATION_FIELDS = [
  'marketCap',
  'sharePrice',
  'priceChangePercent',
  'marketCapTotal',
  'issuedShares',
  'shareholderCount',
  'totalShares',
  'availableShares',
];

const UNCLAIMED_TRADE_MESSAGE =
  '본인 확인이 완료되지 않은 인물은 거래할 수 없습니다. ' +
  '해당 인물이 직접 본인 확인을 완료하면 상장되어 거래가 시작됩니다.';

const UNCLAIMED_NOTICE =
  '아직 본인 확인이 완료되지 않았습니다. 이 페이지는 상장을 기다리는 이용자 수만 표시하며, ' +
  '해당 인물에 대한 평가나 가치를 나타내지 않습니다.';

/**
 * 표시 이름에서 이니셜 한 글자를 뽑는다. 실사진 대신 쓸 플레이스홀더 용도.
 * @param {string} name
 * @returns {string}
 */
function initialOf(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

/**
 * 동의 전(unclaimed) 인물 프로필을 공개 응답용으로 정제한다.
 *
 * Sequelize 인스턴스와 평범한 객체 모두 받는다.
 * 본인 확인이 끝난(claimed) 프로필은 그대로 통과시킨다.
 *
 * @param {object} user User 인스턴스 또는 plain object
 * @param {object} [opts]
 * @param {number} [opts.expectationScore] 함께 실어 보낼 기대지수
 * @returns {object|null} 정제된 평범한 객체
 */
function sanitizeProfile(user, opts = {}) {
  if (!user) return null;
  const plain = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };

  const isUnclaimed = plain.isVirtual === true && plain.virtualStatus !== 'claimed';
  if (!isUnclaimed) return plain;

  for (const field of IDENTITY_FIELDS) delete plain[field];
  for (const field of VALUATION_FIELDS) delete plain[field];

  // 주식 관계가 실려 있으면 통째로 제거한다. 동의 전에는 종목 자체가 없어야 정상이지만,
  // 구버전 데이터가 남아 있을 수 있으므로 방어적으로 막는다.
  delete plain.issuedStock;
  delete plain.stock;

  plain.avatarInitial = initialOf(plain.displayName || plain.username);
  plain.isListed = false;
  plain.tradable = false;
  plain.notice = UNCLAIMED_NOTICE;

  if (opts.expectationScore != null) {
    plain.expectationScore = opts.expectationScore;
  }

  return plain;
}

/**
 * 목록 응답 정제. 상위 N 으로 잘라 전체 랭킹이 만들어지지 않게 한다.
 *
 * @param {Array} users
 * @param {object} [opts]
 * @param {number} [opts.limit]
 * @returns {Array}
 */
function sanitizeProfileList(users, opts = {}) {
  const limit = Math.min(opts.limit || PUBLIC_LIST_MAX, PUBLIC_LIST_MAX);
  return (users || []).slice(0, limit).map((u) => sanitizeProfile(u, opts));
}

/**
 * 기대지수는 단조 증가한다. 어떤 경로로도 줄어들 수 없게 여기서 강제한다.
 *
 * @param {number} current 현재 점수
 * @param {number} delta 더할 값 (음수는 무시)
 * @returns {number}
 */
function bumpExpectation(current, delta = 1) {
  const base = Number(current) || 0;
  const inc = Number(delta);
  if (!Number.isFinite(inc) || inc <= 0) return base;
  return base + Math.floor(inc);
}

module.exports = {
  PUBLIC_LIST_MAX,
  IDENTITY_FIELDS,
  VALUATION_FIELDS,
  UNCLAIMED_TRADE_MESSAGE,
  UNCLAIMED_NOTICE,
  initialOf,
  sanitizeProfile,
  sanitizeProfileList,
  bumpExpectation,
};
