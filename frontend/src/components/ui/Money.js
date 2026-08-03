import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { tabularNums } from '../../styles/tokens';

/**
 * 금액·등락 표시 전용 컴포넌트.
 *
 * 금융 앱에서 숫자가 갱신될 때 자릿수 폭이 흔들리면 싸구려로 보입니다.
 * tabular numeral 을 강제해 자릿수 폭을 고정합니다.
 */

export const formatNumber = (value, fractionDigits = 0) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('ko-KR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

/** 1,234만 / 5.6억 처럼 축약. 큰 숫자가 레이아웃을 밀지 않게. */
export const formatCompact = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(1)}조`;
  if (abs >= 1e8) return `${sign}${(abs / 1e8).toFixed(abs >= 1e9 ? 0 : 1)}억`;
  if (abs >= 1e4) return `${sign}${(abs / 1e4).toFixed(abs >= 1e5 ? 0 : 1)}만`;
  return `${sign}${abs.toLocaleString('ko-KR')}`;
};

const SIZE_PRESET = {
  display: 'displayNumber',
  headline: 'headlineNumber',
  title: 'titleNumber',
  body: 'bodyNumber',
  caption: 'captionNumber',
};

/**
 *   <Money value={1250000} suffix="PO" size="display" />
 *   <Money value={71200} suffix="원" size="body" />
 */
export function Money({
  value,
  suffix,
  size = 'body',
  color,
  compact = false,
  fractionDigits = 0,
  prefix,
  style,
  suffixStyle,
  numberOfLines = 1,
}) {
  const { theme } = useTheme();
  const preset = theme.textStyles[SIZE_PRESET[size] || SIZE_PRESET.body];
  const tint = color || theme.colors.textPrimary;

  return (
    <View style={styles.row}>
      {prefix ? (
        <Text style={[preset, { color: tint, marginRight: 2 }, style]}>{prefix}</Text>
      ) : null}
      <Text
        numberOfLines={numberOfLines}
        adjustsFontSizeToFit={size === 'display' || size === 'headline'}
        minimumFontScale={0.7}
        style={[preset, { color: tint }, style]}
      >
        {compact ? formatCompact(value) : formatNumber(value, fractionDigits)}
      </Text>
      {suffix ? (
        <Text
          style={[
            preset,
            {
              color: tint,
              opacity: 0.55,
              marginLeft: 3,
              fontSize: Math.round((preset.fontSize || 15) * 0.62),
            },
            suffixStyle,
          ]}
        >
          {suffix}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * 등락률 배지.
 *   <Delta value={-1.42} />        →  ▼ 1.42%
 *   <Delta value={3.1} amount={2100} />  →  ▲ 2,100 (3.10%)
 */
export function Delta({
  value,
  amount,
  size = 'caption',
  variant = 'pill',
  showIcon = true,
  style,
}) {
  const { theme } = useTheme();
  const d = theme.delta(value);
  const preset = theme.textStyles[SIZE_PRESET[size] || SIZE_PRESET.caption];
  const rate = Number.isFinite(Number(value)) ? Math.abs(Number(value)).toFixed(2) : '0.00';
  const iconName = value > 0 ? 'caret-up' : value < 0 ? 'caret-down' : 'remove';
  const iconSize = Math.round((preset.fontSize || 13) * 0.9);

  const isPill = variant === 'pill';

  return (
    <View
      style={[
        styles.row,
        isPill && [
          theme.commonStyles.deltaPill,
          { backgroundColor: d.surface },
        ],
        style,
      ]}
    >
      {showIcon ? (
        <Ionicons name={iconName} size={iconSize} color={d.text} style={styles.icon} />
      ) : null}
      {amount != null ? (
        <Text style={[preset, { color: d.text }]}>
          {formatNumber(Math.abs(amount))}
          <Text style={[preset, { color: d.text, opacity: 0.75 }]}>{`  ${rate}%`}</Text>
        </Text>
      ) : (
        <Text style={[preset, { color: d.text }]}>{`${rate}%`}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  icon: {
    marginRight: 2,
    alignSelf: 'center',
  },
});

export { tabularNums };
export default Money;
