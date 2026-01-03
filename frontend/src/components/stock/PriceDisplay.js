import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

export default function PriceDisplay({ stats, stockName, isLive = false }) {
  if (!stats) return null;

  const {
    currentPrice = 0,
    priceChange = 0,
    priceChangePercent = 0,
    openPrice = 0,
    highPrice = 0,
    lowPrice = 0,
    volume = 0,
    week52High = 0,
    week52Low = 0,
  } = stats;

  const isUp = priceChange >= 0;
  const changeColor = isUp ? COLORS.up : COLORS.down;

  return (
    <View style={styles.container}>
      {/* 주식 이름 + 실시간 표시 */}
      <View style={styles.nameRow}>
        <Text style={styles.stockName}>{stockName}</Text>
        {isLive && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      {/* 현재가 */}
      <View style={styles.priceContainer}>
        <Text style={styles.currentPrice}>{currentPrice.toLocaleString()}</Text>
        <Text style={styles.currency}>PO</Text>
      </View>

      {/* 변동 정보 */}
      <View style={styles.changeContainer}>
        <Text style={[styles.changeText, { color: changeColor }]}>
          {isUp ? '▲' : '▼'} {Math.abs(priceChange).toLocaleString()} ({isUp ? '+' : ''}{priceChangePercent.toFixed(2)}%)
        </Text>
        <Text style={styles.vsYesterday}>어제대비</Text>
      </View>

      {/* 구분선 */}
      <View style={styles.divider} />

      {/* 시가/고가/저가/거래량 */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>시가</Text>
          <Text style={styles.statValue}>{openPrice.toLocaleString()}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>고가</Text>
          <Text style={[styles.statValue, styles.highValue]}>{highPrice.toLocaleString()}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>저가</Text>
          <Text style={[styles.statValue, styles.lowValue]}>{lowPrice.toLocaleString()}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>거래량</Text>
          <Text style={styles.statValue}>{volume.toLocaleString()}주</Text>
        </View>
      </View>

      {/* 52주 고가/저가 */}
      <View style={styles.week52Container}>
        <View style={styles.week52Item}>
          <Text style={styles.week52Label}>52주 최고</Text>
          <Text style={styles.week52Value}>{week52High.toLocaleString()} PO</Text>
        </View>
        <View style={styles.week52Divider} />
        <View style={styles.week52Item}>
          <Text style={styles.week52Label}>52주 최저</Text>
          <Text style={styles.week52Value}>{week52Low.toLocaleString()} PO</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  stockName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  currentPrice: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  currency: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginLeft: 8,
    marginBottom: 6,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  changeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  vsYesterday: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  highValue: {
    color: COLORS.up,
  },
  lowValue: {
    color: COLORS.down,
  },
  week52Container: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
  },
  week52Item: {
    flex: 1,
    alignItems: 'center',
  },
  week52Divider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  week52Label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  week52Value: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
});
