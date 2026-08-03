/**
 * 햅틱 래퍼.
 *
 * expo-haptics 는 선택 의존성입니다. 설치되어 있지 않으면 조용히 무시합니다.
 * 설치하려면: npx expo install expo-haptics
 */

import { Platform } from 'react-native';

let Haptics = null;
try {
  // eslint-disable-next-line global-require
  Haptics = require('expo-haptics');
} catch (e) {
  Haptics = null;
}

const enabled = Haptics != null && Platform.OS !== 'web';

const run = (fn) => {
  if (!enabled) return;
  try {
    fn();
  } catch (e) {
    /* 햅틱 실패는 무시 */
  }
};

/** 가벼운 탭 — 칩, 토글, 탭 전환 */
export const selection = () => run(() => Haptics.selectionAsync());

/** 버튼 눌림 */
export const light = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

/** 중요한 확정 — 주문 제출 */
export const medium = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

export const heavy = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));

/** 체결 완료, 충전 성공 */
export const success = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

/** 잔액 부족 등 경고 */
export const warning = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));

/** 주문 실패 */
export const error = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));

export const isAvailable = enabled;

export default { selection, light, medium, heavy, success, warning, error, isAvailable: enabled };
