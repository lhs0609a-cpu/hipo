/**
 * API 엔드포인트 설정
 *
 * ## 왜 바꿨나
 *
 * 예전에는 production 주소가 Vercel 프리뷰 URL 로 하드코딩돼 있었다.
 *
 *   https://backend-hh85487uz-fewfs-projects-83cc0821.vercel.app/api
 *
 * 프리뷰 배포는 수명이 짧아 이미 사라졌고(404 DEPLOYMENT_NOT_FOUND),
 * 그 결과 웹 빌드에서 로그인·구글 연동이 전부 실패했다.
 * 배포 주소가 바뀔 때마다 코드를 고쳐 다시 빌드해야 하는 구조였다.
 *
 * ## 지금 방식 (우선순위 순)
 *
 *  1. EXPO_PUBLIC_API_URL 환경변수 — 배포 때 주입한다. 코드 수정 불필요
 *  2. 개발 중(__DEV__)이면 localhost:5555
 *  3. 그 외에는 배포된 백엔드 (Fly.io)
 *
 * 배포 예:
 *   EXPO_PUBLIC_API_URL=https://api.hipo.app npx expo export --platform web
 */

import { Platform } from 'react-native';

/** HIPO 전용 포트 5555 (다른 프로젝트와 충돌 방지) */
const DEV_HOST = 'http://localhost:5555';

/** 배포된 백엔드 (Fly.io, 도쿄 리전) */
const PROD_HOST = 'https://hipo-backend.fly.dev';

/** 끝의 슬래시와 중복 /api 를 정리한다 */
const normalize = (raw) => {
  if (!raw) return null;
  const trimmed = String(raw).trim().replace(/\/+$/, '');
  return trimmed.replace(/\/api$/, '');
};

/** Metro 개발 서버에서 실행 중인지 (웹) */
const isLocalDevServer = () => {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined' || !window.location) return false;
  const { hostname } = window.location;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
};

const resolveBase = () => {
  // 1) 명시적 환경변수가 최우선.
  //    프론트와 백엔드를 한 도메인에 올렸다면 여기에 그 주소를 넣는다.
  const fromEnv = normalize(process.env.EXPO_PUBLIC_API_URL);
  if (fromEnv) return fromEnv;

  // 2) 개발 중이면 로컬 백엔드
  //    (__DEV__ 는 Expo 가 주입한다. 웹 Metro 서버도 여기 해당)
  if (typeof __DEV__ !== 'undefined' && __DEV__) return DEV_HOST;
  if (isLocalDevServer()) return DEV_HOST;

  // 3) 배포 기본값
  return PROD_HOST;
};

/** 프로토콜+호스트만 (경로 없음). 소켓·OAuth 리다이렉트에 쓴다. */
export const API_BASE = resolveBase();

/** REST 기본 경로 */
export const API_URL = `${API_BASE}/api`;

/** Socket.IO 접속 주소 */
export const SOCKET_URL = normalize(process.env.EXPO_PUBLIC_SOCKET_URL) || API_BASE;

/** 설정이 개발용 기본값에 머물러 있는지 (안내 문구용) */
export const IS_LOCAL_API = API_BASE === DEV_HOST;

export default {
  API_BASE,
  API_URL,
  SOCKET_URL,
  IS_LOCAL_API,
};
