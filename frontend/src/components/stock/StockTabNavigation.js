import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../../constants/colors';

const TABS = [
  { key: 'chart', label: '차트' },
  { key: 'orderbook', label: '호가' },
  { key: 'trades', label: '체결' },
  { key: 'depth', label: '깊이' },
  { key: 'info', label: '정보' },
];

export default function StockTabNavigation({ activeTab, onTabChange }) {
  const indicatorPosition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const index = TABS.findIndex((tab) => tab.key === activeTab);
    Animated.spring(indicatorPosition, {
      toValue: index,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [activeTab, indicatorPosition]);

  const tabWidth = 100 / TABS.length;

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 슬라이딩 인디케이터 */}
      <View style={styles.indicatorContainer}>
        <Animated.View
          style={[
            styles.indicator,
            {
              width: `${tabWidth}%`,
              transform: [
                {
                  translateX: indicatorPosition.interpolate({
                    inputRange: TABS.map((_, i) => i),
                    outputRange: TABS.map((_, i) => (i * 100) / TABS.length * 3.5), // Adjust multiplier based on container width
                  }),
                },
              ],
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    fontWeight: '700',
    color: COLORS.text,
  },
  indicatorContainer: {
    height: 3,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 1.5,
    left: 16,
  },
});
