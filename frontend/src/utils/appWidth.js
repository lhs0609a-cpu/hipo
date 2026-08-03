/**
 * 앱 콘텐츠 폭.
 *
 * ## 왜 Dimensions 를 직접 쓰면 안 되는가
 *
 * 이 앱은 넓은 뷰포트에서 `components/ui/AppFrame` 이 폰 폭(430px)으로 가둔다.
 * 그런데 `Dimensions.get('window').width` 는 **프레임이 아니라 브라우저 창** 폭을
 * 돌려준다. 데스크톱에서 1920 이 나오므로, 이 값으로 차트나 슬라이드 폭을 잡으면
 * 430px 프레임을 뚫고 나가 레이아웃이 깨진다.
 *
 * 그래서 화면 폭이 필요한 곳은 전부 여기를 거친다.
 *
 *   const width = getAppWidth();      // 모듈 스코프 상수용
 *   const width = useAppWidth();      // 회전/리사이즈에 반응해야 할 때
 */

import { Dimensions, useWindowDimensions } from 'react-native';

/** AppFrame 과 반드시 같은 값이어야 한다 */
export const FRAME_WIDTH = 430;
export const FRAME_BREAKPOINT = 520;

/** 실제 렌더되는 콘텐츠 폭 (프레임이 적용되면 프레임 폭) */
const clamp = (windowWidth) =>
  windowWidth > FRAME_BREAKPOINT ? FRAME_WIDTH : windowWidth;

/**
 * 모듈 스코프에서 한 번 읽는 용도.
 * 창 크기 변화에 반응하지 않으므로, 반응이 필요하면 useAppWidth 를 쓴다.
 */
export function getAppWidth() {
  return clamp(Dimensions.get('window').width);
}

export function getAppHeight() {
  return Dimensions.get('window').height;
}

/** 창 크기 변화(회전, 브라우저 리사이즈)에 반응하는 버전 */
export function useAppWidth() {
  const { width } = useWindowDimensions();
  return clamp(width);
}

export default { getAppWidth, getAppHeight, useAppWidth, FRAME_WIDTH, FRAME_BREAKPOINT };
