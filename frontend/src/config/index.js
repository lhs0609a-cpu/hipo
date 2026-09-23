// 앱 전역 API/소켓 주소의 단일 출처.
// axios 인스턴스(api/client.js, services/api.js), fetch 래퍼(services/apiService.js),
// 소켓 클라이언트(services/socketService.js, services/shareholderSocketService.js)가 모두 여기를 참조한다.
// 새 클라이언트를 추가할 때 URL을 하드코딩하지 말 것.

// HIPO 로컬 개발 포트 (다른 프로젝트와 충돌 방지). backend/.env 의 PORT와 일치해야 한다.
const DEV_HOST = 'localhost';
const DEV_PORT = 5555;

// 배포된 백엔드 (backend/fly.toml 의 app = 'hipo-backend')
const PROD_ORIGIN = 'https://hipo-backend.fly.dev';

const ENV = {
  development: {
    // 실기기로 테스트할 때는 localhost 대신 PC의 LAN IP로 바꿀 것 (예: 192.168.0.100)
    SOCKET_URL: `http://${DEV_HOST}:${DEV_PORT}`,
    API_URL: `http://${DEV_HOST}:${DEV_PORT}/api`,
  },
  production: {
    SOCKET_URL: PROD_ORIGIN,
    API_URL: `${PROD_ORIGIN}/api`,
  },
};

// __DEV__ 는 React Native 전역. 웹 번들 등 정의되지 않은 환경에서는 production으로 간주한다.
const CURRENT_ENV =
  typeof __DEV__ !== 'undefined' && __DEV__ ? 'development' : 'production';

const overrideOrigin = process.env.EXPO_PUBLIC_API_ORIGIN?.replace(/\/$/, '');
export const API_URL = overrideOrigin ? `${overrideOrigin}/api` : ENV[CURRENT_ENV].API_URL;
export const SOCKET_URL = overrideOrigin || ENV[CURRENT_ENV].SOCKET_URL;

export default {
  API_URL,
  SOCKET_URL,
};
