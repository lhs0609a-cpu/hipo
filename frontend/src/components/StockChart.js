import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getAppWidth, getAppHeight } from '../utils/appWidth';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  PanResponder,
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
import socketService from '../services/socketService';
import { getPeriodConfig, isIntraday } from './stock/TimePeriodSelector';
import { hitSlop } from '../styles/tokens';
import haptics from '../utils/haptics';

const SCREEN_WIDTH = getAppWidth();
const CHART_WIDTH = SCREEN_WIDTH - 32;
const CHART_HEIGHT = 280;

/** 메인 차트의 VictoryChart padding 과 반드시 같아야 크로스헤어가 어긋나지 않는다 */
const CHART_PADDING = { top: 20, bottom: 30, left: 50, right: 20 };
const PLOT_LEFT = CHART_PADDING.left;
const PLOT_RIGHT = CHART_WIDTH - CHART_PADDING.right;
const PLOT_TOP = CHART_PADDING.top;
const PLOT_BOTTOM = CHART_HEIGHT - CHART_PADDING.bottom;
const PLOT_WIDTH = PLOT_RIGHT - PLOT_LEFT;
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;

/** 이 시간 이상 누르고 있으면 크로스헤어 모드로 들어간다 */
const CROSSHAIR_HOLD_MS = 220;

/** 확대해도 이보다 적게는 안 보여 준다 */
const MIN_VISIBLE_CANDLES = 10;

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

/** 두 손가락 사이 거리 (핀치 배율 계산용) */
const touchDistance = (touches) => {
  if (!touches || touches.length < 2) return 0;
  const [a, b] = touches;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
};

export default function StockChart({
  stockId,
  mini = false,
  period = '1M',
  chartType = 'candle',
  showIndicators = true,
  onDataPointTouch,
  enableRealtime = false,
}) {
  const [loading, setLoading] = useState(true);
  /** 서버에서 받은 전체 캔들. 화면에는 viewport 로 잘라낸 구간만 그린다. */
  const [fullHistory, setFullHistory] = useState([]);
  /**
   * 확대/이동 상태. null 이면 전체 구간을 본다.
   *  count = 화면에 보이는 봉 개수, end = 오른쪽 끝 인덱스(1-based)
   */
  const [viewport, setViewport] = useState(null);
  const gestureRef = useRef({ startCount: 0, startEnd: 0, startDist: 0 });
  const [selectedPoint, setSelectedPoint] = useState(null);
  /**
   * 크로스헤어. 길게 눌러 드래그하면 그 지점의 봉 값을 십자선으로 짚어 준다.
   * { index, x, y } — index 는 보이는 구간 안에서의 위치(0-based)
   */
  const [crosshair, setCrosshair] = useState(null);
  const [selectedIndicators, setSelectedIndicators] = useState({
    sma20: true,
    sma50: false,
    bollinger: false,
    ema: false,
  });
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showVolume, setShowVolume] = useState(true);

  /**
   * 화면에 그릴 구간.
   *
   * 아래 렌더 코드는 전부 이 `history` 를 쓰므로, 확대/이동을 해도
   * 캔들·지표·축이 같은 구간을 보게 된다.
   */
  const history = useMemo(() => {
    if (!viewport || fullHistory.length === 0) return fullHistory;
    const count = clamp(viewport.count, MIN_VISIBLE_CANDLES, fullHistory.length);
    const end = clamp(viewport.end, count, fullHistory.length);
    return fullHistory.slice(end - count, end);
  }, [fullHistory, viewport]);

  /**
   * 차트 제스처.
   *  - 길게 누르기(220ms) 후 드래그 → 크로스헤어로 값 스크럽
   *  - 한 손가락 드래그      → 좌우 이동
   *  - 두 손가락            → 확대/축소
   */
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderGrant: (evt) => {
          const total = fullHistory.length;
          const cur = viewport || { count: total, end: total };
          const { locationX, locationY } = evt.nativeEvent;

          gestureRef.current = {
            startCount: clamp(cur.count, MIN_VISIBLE_CANDLES, total),
            startEnd: clamp(cur.end, 1, total),
            startDist: touchDistance(evt.nativeEvent.touches),
            crosshairMode: false,
            holdTimer: setTimeout(() => {
              gestureRef.current.crosshairMode = true;
              haptics.selection();
              setCrosshair({ x: locationX, y: locationY });
            }, CROSSHAIR_HOLD_MS),
          };
        },

        onPanResponderMove: (evt, g) => {
          const total = fullHistory.length;
          if (total === 0) return;
          const touches = evt.nativeEvent.touches;
          const start = gestureRef.current;

          // 크로스헤어 중에는 이동/확대를 하지 않는다
          if (start.crosshairMode) {
            setCrosshair({ x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY });
            return;
          }

          // 손가락이 움직였으면 롱프레스 취소
          if (Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6) {
            clearTimeout(start.holdTimer);
          }

          if (touches.length === 2) {
            clearTimeout(start.holdTimer);
            const dist = touchDistance(touches);
            if (start.startDist > 0 && dist > 0) {
              // 벌리면 확대(보이는 봉 수 감소), 오므리면 축소
              const scale = dist / start.startDist;
              const nextCount = clamp(
                Math.round(start.startCount / scale),
                MIN_VISIBLE_CANDLES,
                total
              );
              setViewport({
                count: nextCount,
                end: clamp(start.startEnd, nextCount, total),
              });
            }
            return;
          }

          if (Math.abs(g.dx) <= 6) return;

          // 드래그 거리를 봉 개수로 환산해 좌우 이동
          const candlesPerPx = start.startCount / CHART_WIDTH;
          const shift = Math.round(-g.dx * candlesPerPx);
          setViewport({
            count: start.startCount,
            end: clamp(start.startEnd + shift, start.startCount, total),
          });
        },

        onPanResponderRelease: () => {
          clearTimeout(gestureRef.current.holdTimer);
          gestureRef.current.crosshairMode = false;
          setCrosshair(null);
        },
        onPanResponderTerminate: () => {
          clearTimeout(gestureRef.current.holdTimer);
          gestureRef.current.crosshairMode = false;
          setCrosshair(null);
        },
      }),
    [fullHistory.length, viewport]
  );

  const isZoomed = viewport != null && viewport.count < fullHistory.length;

  // 기간 설정은 TimePeriodSelector 와 공유한다 (예전엔 표가 두 벌이라 값이 어긋났다)
  const periodConfig = useMemo(() => {
    const base = getPeriodConfig(period);
    return mini ? { ...base, limit: Math.min(base.limit, 30) } : base;
  }, [period, mini]);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const config = periodConfig;
      const data = await getPriceHistory(stockId, config.timeframe, config.limit);
      if (data.history && data.history.length > 0) {
        setFullHistory(data.history);
      }
    } catch (error) {
      console.error('가격 히스토리 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  }, [stockId, periodConfig]);

  useEffect(() => {
    if (stockId) {
      loadHistory();
    }
  }, [stockId, loadHistory]);

  // 실시간 가격 업데이트 (Socket.IO)
  useEffect(() => {
    if (!enableRealtime || !stockId) return;

    // 이 종목의 실시간 갱신만 받는다
    socketService.subscribeStock(stockId);

    const handlePriceUpdate = (data) => {
      if (!data || !data.newPrice) return;
      // 서버가 종목 room 으로 보내지만, 전역 티커가 섞여 들어올 수 있으므로 한 번 더 거른다.
      // 이 검사가 없으면 다른 종목이 체결될 때 현재 차트의 마지막 봉이 덮어써진다.
      if (data.stockId && data.stockId !== stockId) return;
      setFullHistory((prev) => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        const last = { ...updated[updated.length - 1] };
        last.close = String(data.newPrice);
        if (data.newPrice > parseFloat(last.high)) last.high = String(data.newPrice);
        if (data.newPrice < parseFloat(last.low)) last.low = String(data.newPrice);
        last.volume = String((parseInt(last.volume || '0', 10) + (data.volume || 1)));
        updated[updated.length - 1] = last;
        return updated;
      });
    };

    const cleanup = socketService.on('stockPriceUpdate', handlePriceUpdate);

    // 30초마다 전체 갱신
    const refreshInterval = setInterval(() => {
      loadHistory();
    }, 30000);

    return () => {
      cleanup();
      socketService.unsubscribeStock(stockId);
      clearInterval(refreshInterval);
    };
  }, [enableRealtime, stockId, loadHistory]);

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

  if (fullHistory.length === 0) {
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

  /**
   * 크로스헤어 위치 → 봉 인덱스와 가격.
   * VictoryChart 의 padding 과 같은 좌표계를 쓰므로 선이 캔들과 정확히 겹친다.
   */
  const crosshairInfo = (() => {
    if (!crosshair || candleData.length === 0) return null;

    const x = clamp(crosshair.x, PLOT_LEFT, PLOT_RIGHT);
    const y = clamp(crosshair.y, PLOT_TOP, PLOT_BOTTOM);

    const ratio = PLOT_WIDTH > 0 ? (x - PLOT_LEFT) / PLOT_WIDTH : 0;
    const index = clamp(Math.round(ratio * (candleData.length - 1)), 0, candleData.length - 1);

    // 선은 실제 봉 위치에 스냅시킨다
    const snappedX =
      candleData.length === 1
        ? PLOT_LEFT + PLOT_WIDTH / 2
        : PLOT_LEFT + (index / (candleData.length - 1)) * PLOT_WIDTH;

    const priceAtY = maxPrice - ((y - PLOT_TOP) / PLOT_HEIGHT) * (maxPrice - minPrice);

    return { candle: candleData[index], x: snappedX, y, priceAtY, index };
  })();

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
              style={[styles.indicatorButton, showVolume && styles.indicatorButtonActive]}
              onPress={() => setShowVolume(!showVolume)}
            >
              <Text
                style={[
                  styles.indicatorButtonText,
                  showVolume && styles.indicatorButtonTextActive,
                ]}
              >
                VOL
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

      {/* 확대 상태 표시 및 초기화 */}
      {isZoomed && (
        <View style={styles.zoomBar}>
          <Text style={styles.zoomText}>
            {history.length}봉 / 전체 {fullHistory.length}봉
          </Text>
          <TouchableOpacity onPress={() => setViewport(null)} hitSlop={hitSlop.base}>
            <Text style={styles.zoomReset}>전체 보기</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 메인 차트 — 한 손가락 드래그로 이동, 두 손가락으로 확대/축소 */}
      <View style={styles.chartContainer} {...panResponder.panHandlers}>
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
                if (!date) return '';
                // 분·시간봉이면 날짜 대신 시:분을 보여준다
                if (isIntraday(periodConfig.timeframe)) {
                  return `${String(date.getHours()).padStart(2, '0')}:${String(
                    date.getMinutes()
                  ).padStart(2, '0')}`;
                }
                return `${date.getMonth() + 1}/${date.getDate()}`;
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
                  data: { stroke: '#8B5CF6', strokeWidth: 1, strokeDasharray: '4,4' },
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
                  data: { stroke: '#8B5CF6', strokeWidth: 1.5 },
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
                  data: { stroke: '#8B5CF6', strokeWidth: 1, strokeDasharray: '4,4' },
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
                data: { stroke: '#F59B00', strokeWidth: 1.5 },
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
                data: { stroke: '#2B5FE3', strokeWidth: 1.5 },
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
                  data: { stroke: '#00B368', strokeWidth: 1.5 },
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
                  data: { stroke: '#F0344B', strokeWidth: 1.5 },
                }}
              />
            </>
          )}
        </VictoryChart>

        {/* 크로스헤어 — 길게 눌러 드래그하면 그 봉의 값을 짚어 준다 */}
        {crosshairInfo && (
          <View style={styles.crosshairLayer} pointerEvents="none">
            <View style={[styles.crosshairV, { left: crosshairInfo.x }]} />
            <View style={[styles.crosshairH, { top: crosshairInfo.y }]} />

            {/* 좌측 가격 축 라벨 */}
            <View style={[styles.crosshairPriceTag, { top: crosshairInfo.y - 9 }]}>
              <Text style={styles.crosshairTagText}>
                {Math.round(crosshairInfo.priceAtY).toLocaleString()}
              </Text>
            </View>

            {/* 하단 시간 축 라벨 */}
            <View
              style={[
                styles.crosshairTimeTag,
                {
                  left: clamp(crosshairInfo.x - 34, 0, CHART_WIDTH - 68),
                  top: PLOT_BOTTOM + 4,
                },
              ]}
            >
              <Text style={styles.crosshairTagText}>
                {isIntraday(periodConfig.timeframe)
                  ? `${String(crosshairInfo.candle.date.getHours()).padStart(2, '0')}:${String(
                      crosshairInfo.candle.date.getMinutes()
                    ).padStart(2, '0')}`
                  : `${crosshairInfo.candle.date.getMonth() + 1}/${crosshairInfo.candle.date.getDate()}`}
              </Text>
            </View>

            {/* OHLC 요약 */}
            <View
              style={[
                styles.crosshairOhlc,
                crosshairInfo.x > CHART_WIDTH / 2 ? { left: PLOT_LEFT + 4 } : { right: 12 },
              ]}
            >
              {[
                ['시', crosshairInfo.candle.open],
                ['고', crosshairInfo.candle.high],
                ['저', crosshairInfo.candle.low],
                ['종', crosshairInfo.candle.close],
              ].map(([label, value]) => (
                <Text key={label} style={styles.crosshairOhlcText}>
                  <Text style={styles.crosshairOhlcLabel}>{label} </Text>
                  {Math.round(value).toLocaleString()}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* 범례 */}
        <View style={styles.legend}>
          {selectedIndicators.sma20 && (
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#F59B00' }]} />
              <Text style={styles.legendText}>SMA(20)</Text>
            </View>
          )}
          {selectedIndicators.sma50 && (
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#2B5FE3' }]} />
              <Text style={styles.legendText}>SMA(50)</Text>
            </View>
          )}
          {selectedIndicators.bollinger && (
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#8B5CF6' }]} />
              <Text style={styles.legendText}>Bollinger</Text>
            </View>
          )}
          {selectedIndicators.ema && (
            <>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#00B368' }]} />
                <Text style={styles.legendText}>EMA(12)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#F0344B' }]} />
                <Text style={styles.legendText}>EMA(26)</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* 거래량 차트 */}
      {showVolume && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>거래량</Text>
          <VictoryChart
            width={CHART_WIDTH}
            height={100}
            padding={{ top: 10, bottom: 30, left: 50, right: 20 }}
          >
            <VictoryAxis
              dependentAxis
              style={{
                axis: { stroke: COLORS.border },
                tickLabels: { fill: COLORS.textSecondary, fontSize: 9 },
                grid: { stroke: COLORS.border, strokeDasharray: '4,4', strokeOpacity: 0.2 },
              }}
              tickFormat={(t) => {
                if (t >= 1000000) return `${(t / 1000000).toFixed(1)}M`;
                if (t >= 1000) return `${(t / 1000).toFixed(0)}K`;
                return t;
              }}
            />
            <VictoryAxis
              style={{
                axis: { stroke: COLORS.border },
                tickLabels: { fill: COLORS.textSecondary, fontSize: 10 },
              }}
              tickFormat={() => ''}
            />
            <VictoryBar
              data={history.map((h, i) => ({
                x: i + 1,
                y: parseInt(h.volume || 0, 10),
                isUp: i > 0 ? parseFloat(h.close) >= parseFloat(history[i - 1].close) : true,
              }))}
              style={{
                data: {
                  fill: ({ datum }) => datum.isUp ? 'rgba(240, 52, 75, 0.6)' : 'rgba(43, 95, 227, 0.6)',
                  width: Math.max(2, (CHART_WIDTH - 70) / history.length - 1),
                },
              }}
            />
          </VictoryChart>
        </View>
      )}

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
                data: { stroke: '#7C4DEF', strokeWidth: 2 },
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
                data: { stroke: '#2B5FE3', strokeWidth: 1.5 },
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
                data: { stroke: '#F59B00', strokeWidth: 1.5 },
              }}
            />
          </VictoryChart>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#2B5FE3' }]} />
              <Text style={styles.legendText}>MACD</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#F59B00' }]} />
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
  crosshairLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
  },
  crosshairV: {
    position: 'absolute',
    top: PLOT_TOP,
    height: PLOT_HEIGHT,
    width: StyleSheet.hairlineWidth * 2,
    backgroundColor: COLORS.textTertiary,
  },
  crosshairH: {
    position: 'absolute',
    left: PLOT_LEFT,
    width: PLOT_WIDTH,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: COLORS.textTertiary,
  },
  crosshairPriceTag: {
    position: 'absolute',
    left: 0,
    minWidth: 46,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: COLORS.textPrimary,
    alignItems: 'center',
  },
  crosshairTimeTag: {
    position: 'absolute',
    width: 68,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: COLORS.textPrimary,
    alignItems: 'center',
  },
  crosshairTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textInverse,
  },
  crosshairOhlc: {
    position: 'absolute',
    top: PLOT_TOP + 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.overlayLight,
  },
  crosshairOhlcText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textInverse,
    lineHeight: 15,
  },
  crosshairOhlcLabel: {
    color: COLORS.gray300,
    fontWeight: '400',
  },
  zoomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  zoomText: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  zoomReset: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
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
