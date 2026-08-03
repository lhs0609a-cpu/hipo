/**
 * 공통 유효성 검사 유틸리티
 */

// =====================================================
// Pagination 설정
// =====================================================
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,        // 최대 한 번에 가져올 수 있는 개수
  MAX_OFFSET: 10000,     // 최대 오프셋 (과도한 페이징 방지)
};

/**
 * Pagination 파라미터 검증 및 정규화
 * @param {object} params - { page, limit, offset }
 * @returns {{ page: number, limit: number, offset: number }}
 */
function validatePagination(params = {}) {
  let { page, limit, offset } = params;

  // page 검증 (radix 10 명시)
  const parsedPage = parseInt(page, 10);
  page = isNaN(parsedPage) ? PAGINATION.DEFAULT_PAGE : parsedPage;
  page = Math.max(1, page);

  // limit 검증 (최대값 제한, radix 10 명시)
  const parsedLimit = parseInt(limit, 10);
  limit = isNaN(parsedLimit) ? PAGINATION.DEFAULT_LIMIT : parsedLimit;
  limit = Math.max(1, Math.min(limit, PAGINATION.MAX_LIMIT));

  // offset 계산 또는 검증
  if (offset !== undefined) {
    const parsedOffset = parseInt(offset, 10);
    offset = isNaN(parsedOffset) ? 0 : parsedOffset;
    offset = Math.max(0, Math.min(offset, PAGINATION.MAX_OFFSET));
  } else {
    offset = (page - 1) * limit;
    offset = Math.min(offset, PAGINATION.MAX_OFFSET);
  }

  return { page, limit, offset };
}

// =====================================================
// 숫자 입력 검증
// =====================================================

/**
 * 양의 정수 검증
 * @param {any} value - 검증할 값
 * @param {object} options - { min, max, defaultValue }
 * @returns {number}
 */
function validatePositiveInt(value, options = {}) {
  const { min = 1, max = Number.MAX_SAFE_INTEGER, defaultValue = null } = options;

  // radix 10 명시하여 8진수 파싱 방지
  const num = parseInt(value, 10);

  if (isNaN(num) || num < min) {
    if (defaultValue !== null) return defaultValue;
    throw new Error(`값은 ${min} 이상의 정수여야 합니다`);
  }

  return Math.min(num, max);
}

/**
 * 양의 실수 검증 (금액 등)
 * @param {any} value - 검증할 값
 * @param {object} options - { min, max, defaultValue, precision }
 * @returns {number}
 */
function validatePositiveNumber(value, options = {}) {
  const { min = 0, max = Number.MAX_SAFE_INTEGER, defaultValue = null, precision = 2 } = options;

  const num = parseFloat(value);

  if (isNaN(num) || num < min) {
    if (defaultValue !== null) return defaultValue;
    throw new Error(`값은 ${min} 이상이어야 합니다`);
  }

  const result = Math.min(num, max);
  return Number(result.toFixed(precision));
}

// =====================================================
// 문자열 입력 검증
// =====================================================

/**
 * 문자열 길이 검증 및 정리
 * @param {string} value - 검증할 문자열
 * @param {object} options - { minLength, maxLength, trim, defaultValue }
 * @returns {string}
 */
function validateString(value, options = {}) {
  const { minLength = 0, maxLength = 1000, trim = true, defaultValue = '' } = options;

  if (value === undefined || value === null) {
    return defaultValue;
  }

  let str = String(value);

  if (trim) {
    str = str.trim();
  }

  if (str.length < minLength) {
    throw new Error(`문자열은 최소 ${minLength}자 이상이어야 합니다`);
  }

  if (str.length > maxLength) {
    str = str.substring(0, maxLength);
  }

  return str;
}

/**
 * 검색어 정리 (XSS 방지, 길이 제한)
 * @param {string} query - 검색어
 * @param {number} maxLength - 최대 길이
 * @returns {string}
 */
function sanitizeSearchQuery(query, maxLength = 100) {
  if (!query) return '';

  return String(query)
    .trim()
    .substring(0, maxLength)
    .replace(/[<>'"]/g, ''); // 기본 XSS 방지
}

// =====================================================
// UUID 검증
// =====================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * UUID 형식 검증
 * @param {string} value - 검증할 UUID
 * @returns {boolean}
 */
function isValidUUID(value) {
  return UUID_REGEX.test(value);
}

/**
 * UUID 검증 (예외 발생)
 * @param {string} value - 검증할 UUID
 * @param {string} fieldName - 필드명 (에러 메시지용)
 * @returns {string}
 */
function validateUUID(value, fieldName = 'ID') {
  if (!isValidUUID(value)) {
    throw new Error(`유효하지 않은 ${fieldName} 형식입니다`);
  }
  return value;
}

// =====================================================
// 날짜 검증
// =====================================================

/**
 * 날짜 기간 검증
 * @param {string} period - 기간 ('1d', '1w', '1m', '3m', '1y', 'all')
 * @returns {string}
 */
function validatePeriod(period, allowedPeriods = ['1d', '1w', '1m', '3m', '1y', 'all']) {
  const defaultPeriod = '1m';

  if (!period || !allowedPeriods.includes(period)) {
    return defaultPeriod;
  }

  return period;
}

module.exports = {
  PAGINATION,
  validatePagination,
  validatePositiveInt,
  validatePositiveNumber,
  validateString,
  sanitizeSearchQuery,
  isValidUUID,
  validateUUID,
  validatePeriod,
};
