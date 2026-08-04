import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  lightColors,
  darkColors,
  typography,
  textStyles,
  tabularNums,
  spacing,
  borderRadius,
  layout,
  hitSlop,
  shadows,
  animations,
  zIndex,
} from '../styles/tokens';
import { fonts } from '../styles/fonts';
import { createCommonStyles } from '../styles/theme';

const THEME_STORAGE_KEY = '@hipo_theme_preference';

export { darkColors, lightColors };

/**
 * 다크 모드에서는 그림자가 사실상 보이지 않는다.
 * 그림자를 죽이는 대신 표면을 한 단계 밝히고 얇은 테두리로 위계를 만든다.
 */
const darkShadows = Object.keys(shadows).reduce((acc, key) => {
  const s = shadows[key];
  acc[key] = {
    ...s,
    shadowColor: '#000000',
    shadowOpacity: s.shadowOpacity ? Math.min(s.shadowOpacity * 2.4, 0.6) : 0,
  };
  return acc;
}, {});

const ThemeContext = createContext(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system'); // 'light' | 'dark' | 'system'
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!cancelled && savedTheme) setThemeMode(savedTheme);
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveThemePreference = useCallback(async (mode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }, []);

  const isDark = useMemo(() => {
    if (themeMode === 'system') return systemColorScheme === 'dark';
    return themeMode === 'dark';
  }, [themeMode, systemColorScheme]);

  const theme = useMemo(() => {
    const colors = isDark ? darkColors : lightColors;
    const currentShadows = isDark ? darkShadows : shadows;

    return {
      colors,
      /**
       * 서체 패밀리. 굵기별로 이름이 다르다 (RN 은 커스텀 폰트의 굵기를 합성하지 못함).
       *   fontFamily: t.fonts.bold
       */
      fonts,
      typography,
      textStyles,
      tabularNums,
      spacing,
      borderRadius,
      shadows: currentShadows,
      layout,
      hitSlop,
      animations,
      zIndex,
      commonStyles: createCommonStyles(colors, currentShadows),
      isDark,

      /**
       * 등락 값에 맞는 색 세트를 돌려준다.
       * const { text, surface } = theme.delta(changeRate)
       */
      delta: (value) => {
        if (value > 0) {
          return { text: colors.stockUpText, base: colors.stockUp, surface: colors.stockUpBackground, sign: '+' };
        }
        if (value < 0) {
          return { text: colors.stockDownText, base: colors.stockDown, surface: colors.stockDownBackground, sign: '' };
        }
        return { text: colors.textTertiary, base: colors.stockFlat, surface: colors.stockFlatBackground, sign: '' };
      },
    };
  }, [isDark]);

  const setTheme = useCallback(
    (mode) => {
      setThemeMode(mode);
      saveThemePreference(mode);
    },
    [saveThemePreference]
  );

  const toggleTheme = useCallback(() => setTheme(isDark ? 'light' : 'dark'), [isDark, setTheme]);
  const setSystemTheme = useCallback(() => setTheme('system'), [setTheme]);

  const value = useMemo(
    () => ({ theme, isDark, themeMode, setTheme, toggleTheme, setSystemTheme, isLoading }),
    [theme, isDark, themeMode, setTheme, toggleTheme, setSystemTheme, isLoading]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export default ThemeContext;
