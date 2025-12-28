// 환경별 설정
const ENV = {
  development: {
    // HIPO 전용 포트 5555 사용 (다른 프로젝트와 충돌 방지)
    API_URL: 'http://localhost:5555/api',
    SOCKET_URL: 'http://localhost:5555',

    // 모바일 테스트 시 PC IP 사용 (같은 Wi-Fi)
    // API_URL: 'http://192.168.0.100:5555/api',
    // SOCKET_URL: 'http://192.168.0.100:5555',
  },
  production: {
    API_URL: 'https://backend-hh85487uz-fewfs-projects-83cc0821.vercel.app/api',
    SOCKET_URL: 'https://backend-hh85487uz-fewfs-projects-83cc0821.vercel.app',
  },
};

// 현재 환경 (development 또는 production)
const CURRENT_ENV = __DEV__ ? 'development' : 'production';

// 현재 환경의 설정 내보내기
export const API_URL = ENV[CURRENT_ENV].API_URL;
export const SOCKET_URL = ENV[CURRENT_ENV].SOCKET_URL;

export default {
  API_URL,
  SOCKET_URL,
};
