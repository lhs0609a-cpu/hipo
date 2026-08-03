import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * 앱 프레임.
 *
 * ## 문제
 *
 * 이 앱은 모바일용으로 만들어졌지만 react-native-web 으로 브라우저에서도 뜬다.
 * 데스크톱 브라우저에서는 뷰포트가 1920px 이라 모든 레이아웃이 그 폭으로 늘어난다.
 * 퀵액션 5개가 화면 끝까지 벌어지고, 탭바도 가로로 늘어지고, 콘텐츠 아래로
 * 거대한 빈 공간이 생긴다. 폰에서 보던 화면과 전혀 다른 물건이 된다.
 *
 * ## 해결
 *
 * 뷰포트가 폰보다 넓으면 앱 전체를 폰 폭으로 가두고 가운데 정렬한다.
 * 좁은 화면(실제 폰, 좁은 브라우저 창)에서는 아무것도 하지 않는다.
 *
 * 네비게이터를 통째로 감싸므로 하단 탭바까지 같이 제약된다.
 */

/** 이 폭을 넘어서면 프레임을 씌운다 (iPhone Pro Max 급) */
const FRAME_BREAKPOINT = 520;

/** 프레임 안쪽 폭. 폰 화면 비율을 유지한다 */
const FRAME_WIDTH = 430;

export default function AppFrame({ children }) {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();

  const shouldFrame = width > FRAME_BREAKPOINT;

  if (!shouldFrame) {
    return <View style={styles.full}>{children}</View>;
  }

  return (
    <View
      style={[
        styles.page,
        // 프레임 바깥 여백은 앱 배경보다 한 단계 어둡게 해 경계를 만든다
        { backgroundColor: isDark ? '#05060A' : theme.colors.backgroundTertiary },
      ]}
    >
      <View
        style={[
          styles.frame,
          {
            width: FRAME_WIDTH,
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border,
          },
          // 웹에서만 그림자를 준다. 네이티브 태블릿에서는 불필요한 렌더 비용
          Platform.OS === 'web' && styles.frameShadow,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: {
    flex: 1,
  },
  page: {
    flex: 1,
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    // 폭은 사용처에서 인라인으로 지정한다 (FRAME_WIDTH)
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  frameShadow: {
    // react-native-web 은 boxShadow 로 변환한다
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
});

export { FRAME_WIDTH, FRAME_BREAKPOINT };
