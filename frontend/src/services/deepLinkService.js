import { Linking, Platform, Share } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { APP_SCHEME, WEB_ORIGIN, stockUrl, inviteUrl } from '../utils/shareLinks';
import { captureFromUrl } from './pendingReferral';

const WEB_URL = WEB_ORIGIN;

/**
 * 딥링크 설정.
 *
 * ⚠️ config.screens 의 키는 **실제 마운트된 네비게이터의 화면 이름**과 같아야 한다.
 *
 * AppNavigator 는 NavigationContainer 안에 `<MainStack />` 또는 `<AuthStack />` 을
 * 조건부로 직접 렌더한다. 즉 루트 네비게이터는 그 안의 Stack.Navigator 이고,
 * 화면 이름은 'MainTabs', 'StockDetail', 'Login' … 이다.
 * 'MainStack' / 'AuthStack' 이라는 이름의 화면은 존재하지 않는다.
 *
 * 예전 설정은 그 둘로 한 겹 더 감싸고 있어서 어떤 경로도 매칭되지 않았다.
 * 로그인 여부에 따라 둘 중 하나만 마운트되므로, 양쪽 화면을 한 맵에 평탄하게
 * 두면 된다 (존재하지 않는 이름은 무시된다).
 */
export const linking = {
  prefixes: [`${APP_SCHEME}://`, WEB_URL],
  config: {
    screens: {
      // --- 로그인 후 (MainStack) ---
      MainTabs: {
        screens: {
          Home: 'home',
          Community: 'feed',
          Menu: 'menu',
        },
      },
      StockDetail: 'stock/:stockId',
      UserProfile: 'user/:userId',
      Portfolio: 'portfolio',
      Ranking: 'ranking',
      CelebSuggestion: 'suggest',
      Search: 'search',
      Invite: 'invite/:code',
      StockMarket: 'market',
      Dividend: 'dividend',
      CopyTrading: 'top-investors',

      // --- 로그인 전 (AuthStack) ---
      Login: 'login',
      Register: 'register',
    },
  },
};

/**
 * 딥링크 URL 생성
 */
export function createDeepLink(path, params = {}) {
  const queryString = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const url = `${WEB_URL}/${path}${queryString ? `?${queryString}` : ''}`;
  return url;
}

/**
 * 주식 공유 링크 생성.
 *
 * 예전에는 `ref: 'share'` 라는 리터럴을 붙였다. 추천 코드가 아니라 고정 문자열이라
 * 누가 데려온 유입인지 알 수 없었다. 이제 실제 추천 코드를 받는다.
 *
 * @param {string} stockId
 * @param {string} [referralCode] 공유하는 사람의 추천 코드
 */
export function createStockShareLink(stockId, referralCode) {
  return stockUrl(stockId, referralCode);
}

/**
 * 초대 링크 생성
 */
export function createInviteLink(username, referralCode) {
  return inviteUrl(referralCode);
}

/**
 * 딥링크에서 추천 코드를 잡아 저장한다.
 *
 * 앱 시작 시 한 번 호출하면 콜드 스타트(getInitialURL)와
 * 실행 중 수신(addEventListener) 양쪽을 처리한다.
 *
 * 코드는 가입/로그인 후 pendingReferral.redeem() 이 서버에 적용한다.
 *
 * @returns {Function} 해제 함수
 */
export function startReferralCapture() {
  Linking.getInitialURL()
    .then((url) => {
      if (url) captureFromUrl(url);
    })
    .catch(() => {});

  const sub = Linking.addEventListener('url', ({ url }) => {
    if (url) captureFromUrl(url);
  });

  return () => {
    if (sub?.remove) sub.remove();
  };
}

/**
 * 수익 인증 공유
 */
export async function shareProfitCard({
  username,
  referralCode,
  profitRate,
  totalProfit,
  totalDividend,
  period,
}) {
  const profitSign = profitRate >= 0 ? '+' : '';
  const message = [
    `HIPO에서 ${period || '이번 달'} 수익률 ${profitSign}${profitRate?.toFixed(2)}% 달성!`,
    totalProfit ? `총 수익: ${profitSign}${totalProfit?.toLocaleString()} PO` : '',
    totalDividend ? `배당금: ${totalDividend?.toLocaleString()} PO` : '',
    '',
    '크리에이터 주식 투자, 지금 시작해보세요!',
    createInviteLink(username, referralCode),
  ].filter(Boolean).join('\n');

  try {
    if (Platform.OS === 'web') {
      if (navigator.share) {
        await navigator.share({ text: message });
      } else {
        await navigator.clipboard.writeText(message);
        alert('클립보드에 복사되었습니다!');
      }
    } else {
      await Share.share({
        message,
        title: 'HIPO 투자 성적표',
      });
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 주식 공유
 */
export async function shareStock({ stockId, stockName, price, change, referralCode }) {
  const changeSign = change >= 0 ? '+' : '';
  const message = [
    `${stockName} 주식 ${changeSign}${change?.toFixed(2)}%`,
    `현재가: ${price?.toLocaleString()} PO`,
    '',
    'HIPO에서 크리에이터에 투자하세요!',
    createStockShareLink(stockId, referralCode),
  ].join('\n');

  try {
    if (Platform.OS === 'web') {
      if (navigator.share) {
        await navigator.share({ text: message });
      } else {
        await navigator.clipboard.writeText(message);
        alert('클립보드에 복사되었습니다!');
      }
    } else {
      await Share.share({ message, title: `${stockName} - HIPO` });
    }
    return true;
  } catch (e) {
    return false;
  }
}

export default {
  linking,
  createDeepLink,
  createStockShareLink,
  createInviteLink,
  startReferralCapture,
  shareProfitCard,
  shareStock,
};
