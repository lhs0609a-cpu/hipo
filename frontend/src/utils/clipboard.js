/**
 * 클립보드 래퍼.
 *
 * 이 프로젝트에서 클립보드는 두 군데서 서로 다르게, 그리고 둘 다 깨진 채로 쓰이고 있었다.
 *   ShareModal   : `import * as Clipboard from 'expo-clipboard'` — package.json 에 없음
 *   InviteScreen : `import { Clipboard } from 'react-native'`     — RN 0.63 에서 deprecated,
 *                                                                   신아키텍처에서 제거됨
 *
 * 링크 복사는 초대 루프의 시작점이라 여기서 죽으면 바이럴이 통째로 멈춘다.
 * expo-clipboard 가 있으면 쓰고, 없으면 공유 시트로 폴백해서 최소한 링크는 전달되게 한다.
 *
 * 정식으로 쓰려면: npx expo install expo-clipboard
 */

import { Share, Platform } from 'react-native';

let ExpoClipboard = null;
try {
  // eslint-disable-next-line global-require
  ExpoClipboard = require('expo-clipboard');
} catch (e) {
  ExpoClipboard = null;
}

/** expo-clipboard 가 설치돼 있는지 */
export const isClipboardAvailable = ExpoClipboard != null;

/**
 * 문자열을 클립보드에 복사한다.
 *
 * @param {string} text
 * @returns {Promise<{ok: boolean, method: 'clipboard'|'share'|'none'}>}
 *          method 로 실제 무엇이 일어났는지 알려주므로 화면에서 문구를 다르게 낼 수 있다.
 */
export async function copyText(text) {
  if (!text) return { ok: false, method: 'none' };

  // 1) 웹은 브라우저 API
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true, method: 'clipboard' };
    } catch (e) {
      /* 아래로 폴백 */
    }
  }

  // 2) expo-clipboard
  if (ExpoClipboard?.setStringAsync) {
    try {
      await ExpoClipboard.setStringAsync(text);
      return { ok: true, method: 'clipboard' };
    } catch (e) {
      /* 아래로 폴백 */
    }
  }

  // 3) 폴백 — 공유 시트를 열어 사용자가 직접 보내게 한다
  try {
    await Share.share({ message: text });
    return { ok: true, method: 'share' };
  } catch (e) {
    return { ok: false, method: 'none' };
  }
}

/** 복사 결과에 맞는 안내 문구 */
export function copyFeedback(result) {
  if (!result?.ok) return '복사에 실패했어요';
  return result.method === 'clipboard' ? '링크를 복사했어요' : '공유 시트를 열었어요';
}

export default { copyText, copyFeedback, isClipboardAvailable };
