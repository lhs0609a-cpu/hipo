import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { getOrderBook } from '../../api/stocks';
import socketService from '../../services/socketService';
import { COLORS } from '../../constants/colors';
import { tabularNums, hitSlop } from '../../styles/tokens';
import haptics from '../../utils/haptics';

/**
 * 호가창.
 *
 * 서버가 `orderbook:update` 로 밀어 주며, 소켓이 끊긴 동안에만 폴링으로 대체한다.
 * (예전에는 항상 5초 폴링이었다)
 *
 * 행을 누르면 onSelectPrice 로 해당 호가를 올려보낸다 — 주문 화면의 가격 입력에 꽂힌다.
 */

const OrderBookRow = React.memo(function OrderBookRow({
  item,
  type,
  isBest,
  onSelectPrice,
}) {
  const isAsk = type === 'ask';
  const barWidth = `${Math.min(item.percentage || 0, 100)}%`;
  const hasQuantity = item.quantity > 0;

  const handlePress = () => {
    if (!onSelectPrice) return;
    haptics.selection();
    onSelectPrice(item.price, isAsk ? 'ask' : 'bid');
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={hitSlop.sm}
      accessibilityRole="button"
      accessibilityLabel={`${item.price.toLocaleString()}원 ${isAsk ? '매도' : '매수'} 잔량 ${item.quantity}주`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {/* 잔량 바 — 매도는 오른쪽에서, 매수는 왼쪽에서 자란다 */}
      <View
        style={[
          styles.volumeBar,
          isAsk ? styles.askBar : styles.bidBar,
          { width: barWidth },
          isAsk ? { right: '50%' } : { left: '50%' },
        ]}
      />

      {/* 왼쪽: 매도 잔량 */}
      <View style={styles.sideCell}>
        {isAsk && hasQuantity ? (
          <Text style={[styles.quantityText, styles.askQuantity]}>
            {item.quantity.toLocaleString()}
          </Text>
        ) : null}
      </View>

      {/* 가운데: 호가 */}
      <View style={styles.priceCell}>
        <Text
          style={[
            styles.priceText,
            isAsk ? styles.askPrice : styles.bidPrice,
            isBest && styles.bestPrice,
          ]}
        >
          {item.price.toLocaleString()}
        </Text>
      </View>

      {/* 오른쪽: 매수 잔량 */}
      <View style={styles.sideCell}>
        {!isAsk && hasQuantity ? (
          <Text style={[styles.quantityText, styles.bidQuantity]}>
            {item.quantity.toLocaleString()}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

export default function OrderBook({
  stockId,
  currentPrice,
  priceChangePercent,
  onSelectPrice,
}) {
  const [orderBook, setOrderBook] = useState({ asks: [], bids: [] });
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const pollRef = useRef(null);

  const loadOrderBook = useCallback(async () => {
    try {
      const data = await getOrderBook(stockId);
      setOrderBook(data);
    } catch (error) {
      console.error('호가창 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  }, [stockId]);

  useEffect(() => {
    if (!stockId) return undefined;

    loadOrderBook();
    socketService.subscribeStock(stockId);

    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    // 소켓이 살아 있는 동안은 폴링하지 않는다
    const startPolling = () => {
      if (pollRef.current) return;
      pollRef.current = setInterval(loadOrderBook, 5000);
    };

    const offBook = socketService.on('orderBookUpdate', (data) => {
      if (data?.stockId && data.stockId !== stockId) return;
      setLive(true);
      stopPolling();
      setOrderBook(data);
    });

    const offConn = socketService.on('connectionChange', (connected) => {
      if (connected) {
        loadOrderBook();
      } else {
        setLive(false);
        startPolling();
      }
    });

    // 3초 안에 소켓 업데이트가 없으면 폴백 폴링을 켠다
    const fallbackTimer = setTimeout(startPolling, 3000);

    return () => {
      offBook();
      offConn();
      clearTimeout(fallbackTimer);
      stopPolling();
      socketService.unsubscribeStock(stockId);
    };
  }, [stockId, loadOrderBook]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const priceChange = priceChangePercent ?? orderBook.priceChangePercent ?? 0;
  const isUp = priceChange >= 0;
  const strength = orderBook.tradeStrength ?? 100;
  const bidRatio = orderBook.bidRatio ?? 50;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>매도잔량</Text>
        <Text style={styles.headerText}>호가</Text>
        <Text style={styles.headerText}>매수잔량</Text>
      </View>

      {/* 매도호가 — 높은 가격이 위 */}
      {orderBook.asks?.map((item, index) => (
        <OrderBookRow
          key={`ask-${item.price}`}
          item={item}
          type="ask"
          isBest={index === orderBook.asks.length - 1}
          onSelectPrice={onSelectPrice}
        />
      ))}

      {/* 현재가 */}
      <View style={styles.currentPriceContainer}>
        <Text style={styles.currentPriceLabel}>현재가</Text>
        <Text style={[styles.currentPriceValue, isUp ? styles.upColor : styles.downColor]}>
          {(currentPrice ?? orderBook.currentPrice ?? 0).toLocaleString()}
        </Text>
        <Text style={[styles.changeText, isUp ? styles.upColor : styles.downColor]}>
          {isUp ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
        </Text>
        {live ? <View style={styles.liveDot} /> : null}
      </View>

      {/* 매수호가 */}
      {orderBook.bids?.map((item, index) => (
        <OrderBookRow
          key={`bid-${item.price}`}
          item={item}
          type="bid"
          isBest={index === 0}
          onSelectPrice={onSelectPrice}
        />
      ))}

      {/* 잔량 비중 바 */}
      <View style={styles.ratioBar}>
        <View style={[styles.ratioFillBid, { flex: Math.max(bidRatio, 1) }]} />
        <View style={[styles.ratioFillAsk, { flex: Math.max(100 - bidRatio, 1) }]} />
      </View>

      {/* 요약 */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>총 매도잔량</Text>
          <Text style={[styles.summaryValue, styles.upColor]}>
            {(orderBook.totalAskQuantity || 0).toLocaleString()}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>체결강도</Text>
          <Text
            style={[
              styles.summaryValue,
              strength >= 100 ? styles.upColor : styles.downColor,
            ]}
          >
            {strength.toFixed(0)}%
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>총 매수잔량</Text>
          <Text style={[styles.summaryValue, styles.downColor]}>
            {(orderBook.totalBidQuantity || 0).toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.spreadInfo}>
        <Text style={styles.spreadText}>
          스프레드 {(orderBook.spread || 0).toLocaleString()} ({orderBook.spreadPercent || 0}%)
          {'  ·  '}호가단위 {(orderBook.tickSize || 1).toLocaleString()}
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textTertiary,
    textAlign: 'center',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    position: 'relative',
  },
  rowPressed: {
    backgroundColor: COLORS.surfaceHover,
  },
  volumeBar: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    maxWidth: '50%',
  },
  askBar: {
    backgroundColor: 'rgba(240, 52, 75, 0.13)',
  },
  bidBar: {
    backgroundColor: 'rgba(47, 127, 238, 0.13)',
  },
  sideCell: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  priceCell: {
    flex: 1,
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 12,
    textAlign: 'center',
    ...tabularNums,
  },
  askQuantity: {
    color: COLORS.stockUpText,
    textAlign: 'right',
  },
  bidQuantity: {
    color: COLORS.stockDownText,
    textAlign: 'left',
  },
  priceText: {
    fontSize: 13,
    fontWeight: '600',
    ...tabularNums,
  },
  askPrice: {
    color: COLORS.stockUpText,
  },
  bidPrice: {
    color: COLORS.stockDownText,
  },
  bestPrice: {
    fontWeight: '800',
  },
  currentPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    backgroundColor: COLORS.surfaceSunken,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: COLORS.border,
  },
  currentPriceLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  currentPriceValue: {
    fontSize: 19,
    fontWeight: '700',
    ...tabularNums,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '600',
    ...tabularNums,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  ratioBar: {
    flexDirection: 'row',
    height: 4,
    marginTop: 10,
    marginHorizontal: 16,
    borderRadius: 2,
    overflow: 'hidden',
  },
  ratioFillBid: {
    backgroundColor: COLORS.stockDown,
  },
  ratioFillAsk: {
    backgroundColor: COLORS.stockUp,
  },
  summary: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    ...tabularNums,
  },
  upColor: {
    color: COLORS.stockUpText,
  },
  downColor: {
    color: COLORS.stockDownText,
  },
  spreadInfo: {
    paddingBottom: 14,
    alignItems: 'center',
  },
  spreadText: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
});
