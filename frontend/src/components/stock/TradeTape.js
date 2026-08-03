import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { getRecentTrades } from '../../api/stocks';
import socketService from '../../services/socketService';
import { COLORS } from '../../constants/colors';
import { tabularNums } from '../../styles/tokens';

/**
 * 체결 내역 (Time & Sales).
 *
 * 초기 목록은 REST 로 받고, 이후 체결은 소켓 `trade:tick` 으로 위에 쌓는다.
 */

const MAX_ROWS = 100;

const formatTime = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '--:--:--';
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
};

const TradeRow = React.memo(function TradeRow({ item }) {
  const color =
    item.direction === 'up'
      ? COLORS.stockUpText
      : item.direction === 'down'
        ? COLORS.stockDownText
        : COLORS.textSecondary;

  return (
    <View style={styles.row}>
      <Text style={styles.timeText}>{formatTime(item.timestamp)}</Text>
      <Text style={[styles.priceText, { color }]}>{item.price.toLocaleString()}</Text>
      <Text style={styles.qtyText}>{item.quantity.toLocaleString()}</Text>
      <Text style={styles.amountText}>
        {Math.round(item.totalAmount ?? item.price * item.quantity).toLocaleString()}
      </Text>
    </View>
  );
});

export default function TradeTape({ stockId }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getRecentTrades(stockId, 50);
      setTrades(data.trades || []);
    } catch (error) {
      console.error('체결 내역 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  }, [stockId]);

  useEffect(() => {
    if (!stockId) return undefined;

    load();
    socketService.subscribeStock(stockId);

    const off = socketService.on('tradeTick', (tick) => {
      if (!tick || (tick.stockId && tick.stockId !== stockId)) return;
      setTrades((prev) => {
        // 직전 체결과 비교해 방향을 정한다
        const prevPrice = prev[0]?.price;
        const direction =
          prevPrice == null
            ? 'flat'
            : tick.price > prevPrice
              ? 'up'
              : tick.price < prevPrice
                ? 'down'
                : 'flat';
        return [{ ...tick, direction }, ...prev].slice(0, MAX_ROWS);
      });
    });

    return () => {
      off();
      socketService.unsubscribeStock(stockId);
    };
  }, [stockId, load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (trades.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>아직 체결된 거래가 없습니다</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerText, styles.timeCol]}>시간</Text>
        <Text style={[styles.headerText, styles.priceCol]}>체결가</Text>
        <Text style={[styles.headerText, styles.qtyCol]}>수량</Text>
        <Text style={[styles.headerText, styles.amountCol]}>체결금액</Text>
      </View>
      <FlatList
        data={trades}
        keyExtractor={(item, index) => String(item.id || `${item.timestamp}-${index}`)}
        renderItem={({ item }) => <TradeRow item={item} />}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        windowSize={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: { fontSize: 13, color: COLORS.textTertiary },
  header: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textTertiary,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  timeCol: { flex: 1.1 },
  priceCol: { flex: 1, textAlign: 'right' },
  qtyCol: { flex: 0.9, textAlign: 'right' },
  amountCol: { flex: 1.3, textAlign: 'right' },
  timeText: {
    flex: 1.1,
    fontSize: 12,
    color: COLORS.textTertiary,
    ...tabularNums,
  },
  priceText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    ...tabularNums,
  },
  qtyText: {
    flex: 0.9,
    fontSize: 12,
    color: COLORS.textPrimary,
    textAlign: 'right',
    ...tabularNums,
  },
  amountText: {
    flex: 1.3,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    ...tabularNums,
  },
});
