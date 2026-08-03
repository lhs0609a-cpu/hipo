import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { portfolioAPI } from '../services/api';

/**
 * 주간/월간 포트폴리오 리포트 위젯
 */
const PortfolioReportWidget = ({ period = 'weekly', onViewFull, compact = false }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [period]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await portfolioAPI.getReport();
      setReport(response.data);
    } catch (err) {
      console.error('Portfolio report fetch error:', err);
      setError('리포트를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  const periodLabel = period === 'weekly' ? '주간 리포트' : '월간 리포트';

  const isPositive = report?.totalReturn >= 0;

  const formatNumber = (num) => {
    if (num == null) return '0';
    return Math.abs(num).toLocaleString();
  };

  const formatPercent = (num) => {
    if (num == null) return '0.00';
    return Math.abs(num).toFixed(2);
  };

  const gradientColors = isPositive
    ? ['#2B5FE3', '#5E93F7']
    : ['#F0344B', '#F0344B'];

  // 로딩 상태
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>{periodLabel} 로딩 중...</Text>
        </View>
      </View>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={24} color={COLORS.textTertiary} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchReport}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 데이터 없음
  if (!report) {
    return null;
  }

  // 콤팩트 모드: 수익률과 최고 성과 종목만 표시
  if (compact) {
    return (
      <TouchableOpacity
        style={styles.container}
        onPress={onViewFull}
        activeOpacity={onViewFull ? 0.8 : 1}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.compactGradient}
        >
          <View style={styles.compactLeft}>
            <View style={styles.compactIconCircle}>
              <Ionicons name="analytics" size={22} color="#fff" />
            </View>
            <View style={styles.compactInfo}>
              <Text style={styles.compactLabel}>{periodLabel}</Text>
              <Text style={styles.compactReturn}>
                {isPositive ? '+' : '-'}{formatPercent(report.totalReturnRate)}%
              </Text>
            </View>
          </View>
          {report.topPerformer && (
            <View style={styles.compactRight}>
              <Text style={styles.compactTopLabel}>TOP</Text>
              <Text style={styles.compactTopName} numberOfLines={1}>
                {report.topPerformer.name}
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // 전체 모드
  return (
    <View style={styles.container}>
      {/* 그라디언트 헤더 */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Ionicons name="analytics" size={20} color="#fff" />
            <Text style={styles.headerTitle}>{periodLabel}</Text>
          </View>
          {report.percentileRank != null && (
            <View style={styles.rankBadge}>
              <Ionicons name="trophy" size={12} color="#D9A521" />
              <Text style={styles.rankBadgeText}>
                상위 {report.percentileRank}% 투자자
              </Text>
            </View>
          )}
        </View>

        <View style={styles.returnSection}>
          <Text style={styles.returnAmount}>
            {isPositive ? '+' : '-'}{formatNumber(report.totalReturn)} PO
          </Text>
          <View style={[
            styles.returnRateBadge,
            { backgroundColor: 'rgba(255,255,255,0.2)' },
          ]}>
            <Ionicons
              name={isPositive ? 'trending-up' : 'trending-down'}
              size={14}
              color="#fff"
            />
            <Text style={styles.returnRateText}>
              {isPositive ? '+' : '-'}{formatPercent(report.totalReturnRate)}%
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* 메트릭스 영역 */}
      <View style={styles.metricsSection}>
        {/* 최고 / 최저 성과 종목 */}
        <View style={styles.performerRow}>
          {/* 최고 성과 */}
          {report.topPerformer && (
            <View style={styles.performerItem}>
              <View style={styles.performerIconContainer}>
                <View style={[styles.performerIcon, { backgroundColor: '#E7F8F0' }]}>
                  <Ionicons name="arrow-up-circle" size={18} color={COLORS.success} />
                </View>
              </View>
              <View style={styles.performerInfo}>
                <Text style={styles.performerLabel}>최고 성과</Text>
                <Text style={styles.performerName} numberOfLines={1}>
                  {report.topPerformer.name}
                </Text>
                <Text style={[styles.performerProfit, { color: COLORS.success }]}>
                  +{formatPercent(report.topPerformer.profitRate)}%
                </Text>
              </View>
            </View>
          )}

          <View style={styles.performerDivider} />

          {/* 최저 성과 */}
          {report.worstPerformer && (
            <View style={styles.performerItem}>
              <View style={styles.performerIconContainer}>
                <View style={[styles.performerIcon, { backgroundColor: COLORS.errorBackground }]}>
                  <Ionicons name="arrow-down-circle" size={18} color={COLORS.danger} />
                </View>
              </View>
              <View style={styles.performerInfo}>
                <Text style={styles.performerLabel}>최저 성과</Text>
                <Text style={styles.performerName} numberOfLines={1}>
                  {report.worstPerformer.name}
                </Text>
                <Text style={[styles.performerProfit, { color: COLORS.danger }]}>
                  -{formatPercent(report.worstPerformer.lossRate)}%
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* 배당금 / 거래 횟수 */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#FFF6E6' }]}>
              <Ionicons name="cash-outline" size={18} color={COLORS.warning} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>받은 배당금</Text>
              <Text style={styles.statValue}>
                {formatNumber(report.totalDividends)} PO
              </Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primaryBackground }]}>
              <Ionicons name="swap-horizontal-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>거래 횟수</Text>
              <Text style={styles.statValue}>
                {report.totalTrades != null ? report.totalTrades : 0}회
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 자세히 보기 버튼 */}
      {onViewFull && (
        <TouchableOpacity style={styles.viewFullButton} onPress={onViewFull}>
          <Text style={styles.viewFullButtonText}>자세히 보기</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },

  // 로딩 상태
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  // 에러 상태
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textTertiary,
  },
  retryButton: {
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // 그라디언트 헤더
  gradientHeader: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },

  // 수익 섹션
  returnSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  returnAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  returnRateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  returnRateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  // 메트릭스 영역
  metricsSection: {
    padding: 20,
    paddingTop: 16,
  },

  // 성과 종목 행
  performerRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  performerItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  performerIconContainer: {},
  performerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  performerInfo: {
    flex: 1,
  },
  performerLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginBottom: 2,
  },
  performerName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 1,
  },
  performerProfit: {
    fontSize: 13,
    fontWeight: '700',
  },
  performerDivider: {
    width: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: 12,
  },

  // 통계 행
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    padding: 14,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {},
  statLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.gray200,
    marginHorizontal: 8,
  },

  // 자세히 보기 버튼
  viewFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    gap: 4,
  },
  viewFullButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // 콤팩트 모드
  compactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactInfo: {},
  compactLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  compactReturn: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  compactRight: {
    alignItems: 'flex-end',
  },
  compactTopLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  compactTopName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    maxWidth: 100,
  },
});

export default PortfolioReportWidget;
