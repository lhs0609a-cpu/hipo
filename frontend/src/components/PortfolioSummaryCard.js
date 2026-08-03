import React from 'react';
import { getAppWidth, getAppHeight } from '../utils/appWidth';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';

const SCREEN_WIDTH = getAppWidth();

/**
 * 포트폴리오 요약 카드 컴포넌트
 */
const PortfolioSummaryCard = ({ summary, holdings = [] }) => {
  if (!summary) return null;

  const isProfit = summary.profitAmount >= 0;

  // 포트폴리오 비중 계산
  const totalValue = summary.totalValue || 0;
  const portfolioAllocation = holdings.map((holding) => {
    const value = holding.stock.sharePrice * holding.shares;
    const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
    return {
      name: holding.stock.issuer?.displayName || holding.stock.issuer?.username || '크리에이터',
      value,
      percentage,
      color: getRandomColor(holding.stock.id),
    };
  }).sort((a, b) => b.percentage - a.percentage);

  // 상위 5개만 표시, 나머지는 '기타'로 합산
  const topHoldings = portfolioAllocation.slice(0, 5);
  const othersPercentage = portfolioAllocation.slice(5).reduce((acc, h) => acc + h.percentage, 0);

  return (
    <View style={styles.container}>
      {/* 메인 수익/손실 카드 */}
      <LinearGradient
        colors={isProfit ? ['#F0344B', '#FF6B7C'] : ['#2B5FE3', '#5E93F7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.mainCard}
      >
        <View style={styles.mainCardHeader}>
          <Text style={styles.mainCardLabel}>총 평가 금액</Text>
          <View style={[styles.profitBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons
              name={isProfit ? 'trending-up' : 'trending-down'}
              size={14}
              color="#fff"
            />
            <Text style={styles.profitBadgeText}>
              {isProfit ? '+' : ''}{summary.profitRate?.toFixed(2)}%
            </Text>
          </View>
        </View>

        <Text style={styles.totalAmount}>{summary.totalValue?.toLocaleString()}</Text>
        <Text style={styles.currency}>PO</Text>

        <View style={styles.profitRow}>
          <View style={styles.profitItem}>
            <Text style={styles.profitItemLabel}>투자 원금</Text>
            <Text style={styles.profitItemValue}>{summary.totalInvested?.toLocaleString()} PO</Text>
          </View>
          <View style={styles.profitDivider} />
          <View style={styles.profitItem}>
            <Text style={styles.profitItemLabel}>평가 손익</Text>
            <Text style={styles.profitItemValue}>
              {isProfit ? '+' : ''}{summary.profitAmount?.toLocaleString()} PO
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* 포트폴리오 비중 */}
      {holdings.length > 0 && (
        <View style={styles.allocationSection}>
          <Text style={styles.sectionTitle}>포트폴리오 비중</Text>

          {/* 시각적 바 차트 */}
          <View style={styles.allocationBar}>
            {topHoldings.map((holding, index) => (
              <View
                key={index}
                style={[
                  styles.allocationBarSegment,
                  {
                    width: `${holding.percentage}%`,
                    backgroundColor: holding.color,
                  },
                ]}
              />
            ))}
            {othersPercentage > 0 && (
              <View
                style={[
                  styles.allocationBarSegment,
                  {
                    width: `${othersPercentage}%`,
                    backgroundColor: '#DFE3EB',
                  },
                ]}
              />
            )}
          </View>

          {/* 범례 */}
          <View style={styles.allocationLegend}>
            {topHoldings.map((holding, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: holding.color }]} />
                <Text style={styles.legendName} numberOfLines={1}>{holding.name}</Text>
                <Text style={styles.legendPercentage}>{holding.percentage.toFixed(1)}%</Text>
              </View>
            ))}
            {othersPercentage > 0 && (
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#DFE3EB' }]} />
                <Text style={styles.legendName}>기타</Text>
                <Text style={styles.legendPercentage}>{othersPercentage.toFixed(1)}%</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* 투자 요약 통계 */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#FFF6E6' }]}>
            <Ionicons name="briefcase-outline" size={20} color="#F59B00" />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statValue}>{holdings.length}</Text>
            <Text style={styles.statLabel}>보유 종목</Text>
          </View>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#E7F8F0' }]}>
            <Ionicons name="arrow-up-circle-outline" size={20} color="#00B368" />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statValue}>
              {holdings.filter(h => {
                const profit = h.stock.sharePrice * h.shares - h.averagePrice * h.shares;
                return profit > 0;
              }).length}
            </Text>
            <Text style={styles.statLabel}>수익 종목</Text>
          </View>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#FFF1F2' }]}>
            <Ionicons name="arrow-down-circle-outline" size={20} color="#F0344B" />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statValue}>
              {holdings.filter(h => {
                const profit = h.stock.sharePrice * h.shares - h.averagePrice * h.shares;
                return profit < 0;
              }).length}
            </Text>
            <Text style={styles.statLabel}>손실 종목</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// 일관된 색상 생성 (ID 기반)
function getRandomColor(id) {
  const colors = [
    '#F0344B', '#00B0A6', '#3FB6C9', '#6BC9A8', '#FCD9A0',
    '#C4B5FD', '#6BC9A8', '#FBBF4C', '#A78BFA', '#91B8FB',
    '#F59B00', '#00B0A6', '#FF8A4C', '#A78BFA', '#00B0A6',
  ];
  const index = typeof id === 'string'
    ? id.charCodeAt(0) % colors.length
    : (id || 0) % colors.length;
  return colors[index];
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    paddingBottom: 8,
  },
  mainCard: {
    margin: 16,
    borderRadius: 20,
    padding: 24,
  },
  mainCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mainCardLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  profitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  profitBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  totalAmount: {
    fontSize: 42,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  currency: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
  },
  profitRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
  },
  profitItem: {
    flex: 1,
    alignItems: 'center',
  },
  profitDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 16,
  },
  profitItemLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  profitItemValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // 포트폴리오 비중
  allocationSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  allocationBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: COLORS.gray100,
  },
  allocationBarSegment: {
    height: '100%',
  },
  allocationLegend: {
    marginTop: 12,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendName: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  legendPercentage: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  // 통계 행
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {},
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});

export default PortfolioSummaryCard;
