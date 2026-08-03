import React, { useState, useEffect, useCallback } from 'react';
import { getAppWidth, getAppHeight } from '../utils/appWidth';
import { useTheme } from '../contexts/ThemeContext';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  VictoryChart,
  VictoryLine,
  VictoryArea,
  VictoryAxis,
  VictoryVoronoiContainer,
} from 'victory-native';
import { getMyHoldings } from '../api/stocks';
import { portfolioAPI } from '../services/api';
import { COLORS } from '../constants/colors';
import { LoadingState, ErrorState, EmptyState } from '../components/StateDisplay';
import PortfolioSummaryCard from '../components/PortfolioSummaryCard';
import TrustBadge from '../components/TrustBadge';
import HoldingBonusWidget from '../components/HoldingBonusWidget';
import ProfitShareCard from '../components/ProfitShareCard';

const SCREEN_WIDTH = getAppWidth();
const CHART_PERIODS = [
  { key: '7d', label: '1주' },
  { key: '30d', label: '1개월' },
  { key: '90d', label: '3개월' },
  { key: 'all', label: '전체' },
];

export default function PortfolioScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  const [holdings, setHoldings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [chartPeriod, setChartPeriod] = useState('30d');
  const [profitData, setProfitData] = useState(null);
  const [selectedChartPoint, setSelectedChartPoint] = useState(null);

  useEffect(() => {
    loadHoldings();
  }, []);

  const loadHoldings = async () => {
    try {
      setError(null);
      const [holdingsData, profitResult] = await Promise.all([
        getMyHoldings(),
        portfolioAPI.getProfitAnalysis(chartPeriod).then(r => r.data).catch(() => null),
      ]);
      setHoldings(holdingsData.holdings || []);
      setSummary(holdingsData.summary);
      if (profitResult) setProfitData(profitResult);
    } catch (error) {
      console.error('보유 크리에이터 조회 오류:', error);
      setError('포트폴리오를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 기간 변경 시 차트 데이터 갱신
  const loadChartData = useCallback(async () => {
    try {
      const result = await portfolioAPI.getProfitAnalysis(chartPeriod);
      if (result.data) setProfitData(result.data);
    } catch (e) {
      // 차트 데이터 실패해도 무시
    }
  }, [chartPeriod]);

  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHoldings();
    setRefreshing(false);
  };

  const renderHolding = ({ item }) => {
    const currentValue = item.stock.sharePrice * item.shares;
    const investedValue = item.averagePrice * item.shares;
    const profit = currentValue - investedValue;
    const profitRate = investedValue > 0 ? ((profit / investedValue) * 100).toFixed(2) : '0.00';
    const isProfit = profit >= 0;
    const priceChange = item.stock.priceChangePercent || 0;

    return (
      <TouchableOpacity
        style={styles.holdingCard}
        onPress={() => navigation.navigate('StockDetail', { stockId: item.stock.id })}
        activeOpacity={0.7}
        accessibilityLabel={`${item.stock.issuer?.username || '크리에이터'}, ${item.shares}주 보유`}
        accessibilityRole="button"
      >
        {/* 상단: 이름, 신뢰등급, 가격 */}
        <View style={styles.holdingHeader}>
          <View style={styles.holdingNameRow}>
            <Text style={styles.holdingName}>
              {item.stock.issuer?.displayName || item.stock.issuer?.username || '크리에이터'}
            </Text>
            {item.stock.issuer?.trustLevel && (
              <TrustBadge
                level={item.stock.issuer.trustLevel}
                size="small"
                showLabel={false}
                variant="icon"
                style={{ marginLeft: 6 }}
              />
            )}
          </View>
          <View style={styles.holdingPriceInfo}>
            <Text style={styles.currentPrice}>{item.stock.sharePrice?.toLocaleString()} PO</Text>
            <View style={styles.priceChangeRow}>
              <Ionicons
                name={priceChange >= 0 ? 'caret-up' : 'caret-down'}
                size={12}
                color={priceChange >= 0 ? theme.colors.up : theme.colors.down}
              />
              <Text style={[styles.priceChange, { color: priceChange >= 0 ? theme.colors.up : theme.colors.down }]}>
                {Math.abs(priceChange).toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>

        {/* 수익/손실 배너 */}
        <View style={[
          styles.profitBanner,
          { backgroundColor: isProfit ? theme.colors.stockUpBackground : theme.colors.stockDownBackground }
        ]}>
          <View style={styles.profitBannerLeft}>
            <Text style={styles.profitBannerLabel}>평가손익</Text>
            <Text style={[styles.profitBannerAmount, { color: isProfit ? theme.colors.up : theme.colors.down }]}>
              {isProfit ? '+' : ''}{profit.toLocaleString()} PO
            </Text>
          </View>
          <View style={[
            styles.profitRateBadge,
            { backgroundColor: isProfit ? theme.colors.up : theme.colors.down }
          ]}>
            <Text style={styles.profitRateText}>
              {isProfit ? '+' : ''}{profitRate}%
            </Text>
          </View>
        </View>

        {/* 상세 정보 */}
        <View style={styles.holdingDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>보유 수량</Text>
            <Text style={styles.detailValue}>{item.shares?.toLocaleString()}주</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>평균 매수가</Text>
            <Text style={styles.detailValue}>{item.averagePrice?.toLocaleString()} PO</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>평가 금액</Text>
            <Text style={styles.detailValue}>{currentValue.toLocaleString()} PO</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // 포트폴리오 수익률 차트
  const renderPerformanceChart = () => {
    const chartPoints = profitData?.daily || profitData?.history || [];
    if (chartPoints.length < 2) {
      return (
        <View style={styles.chartSection}>
          <Text style={styles.chartSectionTitle}>수익률 추이</Text>
          <View style={styles.chartPeriodRow}>
            {CHART_PERIODS.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[styles.periodButton, chartPeriod === p.key && styles.periodButtonActive]}
                onPress={() => setChartPeriod(p.key)}
              >
                <Text style={[styles.periodButtonText, chartPeriod === p.key && styles.periodButtonTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.chartEmptyContainer}>
            <Ionicons name="analytics-outline" size={40} color={theme.colors.gray300} />
            <Text style={styles.chartEmptyText}>수익률 데이터가 부족합니다</Text>
          </View>
        </View>
      );
    }

    const lineData = chartPoints.map((pt, i) => ({
      x: i + 1,
      y: parseFloat(pt.totalValue || pt.value || 0),
      date: pt.date,
    }));

    const values = lineData.map(d => d.y);
    const minVal = Math.min(...values) * 0.98;
    const maxVal = Math.max(...values) * 1.02;
    const isUp = values[values.length - 1] >= values[0];
    const chartColor = isUp ? theme.colors.up : theme.colors.down;

    return (
      <View style={styles.chartSection}>
        <View style={styles.chartHeaderRow}>
          <Text style={styles.chartSectionTitle}>수익률 추이</Text>
          {selectedChartPoint && (
            <Text style={styles.chartPointLabel}>
              {selectedChartPoint.date || ''} · {selectedChartPoint.y?.toLocaleString()} PO
            </Text>
          )}
        </View>
        <View style={styles.chartPeriodRow}>
          {CHART_PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodButton, chartPeriod === p.key && styles.periodButtonActive]}
              onPress={() => setChartPeriod(p.key)}
            >
              <Text style={[styles.periodButtonText, chartPeriod === p.key && styles.periodButtonTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <VictoryChart
          width={SCREEN_WIDTH - 40}
          height={200}
          padding={{ top: 20, bottom: 30, left: 55, right: 20 }}
          domain={{ y: [minVal, maxVal] }}
          containerComponent={
            <VictoryVoronoiContainer
              voronoiDimension="x"
              labels={() => ''}
              onActivated={(points) => {
                if (points.length > 0) setSelectedChartPoint(points[0]);
              }}
            />
          }
        >
          <VictoryAxis
            dependentAxis
            style={{
              axis: { stroke: theme.colors.border },
              tickLabels: { fill: theme.colors.textSecondary, fontSize: 10 },
              grid: { stroke: theme.colors.border, strokeDasharray: '4,4', strokeOpacity: 0.3 },
            }}
            tickFormat={(t) => {
              if (t >= 1000000) return `${(t / 1000000).toFixed(1)}M`;
              if (t >= 1000) return `${(t / 1000).toFixed(0)}K`;
              return t;
            }}
          />
          <VictoryAxis
            style={{
              axis: { stroke: theme.colors.border },
              tickLabels: { fill: theme.colors.textSecondary, fontSize: 10 },
            }}
            tickFormat={(t) => {
              const interval = Math.ceil(lineData.length / 4);
              if (t % interval === 0 || t === 1 || t === lineData.length) {
                const pt = lineData[t - 1];
                return pt?.date ? pt.date.slice(5) : '';
              }
              return '';
            }}
          />
          <VictoryArea
            data={lineData}
            style={{
              data: {
                fill: chartColor,
                fillOpacity: 0.1,
                stroke: chartColor,
                strokeWidth: 2,
              },
            }}
          />
        </VictoryChart>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <LoadingState message="포트폴리오 불러오는 중..." />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <ErrorState
          title="포트폴리오 로드 실패"
          description={error}
          onRetry={loadHoldings}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <>
            {/* 포트폴리오 요약 카드 */}
            <PortfolioSummaryCard summary={summary} holdings={holdings} />

            {/* 수익률 추이 차트 */}
            {renderPerformanceChart()}

            {/* 장기 보유 보너스 (수령 가능한 경우만 표시) */}
            <HoldingBonusWidget compact onBonusClaimed={loadHoldings} />

            {/* 수익 인증 공유 카드 */}
            {summary && summary.totalProfit !== 0 && (
              <View style={styles.profitShareSection}>
                <ProfitShareCard
                  totalProfit={summary.totalProfit || 0}
                  profitRate={summary.totalProfitRate || 0}
                  topHolding={summary.topPerformer}
                  totalDividend={summary.totalDividend || 0}
                  period="전체"
                  username={summary.username || '투자자'}
                />
              </View>
            )}

            {/* 보유 목록 헤더 */}
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>보유 크리에이터</Text>
              <Text style={styles.listCount}>{holdings.length}개</Text>
            </View>
          </>
        }
        ListHeaderComponentStyle={styles.listHeaderContainer}
        data={holdings}
        renderItem={renderHolding}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            emoji="📊"
            title="보유 중인 크리에이터가 없습니다"
            description="홈에서 관심있는 크리에이터를 매수해보세요"
            actionLabel="크리에이터 둘러보기"
            onAction={() => navigation.navigate('StockMarket')}
          />
        }
      />
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: t.colors.background,
  },
  listHeaderContainer: {
    backgroundColor: t.colors.background,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: t.colors.surface,
    marginTop: 8,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: t.colors.text,
  },
  listCount: {
    fontSize: 14,
    color: t.colors.textSecondary,
  },
  list: {
    padding: 20,
    gap: 12,
  },
  holdingCard: {
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  holdingNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  holdingName: {
    fontSize: 17,
    fontWeight: '700',
    color: t.colors.text,
  },
  holdingPriceInfo: {
    alignItems: 'flex-end',
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: t.colors.text,
  },
  priceChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  priceChange: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 2,
  },
  // 수익/손실 배너
  profitBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  profitBannerLeft: {},
  profitBannerLabel: {
    fontSize: 11,
    color: t.colors.textSecondary,
    marginBottom: 2,
  },
  profitBannerAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  profitRateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  profitRateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  holdingDetails: {
    gap: 10,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: t.colors.textSecondary,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: t.colors.text,
  },
  chartSection: {
    backgroundColor: t.colors.surface,
    marginTop: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: t.colors.text,
  },
  chartPointLabel: {
    fontSize: 12,
    color: t.colors.textSecondary,
  },
  chartPeriodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  periodButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: t.colors.gray100,
  },
  periodButtonActive: {
    backgroundColor: t.colors.primary,
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: t.colors.textSecondary,
  },
  periodButtonTextActive: {
    color: t.colors.surface,
  },
  chartEmptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  chartEmptyText: {
    fontSize: 14,
    color: t.colors.textSecondary,
  },
  profitShareSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: t.colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: t.colors.textSecondary,
    textAlign: 'center',
  },
});
