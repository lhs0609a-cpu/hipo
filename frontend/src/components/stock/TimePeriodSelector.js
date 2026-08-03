import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../../constants/colors';

/**
 * 기간별로 어떤 봉을 몇 개 볼지.
 *
 * timeframe 값은 백엔드 getPriceHistory 의 화이트리스트
 * ['1m','5m','15m','1h','4h','1d','1w','1M'] 와 일치해야 한다.
 * 어긋나면 서버가 조용히 '1d' 로 폴백해 엉뚱한 봉이 나온다.
 */
export const PERIODS = [
  { key: '1D', label: '1일', timeframe: '5m', limit: 288 },
  { key: '1W', label: '1주', timeframe: '1h', limit: 168 },
  { key: '1M', label: '1개월', timeframe: '1d', limit: 30 },
  { key: '3M', label: '3개월', timeframe: '1d', limit: 90 },
  { key: '1Y', label: '1년', timeframe: '1d', limit: 365 },
];

/** 분·시간봉 여부. x축 라벨을 시:분으로 쓸지 판단할 때 사용. */
export const isIntraday = (timeframe) => /m$|h$/.test(timeframe || '');

/**
 * 기간 키 → 조회 설정.
 * StockChart 가 따로 같은 표를 갖고 있다가 값이 어긋난 적이 있어 여기로 모았다.
 */
export const getPeriodConfig = (key) =>
  PERIODS.find((p) => p.key === key) || { key: '3M', timeframe: '1d', limit: 90 };

export default function TimePeriodSelector({ selected, onChange }) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {PERIODS.map((period) => (
          <TouchableOpacity
            key={period.key}
            style={[
              styles.periodButton,
              selected === period.key && styles.selectedPeriodButton,
            ]}
            onPress={() => onChange(period.key, period.timeframe, period.limit)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.periodText,
                selected === period.key && styles.selectedPeriodText,
              ]}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  selectedPeriodButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  selectedPeriodText: {
    color: '#FFFFFF',
  },
});
