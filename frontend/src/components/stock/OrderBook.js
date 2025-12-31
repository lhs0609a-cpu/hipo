import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { getOrderBook } from '../../api/stocks';
import { COLORS } from '../../constants/colors';

const OrderBookRow = ({ item, type, maxPercentage }) => {
  const isAsk = type === 'ask';
  const barWidth = `${(item.percentage / maxPercentage) * 100}%`;

  return (
    <View style={styles.row}>
      {/* 바 차트 배경 */}
      <View
        style={[
          styles.volumeBar,
          isAsk ? styles.askBar : styles.bidBar,
          { width: barWidth },
          isAsk ? { right: 0 } : { left: 0 },
        ]}
      />

      {/* 잔량 (왼쪽) */}
      <View style={styles.quantityCell}>
        <Text style={[styles.quantityText, isAsk && styles.askQuantity]}>
          {item.quantity.toLocaleString()}
        </Text>
      </View>

      {/* 호가 (중앙) */}
      <View style={styles.priceCell}>
        <Text style={[styles.priceText, isAsk ? styles.askPrice : styles.bidPrice]}>
          {item.price.toLocaleString()}
        </Text>
      </View>

      {/* 빈 공간 (오른쪽) */}
      <View style={styles.quantityCell} />
    </View>
  );
};

export default function OrderBook({ stockId, currentPrice, priceChangePercent }) {
  const [orderBook, setOrderBook] = useState({ asks: [], bids: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrderBook = useCallback(async () => {
    try {
      const data = await getOrderBook(stockId);
      setOrderBook(data);
    } catch (error) {
      console.error('호가창 조회 오류:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [stockId]);

  useEffect(() => {
    loadOrderBook();
    // 5초마다 새로고침
    const interval = setInterval(loadOrderBook, 5000);
    return () => clearInterval(interval);
  }, [loadOrderBook]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrderBook();
  }, [loadOrderBook]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const maxPercentage = Math.max(
    ...orderBook.asks.map((a) => a.percentage || 0),
    ...orderBook.bids.map((b) => b.percentage || 0),
    1
  );

  const priceChange = priceChangePercent || orderBook.priceChangePercent || 0;
  const isUp = priceChange >= 0;

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerText}>잔량</Text>
        <Text style={styles.headerText}>호가</Text>
        <Text style={styles.headerText}>잔량</Text>
      </View>

      {/* 매도호가 (빨간색) */}
      <View style={styles.asksContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>매도호가</Text>
          <Text style={styles.totalText}>
            총 {orderBook.totalAskQuantity?.toLocaleString() || 0}주
          </Text>
        </View>
        {orderBook.asks.map((item, index) => (
          <OrderBookRow
            key={`ask-${index}`}
            item={item}
            type="ask"
            maxPercentage={maxPercentage}
          />
        ))}
      </View>

      {/* 현재가 표시 */}
      <View style={styles.currentPriceContainer}>
        <View style={styles.currentPriceBox}>
          <Text style={styles.currentPriceLabel}>현재가</Text>
          <Text style={[styles.currentPriceValue, isUp ? styles.upColor : styles.downColor]}>
            {(currentPrice || orderBook.currentPrice || 0).toLocaleString()} PO
          </Text>
          <Text style={[styles.changeText, isUp ? styles.upColor : styles.downColor]}>
            {isUp ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
          </Text>
        </View>
      </View>

      {/* 매수호가 (파란색) */}
      <View style={styles.bidsContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>매수호가</Text>
          <Text style={styles.totalText}>
            총 {orderBook.totalBidQuantity?.toLocaleString() || 0}주
          </Text>
        </View>
        {orderBook.bids.map((item, index) => (
          <OrderBookRow
            key={`bid-${index}`}
            item={item}
            type="bid"
            maxPercentage={maxPercentage}
          />
        ))}
      </View>

      {/* 스프레드 정보 */}
      <View style={styles.spreadInfo}>
        <Text style={styles.spreadText}>
          스프레드: {orderBook.spread?.toLocaleString() || 0} PO ({orderBook.spreadPercent || 0}%)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  totalText: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  asksContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bidsContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    position: 'relative',
  },
  volumeBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  askBar: {
    backgroundColor: 'rgba(240, 68, 82, 0.15)',
  },
  bidBar: {
    backgroundColor: 'rgba(18, 97, 196, 0.15)',
  },
  quantityCell: {
    flex: 1,
    paddingHorizontal: 12,
  },
  priceCell: {
    flex: 1,
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 13,
    color: COLORS.text,
    textAlign: 'center',
  },
  askQuantity: {
    color: COLORS.up,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  askPrice: {
    color: COLORS.up,
  },
  bidPrice: {
    color: COLORS.down,
  },
  currentPriceContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: COLORS.border,
  },
  currentPriceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  currentPriceLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  currentPriceValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  upColor: {
    color: COLORS.up,
  },
  downColor: {
    color: COLORS.down,
  },
  spreadInfo: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  spreadText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
