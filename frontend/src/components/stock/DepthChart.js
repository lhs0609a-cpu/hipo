import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getAppWidth, getAppHeight } from '../../utils/appWidth';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  VictoryChart,
  VictoryArea,
  VictoryAxis,
  VictoryLine,
} from 'victory-native';
import { getOrderBook } from '../../api/stocks';
import socketService from '../../services/socketService';
import { COLORS } from '../../constants/colors';

const SCREEN_WIDTH = getAppWidth();
const CHART_WIDTH = SCREEN_WIDTH - 32;
const CHART_HEIGHT = 200;
const CHART_PADDING = { top: 20, bottom: 30, left: 50, right: 20 };

/**
 * DepthChart Component
 *
 * 호가 깊이 차트 - 매수/매도 누적 수량을 영역 차트로 시각화합니다.
 * - 매수(Bid): 높은 가격부터 낮은 가격 순으로 누적
 * - 매도(Ask): 낮은 가격부터 높은 가격 순으로 누적
 * - 현재가 라인을 중앙에 표시
 * - 10초마다 자동 갱신
 */
export default function DepthChart({ stockId, currentPrice, style }) {
  const [orderBook, setOrderBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadOrderBook = useCallback(async () => {
    try {
      const data = await getOrderBook(stockId);
      setOrderBook(data);
      setError(false);
    } catch (err) {
      console.error('호가 깊이 조회 오류:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [stockId]);

  useEffect(() => {
    if (!stockId) return undefined;

    loadOrderBook();
    socketService.subscribeStock(stockId);

    // 소켓이 밀어 주는 동안은 폴링하지 않는다. 끊기면 폴백으로 되살린다.
    let interval = null;
    const startPolling = () => {
      if (!interval) interval = setInterval(loadOrderBook, 10000);
    };
    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const offBook = socketService.on('orderBookUpdate', (data) => {
      if (data?.stockId && data.stockId !== stockId) return;
      stopPolling();
      setOrderBook(data);
      setError(false);
    });
    const offConn = socketService.on('connectionChange', (connected) => {
      if (connected) loadOrderBook();
      else startPolling();
    });

    const fallbackTimer = setTimeout(startPolling, 3000);

    return () => {
      offBook();
      offConn();
      clearTimeout(fallbackTimer);
      stopPolling();
      socketService.unsubscribeStock(stockId);
    };
  }, [loadOrderBook, stockId]);

  // 주문서 데이터를 누적 깊이 형식으로 변환
  const { bidDepth, askDepth, totalBidVolume, totalAskVolume, priceDomain, volumeDomain } =
    useMemo(() => {
      if (!orderBook || !orderBook.bids || !orderBook.asks) {
        return {
          bidDepth: [],
          askDepth: [],
          totalBidVolume: 0,
          totalAskVolume: 0,
          priceDomain: [0, 1],
          volumeDomain: [0, 1],
        };
      }

      const { bids, asks } = orderBook;

      // 매수(Bid): 높은 가격 -> 낮은 가격 순으로 정렬 후 누적
      const sortedBids = [...bids]
        .sort((a, b) => b.price - a.price)
        .filter((b) => b.price > 0 && b.quantity > 0);

      let bidCumulative = 0;
      const cumulativeBids = sortedBids.map((bid) => {
        bidCumulative += bid.quantity;
        return { x: bid.price, y: bidCumulative };
      });

      // 매수 깊이는 가격 오름차순으로 표시 (왼쪽에서 오른쪽으로)
      const bidDepthData = cumulativeBids.reverse();

      // 매도(Ask): 낮은 가격 -> 높은 가격 순으로 정렬 후 누적
      const sortedAsks = [...asks]
        .sort((a, b) => a.price - b.price)
        .filter((a) => a.price > 0 && a.quantity > 0);

      let askCumulative = 0;
      const askDepthData = sortedAsks.map((ask) => {
        askCumulative += ask.quantity;
        return { x: ask.price, y: askCumulative };
      });

      const totalBid = bidCumulative;
      const totalAsk = askCumulative;

      // 가격 도메인 계산
      const allPrices = [
        ...bidDepthData.map((d) => d.x),
        ...askDepthData.map((d) => d.x),
      ];

      if (allPrices.length === 0) {
        return {
          bidDepth: [],
          askDepth: [],
          totalBidVolume: 0,
          totalAskVolume: 0,
          priceDomain: [0, 1],
          volumeDomain: [0, 1],
        };
      }

      const minPrice = Math.min(...allPrices) * 0.995;
      const maxPrice = Math.max(...allPrices) * 1.005;
      const maxVolume = Math.max(totalBid, totalAsk) * 1.1;

      return {
        bidDepth: bidDepthData,
        askDepth: askDepthData,
        totalBidVolume: totalBid,
        totalAskVolume: totalAsk,
        priceDomain: [minPrice, maxPrice],
        volumeDomain: [0, maxVolume],
      };
    }, [orderBook]);

  const effectivePrice = currentPrice || orderBook?.currentPrice || 0;

  // 로딩 상태
  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.header}>
          <Text style={styles.title}>호가 깊이</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  // 에러 또는 빈 데이터 상태
  if (error || bidDepth.length === 0 && askDepth.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.header}>
          <Text style={styles.title}>호가 깊이</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {error ? '데이터를 불러올 수 없습니다' : '호가 데이터가 없습니다'}
          </Text>
        </View>
      </View>
    );
  }

  // 매수/매도 비율 계산
  const totalVolume = totalBidVolume + totalAskVolume;
  const bidPercent = totalVolume > 0 ? ((totalBidVolume / totalVolume) * 100).toFixed(1) : '0.0';
  const askPercent = totalVolume > 0 ? ((totalAskVolume / totalVolume) * 100).toFixed(1) : '0.0';

  return (
    <View style={[styles.container, style]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>호가 깊이</Text>
      </View>

      {/* 매수/매도 수량 요약 */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: COLORS.down }]} />
          <Text style={styles.summaryLabel}>매수</Text>
          <Text style={[styles.summaryValue, { color: COLORS.down }]}>
            {totalBidVolume.toLocaleString()}주
          </Text>
          <Text style={[styles.summaryPercent, { color: COLORS.down }]}>
            ({bidPercent}%)
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: COLORS.up }]} />
          <Text style={styles.summaryLabel}>매도</Text>
          <Text style={[styles.summaryValue, { color: COLORS.up }]}>
            {totalAskVolume.toLocaleString()}주
          </Text>
          <Text style={[styles.summaryPercent, { color: COLORS.up }]}>
            ({askPercent}%)
          </Text>
        </View>
      </View>

      {/* 깊이 차트 */}
      <View style={styles.chartContainer}>
        <VictoryChart
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          padding={CHART_PADDING}
          domain={{ x: priceDomain, y: volumeDomain }}
        >
          {/* Y축 (수량) */}
          <VictoryAxis
            dependentAxis
            style={{
              axis: { stroke: COLORS.border },
              tickLabels: {
                fill: COLORS.textSecondary,
                fontSize: 10,
                fontWeight: '400',
              },
              grid: {
                stroke: COLORS.border,
                strokeDasharray: '4,4',
                strokeOpacity: 0.3,
              },
            }}
            tickFormat={(t) => {
              if (t >= 10000) return `${(t / 10000).toFixed(0)}만`;
              if (t >= 1000) return `${(t / 1000).toFixed(0)}천`;
              return t.toLocaleString();
            }}
          />

          {/* X축 (가격) */}
          <VictoryAxis
            style={{
              axis: { stroke: COLORS.border },
              tickLabels: {
                fill: COLORS.textSecondary,
                fontSize: 10,
                fontWeight: '400',
              },
            }}
            tickFormat={(t) => {
              if (t >= 10000) return `${(t / 10000).toFixed(1)}만`;
              if (t >= 1000) return `${(t / 1000).toFixed(1)}천`;
              return Math.round(t).toLocaleString();
            }}
          />

          {/* 매수 영역 (파란색) */}
          {bidDepth.length > 0 && (
            <VictoryArea
              data={bidDepth}
              interpolation="stepAfter"
              style={{
                data: {
                  fill: 'rgba(43, 95, 227,0.3)',
                  stroke: COLORS.down,
                  strokeWidth: 1.5,
                },
              }}
            />
          )}

          {/* 매도 영역 (빨간색) */}
          {askDepth.length > 0 && (
            <VictoryArea
              data={askDepth}
              interpolation="stepBefore"
              style={{
                data: {
                  fill: 'rgba(240, 52, 75,0.3)',
                  stroke: COLORS.up,
                  strokeWidth: 1.5,
                },
              }}
            />
          )}

          {/* 현재가 라인 */}
          {effectivePrice > 0 && (
            <VictoryLine
              data={[
                { x: effectivePrice, y: 0 },
                { x: effectivePrice, y: volumeDomain[1] },
              ]}
              style={{
                data: {
                  stroke: COLORS.gray500,
                  strokeWidth: 1,
                  strokeDasharray: '6,4',
                },
              }}
            />
          )}
        </VictoryChart>
      </View>

      {/* 현재가 표시 */}
      {effectivePrice > 0 && (
        <View style={styles.currentPriceRow}>
          <Text style={styles.currentPriceLabel}>현재가</Text>
          <Text style={styles.currentPriceValue}>
            {effectivePrice.toLocaleString()} PO
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 4,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  summaryPercent: {
    fontSize: 11,
    fontWeight: '500',
  },
  chartContainer: {
    alignItems: 'center',
  },
  loadingContainer: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  currentPriceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    marginHorizontal: 16,
  },
  currentPriceLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  currentPriceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
});
