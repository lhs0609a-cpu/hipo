import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../../constants/colors';

const PERIODS = [
  { key: '1D', label: '1일', timeframe: '1h', limit: 24 },
  { key: '1W', label: '1주', timeframe: '1d', limit: 7 },
  { key: '1M', label: '1개월', timeframe: '1d', limit: 30 },
  { key: '3M', label: '3개월', timeframe: '1d', limit: 90 },
  { key: '1Y', label: '1년', timeframe: '1d', limit: 365 },
];

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

// 기간별 설정 반환 함수 export
export const getPeriodConfig = (periodKey) => {
  const period = PERIODS.find((p) => p.key === periodKey);
  return period || PERIODS[2]; // 기본값: 1개월
};

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
