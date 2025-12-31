import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryCandlestick,
  VictoryArea,
  VictoryBar,
  VictoryVoronoiContainer,
  VictoryTooltip,
  VictoryScatter,
} from 'victory-native';
import { getPriceHistory } from '../api/stocks';
import { COLORS } from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32;
const CHART_HEIGHT = 280;

export default function StockChart({
  stockId,
  mini = false,
  period = '1M',
  chartType = 'candle',
  showIndicators = true,
  onDataPointTouch,
}) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [selectedIndicators, setSelectedIndicators] = useState({
    sma20: true,
    sma50: false,
    bollinger: false,
    ema: false,
  });
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);

  // 기간에 따른 데이터 로드 설정
  const getPeriodConfig = useCallback(() => {
    switch (period) {
      case '1D':
        return { timeframe: '1h', limit: 24 };
      case '1W':
        return { timeframe: '1d', limit: 7 };
      case '1M':
        return { timeframe: '1d', limit: 30 };
      case '3M':
        return { timeframe: '1d', limit: 90 };
      case '1Y':
        return { timeframe: '1d', limit: 365 };
      default:
        return { timeframe: '1d', limit: mini ? 30 : 90 };
    }
  }, [period, mini]);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const config = getPeriodConfig();
      const data = await getPriceHistory(stockId, config.timeframe, config.limit);
      if (data.history && data.history.length > 0) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error('가격 히스토리 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  }, [stockId, getPeriodConfig]);

  useEffect(() => {
    if (stockId) {
      loadHistory();
    }
  }, [stockId, loadHistory]);

  const toggleIndicator = (indicator) => {
    setSelectedIndicators((prev) => ({
      ...prev,
      [indicator]: !prev[indicator],
    }));
  };

  const handleDataPointClick = useCallback(
    (datum) => {
      setSelectedPoint(datum);
      if (onDataPointTouch) {
        onDataPointTouch(datum);
      }
    },
    [onDataPointTouch]
  );

  if (loading) {
    return (
      <View style={[styles.container, mini && styles.miniContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View style={[styles.container, mini && styles.miniContainer]}>
        <Text style={styles.emptyText}>차트 데이터가 없습니다</Text>
      </View>
    );
  }

  // 캔들스틱 데이터 준비
  const candleData = history.map((h, i) => ({
    x: i + 1,
    open: parseFloat(h.open),
    high: parseFloat(h.high),
    low: parseFloat(h.low),
    close: parseFloat(h.close),
    date: new Date(h.timestamp),
  }));

  // 라인 차트용 데이터
  const lineData = history.map((h, i) => ({
    x: i + 1,
    y: parseFloat(h.close),
    date: new Date(h.timestamp),
    open: parseFloat(h.open),
    high: parseFloat(h.high),
    low: parseFloat(h.low),
    close: parseFloat(h.close),
  }));

  // 가격 범위 계산
  const allPrices = history.flatMap((h) =>
    [
      parseFloat(h.high),
      parseFloat(h.low),
      h.bollingerUpper ? parseFloat(h.bollingerUpper) : 0,
      h.bollingerLower ? parseFloat(h.bollingerLower) : 0,
    ].filter((p) => p > 0)
  );

  const minPrice = Math.min(...allPrices) * 0.98;
  const maxPrice = Math.max(...allPrices) * 1.02;

  const isUp =
    parseFloat(history[history.length - 1].close) >= parseFloat(history[0].close);

  // 미니 차트 렌더링 (간단한 라인 차트)
  if (mini) {
    const closePrices = history.map((h, i) => ({
      x: i + 1,
      y: parseFloat(h.close),
    }));

    return (
      <View style={styles.miniContainer}>
        <VictoryChart
          width={CHART_WIDTH}
          height={100}
          padding={{ top: 10, bottom: 10, left: 40, right: 10 }}
          domain={{ y: [minPrice, maxPrice] }}
        >
          <VictoryLine
            data={closePrices}
            style={{
              data: { stroke: isUp ? COLORS.up : COLORS.down, strokeWidth: 2 },
            }}
          />
          <VictoryArea
            data={closePrices}
            style={{
              data: {
                fill: isUp ? COLORS.up : COLORS.down,
                fillOpacity: 0.1,
              },
            }}
          />
        </VictoryChart>
      </View>
    );
  }

  // 선택된 포인트 정보 표시
  const renderSelectedPointInfo = () => {
    if (!selectedPoint) return null;

    const date = selectedPoint.date || new Date();
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

    return (
      <View style={styles.selectedPointInfo}>
        <Text style={styles.selectedPointDate}>{dateStr}</Text>
        <View style={styles.selectedPointPrices}>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>시</Text>
            <Text style={styles.priceValue}>
              {(selectedPoint.open || 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>고</Text>
            <Text style={[styles.priceValue, { color: COLORS.up }]}>
              {(selectedPoint.high || 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>저</Text>
            <Text style={[styles.priceValue, { color: COLORS.down }]}>
              {(selectedPoint.low || 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>종</Text>
            <Text style={styles.priceValue}>
              {(selectedPoint.close || selectedPoint.y || 0).toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // 전체 차트 렌더링
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 선택된 포인트 정보 */}
      {renderSelectedPointInfo()}

      {/* 지표 선택 버튼 */}
      {showIndicators && (
        <View style={styles.indicatorButtons}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.indicatorButton,
                selectedIndicators.sma20 && styles.indicatorButtonActive,
              ]}
              onPress={() => toggleIndicator('sma20')}
            >
              <Text
                style={[
                  styles.indicatorButtonText,
                  selectedIndicators.sma20 && styles.indicatorButtonTextActive,
                ]}
              >
                SMA(20)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.indicatorButton,
                selectedIndicators.sma50 && styles.indicatorButtonActive,
              ]}
              onPress={() => toggleIndicator('sma50')}
            >
              <Text
                style={[
                  styles.indicatorButtonText,
                  selectedIndicators.sma50 && styles.indicatorButtonTextActive,
                ]}
              >
                SMA(50)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.indicatorButton,
                selectedIndicators.bollinger && styles.indicatorButtonActive,
              ]}
              onPress={() => toggleIndicator('bollinger')}
            >
              <Text
                style={[
                  styles.indicatorButtonText,
                  selectedIndicators.bollinger && styles.indicatorButtonTextActive,
                ]}
              >
                Bollinger
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.indicatorButton,
                selectedIndicators.ema && styles.indicatorButtonActive,
              ]}
              onPress={() => toggleIndicator('ema')}
            >
              <Text
                style={[
                  styles.indicatorButtonText,
                  selectedIndicators.ema && styles.indicatorButtonTextActive,
                ]}
              >
                EMA(12/26)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.indicatorButton, showRSI && styles.indicatorButtonActive]}
              onPress={() => setShowRSI(!showRSI)}
            >
              <Text
                style={[
                  styles.indicatorButtonText,
                  showRSI && styles.indicatorButtonTextActive,
                ]}
              >
                RSI
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.indicatorButton, showMACD && styles.indicatorButtonActive]}
              onPress={() => setShowMACD(!showMACD)}
            >
              <Text
                style={[
                  styles.indicatorButtonText,
                  showMACD && styles.indicatorButtonTextActive,
                ]}
              >
                MACD
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* 메인 차트 */}
      <View style={styles.chartContainer}>
        <VictoryChart
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          padding={{ top: 20, bottom: 30, left: 50, right: 20 }}
          domain={{ y: [minPrice, maxPrice] }}
          containerComponent={
            <VictoryVoronoiContainer
              voronoiDimension="x"
              labels={({ datum }) => ''}
              onActivated={(points) => {
                if (points.length > 0) {
                  handleDataPointClick(points[0]);
                }
              }}
            />
          }
        >
          <VictoryAxis
            dependentAxis
            style={{
              axis: { stroke: COLORS.border },
              tickLabels: { fill: COLORS.textSecondary, fontSize: 10 },
              grid: { stroke: COLORS.border, strokeDasharray: '4,4', strokeOpacity: 0.3 },
            }}
          />
          <VictoryAxis
            style={{
              axis: { stroke: COLORS.border },
              tickLabels: { fill: COLORS.textSecondary, fontSize: 10 },
            }}
            tickFormat={(t) => {
              const interval = Math.ceil(history.length / 5);
              if (t % interval === 0 || t === 1 || t === history.length) {
                const date = candleData[t - 1]?.date;
                if (date) {
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }
              }
              return '';
            }}
          />

          {/* 캔들스틱 또는 라인 차트 */}
          {chartType === 'candle' ? (
            <VictoryCandlestick
              data={candleData}
              candleColors={{ positive: COLORS.up, negative: COLORS.down }}
              style={{
                data: {
                  strokeWidth: 1,
                },
              }}
            />
          ) : (
            <>
              <VictoryArea
                data={lineData}
                style={{
                  data: {
                    fill: isUp ? COLORS.up : COLORS.down,
                    fillOpacity: 0.1,
                    stroke: isUp ? COLORS.up : COLORS.down,
                    strokeWidth: 2,
                  },
                }}
              />
            </>
          )}

          {/* 볼린저 밴드 */}
          {selectedIndicators.bollinger && (
            <>
              <VictoryLine
                data={history
                  .map((h, i) => ({
                    x: i + 1,
                    y: h.bollingerUpper ? parseFloat(h.bollingerUpper) : null,
                  }))
                  .filter((d) => d.y !== null)}
                style={{
                  data: { stroke: '#9C27B0', strokeWidth: 1, strokeDasharray: '4,4' },
                }}
              />
              <VictoryLine
                data={history
                  .map((h, i) => ({
                    x: i + 1,
                    y: h.bollingerMiddle ? parseFloat(h.bollingerMiddle) : null,
                  }))
                  .filter((d) => d.y !== null)}
                style={{
                  data: { stroke: '#9C27B0', strokeWidth: 1.5 },
                }}
              />
              <VictoryLine
                data={history
                  .map((h, i) => ({
                    x: i + 1,
                    y: h.bollingerLower ? parseFloat(h.bollingerLower) : null,
                  }))
                  .filter((d) => d.y !== null)}
                style={{
                  data: { stroke: '#9C27B0', strokeWidth: 1, strokeDasharray: '4,4' },
                }}
              />
            </>
          )}

          {/* SMA(20) */}
          {selectedIndicators.sma20 && (
            <VictoryLine
              data={history
                .map((h, i) => ({
                  x: i + 1,
                  y: h.sma20 ? parseFloat(h.sma20) : null,
                }))
                .filter((d) => d.y !== null)}
              style={{
                data: { stroke: '#FF9800', strokeWidth: 1.5 },
              }}
            />
          )}

          {/* SMA(50) */}
          {selectedIndicators.sma50 && (
            <VictoryLine
              data={history
                .map((h, i) => ({
                  x: i + 1,
                  y: h.sma50 ? parseFloat(h.sma50) : null,
                }))
                .filter((d) => d.y !== null)}
              style={{
                data: { stroke: '#2196F3', strokeWidth: 1.5 },
              }}
            />
          )}

          {/* EMA */}
          {selectedIndicators.ema && (
            <>
              <VictoryLine
                data={history
                  .map((h, i) => ({
                    x: i + 1,
                    y: h.ema12 ? parseFloat(h.ema12) : null,
                  }))
                  .filter((d) => d.y !== null)}
                style={{
                  data: { stroke: '#4CAF50', strokeWidth: 1.5 },
                }}
              />
              <VictoryLine
                data={history
                  .map((h, i) => ({
                    x: i + 1,
                    y: h.ema26 ? parseFloat(h.ema26) : null,
                  }))
                  .filter((d) => d.y !== null)}
                style={{
                  data: { stroke: '#F44336', strokeWidth: 1.5 },
                }}
              />
            </>
          )}
        </VictoryChart>

        {/* 범례 */}
        <View style={styles.legend}>
          {selectedIndicators.sma20 && (
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.legendText}>SMA(20)</Text>
            </View>
          )}
          {selectedIndicators.sma50 && (
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#2196F3' }]} />
              <Text style={styles.legendText}>SMA(50)</Text>
            </View>
          )}
          {selectedIndicators.bollinger && (
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#9C27B0' }]} />
              <Text style={styles.legendText}>Bollinger</Text>
            </View>
          )}
          {selectedIndicators.ema && (
            <>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.legendText}>EMA(12)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#F44336' }]} />
                <Text style={styles.legendText}>EMA(26)</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* RSI 차트 */}
      {showRSI && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>RSI (14)</Text>
          <VictoryChart
            width={CHART_WIDTH}
            height={120}
            padding={{ top: 20, bottom: 30, left: 50, right: 20 }}
            domain={{ y: [0, 100] }}
          >
            <VictoryAxis
              dependentAxis
              style={{
                axis: { stroke: COLORS.border },
                tickLabels: { fill: COLORS.textSecondary, fontSize: 10 },
                grid: { stroke: COLORS.border, strokeDasharray: '4,4', strokeOpacity: 0.3 },
              }}
              tickValues={[30, 50, 70]}
            />
            <VictoryAxis
              style={{
                axis: { stroke: COLORS.border },
                tickLabels: { fill: COLORS.textSecondary, fontSize: 10 },
              }}
              tickFormat={() => ''}
            />
            <VictoryLine
              data={history
                .map((h, i) => ({
                  x: i + 1,
                  y: h.rsi ? parseFloat(h.rsi) : null,
                }))
                .filter((d) => d.y !== null)}
              style={{
                data: { stroke: '#673AB7', strokeWidth: 2 },
              }}
            />
            {/* 과매수/과매도 기준선 */}
            <VictoryLine
              data={[
                { x: 0, y: 70 },
                { x: history.length + 1, y: 70 },
              ]}
              style={{
                data: { stroke: COLORS.up, strokeWidth: 1, strokeDasharray: '4,4' },
              }}
            />
            <VictoryLine
              data={[
                { x: 0, y: 30 },
                { x: history.length + 1, y: 30 },
              ]}
              style={{
                data: { stroke: COLORS.down, strokeWidth: 1, strokeDasharray: '4,4' },
              }}
            />
          </VictoryChart>
        </View>
      )}

      {/* MACD 차트 */}
      {showMACD && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>MACD</Text>
          <VictoryChart
            width={CHART_WIDTH}
            height={120}
            padding={{ top: 20, bottom: 30, left: 50, right: 20 }}
          >
            <VictoryAxis
              dependentAxis
              style={{
                axis: { stroke: COLORS.border },
                tickLabels: { fill: COLORS.textSecondary, fontSize: 10 },
                grid: { stroke: COLORS.border, strokeDasharray: '4,4', strokeOpacity: 0.3 },
              }}
            />
            <VictoryAxis
              style={{
                axis: { stroke: COLORS.border },
                tickLabels: { fill: COLORS.textSecondary, fontSize: 10 },
              }}
              tickFormat={() => ''}
            />
            {/* MACD 히스토그램 */}
            <VictoryBar
              data={history.map((h, i) => ({
                x: i + 1,
                y: h.macdHistogram ? parseFloat(h.macdHistogram) : 0,
              }))}
              style={{
                data: {
                  fill: ({ datum }) => (datum.y >= 0 ? COLORS.up : COLORS.down),
                  opacity: 0.5,
                },
              }}
            />
            {/* MACD 라인 */}
            <VictoryLine
              data={history
                .map((h, i) => ({
                  x: i + 1,
                  y: h.macd ? parseFloat(h.macd) : null,
                }))
                .filter((d) => d.y !== null)}
              style={{
                data: { stroke: '#2196F3', strokeWidth: 1.5 },
              }}
            />
            {/* 시그널 라인 */}
            <VictoryLine
              data={history
                .map((h, i) => ({
                  x: i + 1,
                  y: h.macdSignal ? parseFloat(h.macdSignal) : null,
                }))
                .filter((d) => d.y !== null)}
              style={{
                data: { stroke: '#FF9800', strokeWidth: 1.5 },
              }}
            />
          </VictoryChart>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#2196F3' }]} />
              <Text style={styles.legendText}>MACD</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.legendText}>Signal</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  miniContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  selectedPointInfo: {
    backgroundColor: COLORS.background,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectedPointDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  selectedPointPrices: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  priceItem: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  indicatorButtons: {
    paddingVertical: 12,
    paddingLeft: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  indicatorButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  indicatorButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  indicatorButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  indicatorButtonTextActive: {
    color: '#FFFFFF',
  },
  chartContainer: {
    marginVertical: 8,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    marginLeft: 16,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  legendColor: {
    width: 16,
    height: 3,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});
