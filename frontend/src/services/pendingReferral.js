/**
 * 보류 중인 추천 코드.
 *
 * ## 왜 필요한가
 *
 * 초대 링크(`hipo.app/invite/ABC123`)를 누른 사람은 대부분 **아직 가입 전**이다.
 * 그런데 `Invite` 화면은 로그인 후 스택(MainStack)에만 있고, 추천 코드를 적용하는
 * `POST /viral/referral/apply` 도 인증이 필요하다.
 *
 * 그래서 예전에는 초대 링크로 들어온 신규 유저가 추천인에 **전혀 연결되지 않았다.**
 * 공유는 되는데 보상이 안 나가니 초대 루프가 돌지 않았다.
 *
 * ## 해결
 *
 * 링크로 들어온 시점에 코드를 저장해 두고, 로그인/가입이 끝난 뒤 적용한다.
 *
 *   딥링크 수신 → capture(code) → (가입/로그인) → redeem() → 서버에 적용
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
// viralReferralAPI 를 쓴다. referralAPI.apply 는 백엔드에 대응 라우트가 없어 404 다
// (/api/referrals 에는 /apply 가 없고, 실제 구현은 /api/viral/referral/apply).
import { viralReferralAPI } from './api';
import { extractReferralCode } from '../utils/shareLinks';

const STORAGE_KEY = '@hipo_pending_referral';

/** 오래된 코드는 무시한다 (7일) */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 딥링크 URL 에서 추천 코드를 뽑아 저장한다.
 * 이미 저장된 코드가 있으면 덮어쓰지 않는다 (최초 유입 출처를 유지).
 *
 * @param {string} url
 * @returns {Promise<string|null>} 저장된 코드
 */
export async function captureFromUrl(url) {
  const code = extractReferralCode(url);
  if (!code) return null;

  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (existing) {
      const parsed = JSON.parse(existing);
      if (parsed?.code && Date.now() - (parsed.savedAt || 0) < MAX_AGE_MS) {
        return parsed.code; // 최초 유입 출처 유지
      }
    }
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ code, savedAt: Date.now() })
    );
    return code;
  } catch (e) {
    return code;
  }
}

/** 저장된 코드 조회 (만료됐으면 null) */
export async function peek() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.code) return null;
    if (Date.now() - (parsed.savedAt || 0) > MAX_AGE_MS) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.code;
  } catch (e) {
    return null;
  }
}

export async function clear() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    /* 무시 */
  }
}

/**
 * 저장된 코드를 서버에 적용한다. 로그인 직후에 호출한다.
 *
 * 실패해도 예외를 던지지 않는다 — 추천 적용 실패가 로그인을 막으면 안 된다.
 * "이미 적용됨" 같은 정상적인 거절도 성공으로 간주하고 코드를 지운다.
 *
 * @returns {Promise<{applied: boolean, code: string|null, reason?: string}>}
 */
export async function redeem() {
  const code = await peek();
  if (!code) return { applied: false, code: null };

  try {
    await viralReferralAPI.applyCode(code);
    await clear();
    return { applied: true, code };
  } catch (error) {
    const status = error?.response?.status;
    const message = error?.response?.data?.message || error?.response?.data?.error;

    // 이미 적용했거나 유효하지 않은 코드는 재시도해도 소용없으므로 지운다
    if (status === 400 || status === 404 || status === 409) {
      await clear();
      return { applied: false, code, reason: message || '적용할 수 없는 코드' };
    }

    // 네트워크/서버 오류는 코드를 남겨 다음 로그인 때 다시 시도
    return { applied: false, code, reason: message || '나중에 다시 시도' };
  }
}

export default { captureFromUrl, peek, clear, redeem };
