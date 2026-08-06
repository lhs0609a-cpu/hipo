/**
 * OAuth 리다이렉트 결과 수신.
 *
 * ## 왜 필요한가
 *
 * 구글 로그인은 브라우저를 백엔드로 통째로 보냈다가 돌아오는 흐름이라,
 * 인증이 끝난 시점의 실행 주체가 **우리 앱이 아니라 백엔드**다.
 *
 * 예전에는 백엔드 콜백이 `localStorage.setItem('accessToken', ...)` 하는 HTML 을
 * 돌려주고 앱으로 리다이렉트했다. 그런데 그 localStorage 는 백엔드 오리진
 * (hipo-backend.fly.dev)의 저장소다. localStorage 는 오리진별로 격리되므로
 * Vercel 에 올라간 앱에서는 절대 읽을 수 없었다.
 * 구글 인증은 통과하는데 앱은 로그아웃 상태로 남는 상태였다.
 *
 * 이제 백엔드는 토큰 대신 **일회용 코드**만 URL 로 넘긴다
 * (`?authCode=...` 또는 `hipo://auth?authCode=...`).
 * 이 모듈은 그 코드를 꺼내오고, 주소창에서 지우는 일을 한다.
 * 코드를 토큰으로 바꾸는 건 AuthContext.loginWithGoogleCode 가 한다.
 */

import { Linking, Platform } from 'react-native';

const CODE_PARAM = 'authCode';
const ERROR_PARAM = 'error';

/**
 * URL 에서 쿼리 파라미터 하나를 읽는다.
 *
 * `URL`/`URLSearchParams` 대신 정규식을 쓰는 이유: 네이티브(Hermes)에는 이들이
 * 완전히 구현돼 있지 않고, 커스텀 스킴(`hipo://auth?...`)은 표준 URL 파서가
 * 제대로 다루지 못하는 경우가 있다. 웹 URL 과 딥링크를 한 코드로 처리한다.
 */
function paramFromUrl(url, name) {
  if (!url || typeof url !== 'string') return null;
  const match = new RegExp(`[?&#]${name}=([^&#]+)`).exec(url);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch (e) {
    return match[1];
  }
}

export function extractAuthCode(url) {
  return paramFromUrl(url, CODE_PARAM);
}

export function extractAuthError(url) {
  return paramFromUrl(url, ERROR_PARAM);
}

/**
 * 브라우저 주소창에서 OAuth 파라미터를 지운다.
 *
 * 코드는 일회용이라 새로고침하면 서버가 거절한다. 주소에 남겨 두면
 * 새로고침할 때마다 "만료된 코드" 오류가 뜨고, 링크를 공유하면 남에게
 * 인증 코드가 노출된다. 다른 파라미터(추천 코드 등)는 보존한다.
 */
function stripFromBrowserUrl() {
  if (Platform.OS !== 'web') return;
  if (typeof window === 'undefined' || !window.history?.replaceState) return;

  try {
    const { origin, pathname, hash } = window.location;
    const params = new URLSearchParams(window.location.search);
    params.delete(CODE_PARAM);
    params.delete(ERROR_PARAM);
    const query = params.toString();
    window.history.replaceState(
      {},
      '',
      `${origin}${pathname}${query ? `?${query}` : ''}${hash || ''}`
    );
  } catch (e) {
    /* 주소 정리에 실패해도 로그인 자체는 진행돼야 한다 */
  }
}

/**
 * 앱 시작 시 대기 중인 OAuth 결과를 한 번 꺼낸다.
 *
 * 웹은 현재 주소를, 네이티브는 앱을 깨운 딥링크(콜드 스타트)를 본다.
 *
 * @returns {Promise<{ code: string|null, error: string|null }>}
 */
export async function consumePendingAuthResult() {
  let url = null;

  if (Platform.OS === 'web') {
    url = typeof window !== 'undefined' ? window.location.href : null;
  } else {
    url = await Linking.getInitialURL().catch(() => null);
  }

  const code = extractAuthCode(url);
  const error = extractAuthError(url);

  if (code || error) stripFromBrowserUrl();

  return { code, error };
}

/**
 * 앱이 떠 있는 동안 도착하는 딥링크에서 인증 코드를 받는다 (네이티브 전용).
 *
 * 웹은 OAuth 리다이렉트가 전체 페이지 로드라 consumePendingAuthResult 로 충분하다.
 *
 * @param {(code: string) => void} onCode
 * @returns {Function} 해제 함수
 */
export function startAuthCodeListener(onCode) {
  if (Platform.OS === 'web') return () => {};

  const sub = Linking.addEventListener('url', ({ url }) => {
    const code = extractAuthCode(url);
    if (code) onCode(code);
  });

  return () => {
    if (sub?.remove) sub.remove();
  };
}

export default {
  extractAuthCode,
  extractAuthError,
  consumePendingAuthResult,
  startAuthCodeListener,
};
