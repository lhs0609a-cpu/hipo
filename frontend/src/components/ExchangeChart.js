import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import Svg, { Line, Rect, Polyline, Text as SvgText } from 'react-native-svg';
import { getPriceHistory } from '../api/stocks';
import { getPeriodConfig } from './stock/TimePeriodSelector';
import { COLORS } from '../constants/colors';

export default function ExchangeChart({ stockId, period = '1M', chartType = 'candle' }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [average, setAverage] = useState(true);
  const [width, setWidth] = useState(340);
  useEffect(() => {
    let active = true;
    let busy = false;
    setHistory([]);
    setSelected(null);
    setLoading(true);
    const load = async () => {
      if (busy) return;
      busy = true;
      try {
        const config = getPeriodConfig(period);
        const data = await getPriceHistory(stockId, config.timeframe, config.limit);
        if (active) { setHistory(data.history || []); setError(''); }
      } catch (_) {
        if (active) setError('차트 데이터를 불러오지 못했습니다. 다시 시도 중입니다.');
      } finally { busy = false; if (active) setLoading(false); }
    };
    load();
    const timer = setInterval(load, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [stockId, period]);

  const left = 12, right = width - 64, top = 16, bottom = 226;
  const values = history.flatMap(item => [Number(item.low), Number(item.high), ...(average && item.sma20 != null ? [Number(item.sma20)] : [])]);
  const low = Math.min(...values), high = Math.max(...values);
  const margin = Math.max((high - low) * 0.08, 1);
  const min = low - margin, max = high + margin;
  const x = index => left + (index + 0.5) * (right - left) / Math.max(1, history.length);
  const y = price => bottom - (Number(price) - min) / (max - min) * (bottom - top);
  const maxVolume = Math.max(1, ...history.map(item => Number(item.volume)));
  const point = history.find(item => item.timestamp === selected) || history[history.length - 1];
  const format = value => Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 });

  return <View onLayout={event => setWidth(Math.max(240, event.nativeEvent.layout.width))}>
    {loading ? <ActivityIndicator style={{ padding: 40 }} color={COLORS.primary} /> : <>
      {!!error && <Text style={styles.note}>{error}</Text>}
      {!history.length ? <Text style={styles.empty}>아직 체결된 거래가 없습니다.</Text> : <>
        <View style={styles.controls}>
          <Text style={styles.note}>실제 체결 기준 · PO</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => setAverage(!average)}>
            <Text style={{ color: average ? '#B7791F' : COLORS.textSecondary }}>20기간 이동평균 {average ? '켜짐' : '꺼짐'}</Text>
          </TouchableOpacity>
        </View>
        <Svg width={width} height={300} accessibilityLabel="주가와 거래량 차트">
          {[0, 1, 2, 3, 4].map(index => {
            const price = min + (max - min) * index / 4;
            return <React.Fragment key={index}>
              <Line x1={left} x2={right} y1={y(price)} y2={y(price)} stroke={COLORS.border} />
              <SvgText x={right + 4} y={y(price) + 4} fontSize={10} fill={COLORS.textSecondary}>{format(price)}</SvgText>
            </React.Fragment>;
          })}
          {chartType === 'line' && <Polyline points={history.map((item, index) => `${x(index)},${y(item.close)}`).join(' ')} fill="none" stroke={COLORS.primary} strokeWidth={2} />}
          {average && <Polyline points={history.flatMap((item, index) => item.sma20 == null ? [] : [`${x(index)},${y(item.sma20)}`]).join(' ')} fill="none" stroke="#B7791F" strokeWidth={1.5} />}
          {history.map((item, index) => {
            const color = Number(item.close) >= Number(item.open) ? COLORS.up : COLORS.down;
            const candleWidth = Math.max(1, (right - left) / history.length * 0.65);
            return <React.Fragment key={item.timestamp}>
              {chartType === 'candle' && <>
                <Line x1={x(index)} x2={x(index)} y1={y(item.high)} y2={y(item.low)} stroke={color} />
                <Rect x={x(index) - candleWidth / 2} y={Math.min(y(item.open), y(item.close))} width={candleWidth} height={Math.max(1, Math.abs(y(item.open) - y(item.close)))} fill={color} />
              </>}
              <Rect x={x(index) - candleWidth / 2} y={278 - Number(item.volume) / maxVolume * 38} width={candleWidth} height={Math.max(1, Number(item.volume) / maxVolume * 38)} fill={color} opacity={0.55} />
              <Rect x={x(index) - (right - left) / history.length / 2} y={top} width={(right - left) / history.length} height={262} fill="transparent" onPress={() => setSelected(item.timestamp)} />
            </React.Fragment>;
          })}
          <SvgText x={left} y={297} fontSize={10} fill={COLORS.textSecondary}>{new Date(history[0].timestamp).toLocaleDateString('ko-KR')}</SvgText>
          <SvgText x={right} y={297} textAnchor="end" fontSize={10} fill={COLORS.textSecondary}>{new Date(history[history.length - 1].timestamp).toLocaleDateString('ko-KR')}</SvgText>
        </Svg>
        {point && <Text style={styles.note}>
          {new Date(point.timestamp).toLocaleString('ko-KR')}{'\n'}
          시가 {format(point.open)} · 고가 {format(point.high)} · 저가 {format(point.low)} · 종가 {format(point.close)}{'\n'}
          거래량 {format(point.volume)}주{point.rsi != null ? ` · RSI ${format(point.rsi)}` : ''}
        </Text>}
      </>}
    </>}
  </View>;
}
const styles = StyleSheet.create({
  controls: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, flexWrap: 'wrap', gap: 8 },
  note: { color: COLORS.textSecondary, fontSize: 12, padding: 8, lineHeight: 20 },
  empty: { padding: 40, textAlign: 'center', color: COLORS.textSecondary }
});
