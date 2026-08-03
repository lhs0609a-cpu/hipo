import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * 테마에 반응하는 StyleSheet.
 *
 * ## 문제
 *
 * `const styles = StyleSheet.create({ color: COLORS.textPrimary })` 는 모듈이 처음
 * 로드될 때 한 번만 평가된다. 그래서 라이트 팔레트 값이 그대로 박제되고,
 * 다크 모드로 바꿔도 화면이 따라오지 않는다.
 *
 * ## 사용
 *
 * 스타일을 테마를 받는 함수로 바꾸고, 컴포넌트 안에서 이 훅으로 만든다.
 *
 *   const makeStyles = (t) => StyleSheet.create({
 *     container: { backgroundColor: t.colors.background },
 *     title: { ...t.textStyles.title2, color: t.colors.textPrimary },
 *   });
 *
 *   export default function MyScreen() {
 *     const styles = useThemedStyles(makeStyles);
 *     ...
 *   }
 *
 * 테마 객체가 바뀔 때만 다시 만들므로 렌더마다 StyleSheet 를 새로 만들지 않는다.
 *
 * @param {(theme: object) => object} factory 테마를 받아 StyleSheet 를 돌려주는 함수
 * @returns {object} 생성된 스타일 객체
 */
export default function useThemedStyles(factory) {
  const { theme } = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}

export { useThemedStyles };
