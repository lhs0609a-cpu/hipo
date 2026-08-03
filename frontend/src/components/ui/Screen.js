import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * 모든 화면의 루트 컨테이너.
 *
 * 기존 코드의 `paddingTop: Platform.OS === 'ios' ? 60 : 50` 같은 하드코딩을 대체합니다.
 * 실제 기기 인셋을 읽으므로 노치/다이나믹아일랜드/제스처바 어디서든 정확합니다.
 *
 *   // 네비게이터 헤더가 있는 화면 (headerShown: true)
 *   <Screen scroll>...</Screen>
 *
 *   // 헤더를 직접 그리는 화면 (headerShown: false)
 *   <Screen edges={['top', 'bottom']} scroll refreshing={r} onRefresh={fn}>...</Screen>
 *
 *   // 하단 고정 CTA가 있는 화면
 *   <Screen scroll footer={<BuyBar />}>...</Screen>
 *
 * @param edges          세이프에어리어를 적용할 방향. 기본 ['top','bottom'].
 *                       네비게이터 헤더가 상단을 처리하면 ['bottom'] 만 넘기세요.
 * @param scroll         true 면 ScrollView 로 감쌉니다.
 * @param footer         하단에 고정될 노드. 세이프에어리어가 자동 적용됩니다.
 * @param keyboard       키보드 회피 사용 여부. 입력이 있는 화면은 true (기본값).
 * @param tabBarSpacing  하단 탭바가 있는 화면에서 스크롤 마지막 요소가 가리지 않게 여백 추가.
 */
export default function Screen({
  children,
  edges = ['top', 'bottom'],
  scroll = false,
  footer,
  keyboard = true,
  tabBarSpacing = false,
  refreshing,
  onRefresh,
  backgroundColor,
  contentContainerStyle,
  style,
  statusBarStyle,
  scrollViewProps,
  ...rest
}) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  const bg = backgroundColor || theme.colors.background;
  const applyTop = edges.includes('top');
  const applyBottom = edges.includes('bottom');

  // footer 가 있으면 하단 인셋은 footer 가 흡수한다 (이중 적용 방지)
  const bodyBottomInset = footer ? 0 : applyBottom ? insets.bottom : 0;

  const padding = {
    paddingTop: applyTop ? insets.top : 0,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        {
          paddingBottom:
            bodyBottomInset + (tabBarSpacing ? theme.layout.tabBarHeight : 0) + theme.spacing.lg,
        },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.textTertiary}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors.surface}
          />
        ) : undefined
      }
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, { paddingBottom: bodyBottomInset }]}>{children}</View>
  );

  const content = (
    <>
      {body}
      {footer ? (
        <View style={{ paddingBottom: applyBottom ? insets.bottom : 0 }}>{footer}</View>
      ) : null}
    </>
  );

  return (
    <View style={[styles.flex, { backgroundColor: bg }, padding, style]} {...rest}>
      <StatusBar
        barStyle={statusBarStyle || (isDark ? 'light-content' : 'dark-content')}
        backgroundColor="transparent"
        translucent
      />
      {keyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </View>
  );
}

/**
 * 하단 고정 CTA 바. Screen 의 footer 로 넘겨 쓰세요.
 *   <Screen footer={<BottomBar><Button …/></BottomBar>}>
 */
export function BottomBar({ children, style }) {
  const { theme } = useTheme();
  return <View style={[theme.commonStyles.bottomBar, { paddingBottom: theme.spacing.md }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
