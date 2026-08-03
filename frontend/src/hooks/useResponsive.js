import { useMemo } from 'react';
import { useWindowDimensions, PixelRatio, Platform } from 'react-native';

/** 디자인 기준 기기: iPhone 13/14 (390 x 844) */
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

export const BREAKPOINTS = {
  /** iPhone SE, 구형 안드로이드 */
  compact: 360,
  /** iPhone 13/14/15 표준 */
  regular: 390,
  /** Pro Max / Ultra */
  large: 430,
  /** 폴더블 펼침 / 태블릿 */
  tablet: 600,
};

/**
 * 화면 폭에 비례해 값을 조정하되 과도한 확대/축소를 막는다.
 * 작은 기기에서는 최대 8%만 줄이고, 큰 기기에서는 최대 12%만 키운다.
 */
export const scaleSize = (size, width) => {
  const ratio = width / BASE_WIDTH;
  const clamped = Math.min(Math.max(ratio, 0.92), 1.12);
  return PixelRatio.roundToNearestPixel(size * clamped);
};

/**
 * 폰트는 레이아웃 파괴 위험이 커서 크기 변화를 더 좁게 제한한다.
 * 작은 기기에서만 살짝 줄이고, 큰 기기에서는 키우지 않는다.
 */
export const scaleFont = (size, width) => {
  if (width >= BASE_WIDTH) return size;
  const ratio = Math.max(width / BASE_WIDTH, 0.9);
  return PixelRatio.roundToNearestPixel(size * ratio);
};

/**
 * 기기 폭/높이에 따른 반응형 정보.
 *
 *   const { isCompact, ms, fs, columns } = useResponsive();
 *   <View style={{ padding: ms(20) }}>
 *     <Text style={{ fontSize: fs(28) }} />
 */
export default function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions();

  return useMemo(() => {
    const isLandscape = width > height;
    const shortest = Math.min(width, height);

    return {
      width,
      height,
      fontScale,
      isLandscape,

      /** iPhone SE 급. 여백을 줄이고 2열 그리드를 1열로 접어야 하는 구간. */
      isCompact: shortest < BREAKPOINTS.regular,
      /** iPhone SE 미만의 아주 좁은 화면 */
      isTiny: shortest < BREAKPOINTS.compact,
      isLarge: shortest >= BREAKPOINTS.large,
      isTablet: shortest >= BREAKPOINTS.tablet,
      /** 접근성 큰 글씨 사용 중 — 고정 높이 대신 minHeight 를 써야 한다. */
      isLargeText: fontScale > 1.15,

      /** measure scale — 여백/크기용 */
      ms: (size) => scaleSize(size, width),
      /** font scale — 글자 크기용 */
      fs: (size) => scaleFont(size, width),

      /** 카드 그리드 열 수 */
      columns: shortest >= BREAKPOINTS.tablet ? 3 : shortest < BREAKPOINTS.compact ? 1 : 2,

      /** 가로 폭에서 좌우 패딩을 뺀 콘텐츠 폭 */
      contentWidth: (padding = 20) => width - padding * 2,

      /** 태블릿/폴더블에서 콘텐츠가 과도하게 늘어나지 않게 제한 */
      maxContentWidth: shortest >= BREAKPOINTS.tablet ? 640 : width,

      isIOS: Platform.OS === 'ios',
      isAndroid: Platform.OS === 'android',
    };
  }, [width, height, fontScale]);
}

export { BASE_WIDTH, BASE_HEIGHT };
