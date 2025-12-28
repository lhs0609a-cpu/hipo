import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { getMyHoldings } from '../api/stocks';
import { COLORS } from '../constants/colors';

export default function MyInvestmentsScreen({ navigation }) {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHoldings();
  }, []);

  const loadHoldings = async () => {
    try {
      const data = await getMyHoldings();
      setHoldings(data.holdings || []);
    } catch (error) {
      console.error('보유 주식 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHoldings();
    setRefreshing(false);
  };

  const renderHolding = ({ item }) => {
    const stock = item.stock;
    const currentValue = item.shares * stock.sharePrice;
    const totalCost = item.averagePrice * item.shares;
    const profitLoss = currentValue - totalCost;
    const profitLossPercent = totalCost > 0 ? ((profitLoss / totalCost) * 100).toFixed(2) : 0;
    const isProfit = profitLoss >= 0;

    return (
      <TouchableOpacity
        style={styles.holdingCard}
        onPress={() => navigation.navigate('StockDetail', { stockId: stock.id })}
        activeOpacity={0.7}
      >
        <View style={styles.holdingHeader}>
          <View style={styles.holdingLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {stock.issuer?.username?.charAt(0)?.toUpperCase()}
              </Text>
            </View>
            <View style={styles.stockInfo}>
              <Text style={styles.stockName}>{stock.issuer?.username || '알 수 없음'}</Text>
              <Text style={styles.stockMeta}>
                {item.shares.toLocaleString()}주 보유
              </Text>
            </View>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>

        <View style={styles.holdingDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>평균 매수가</Text>
            <Text style={styles.detailValue}>{item.averagePrice.toLocaleString()} PO</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>현재가</Text>
            <Text style={styles.detailValue}>{stock.sharePrice.toLocaleString()} PO</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>평가 금액</Text>
            <Text style={styles.detailValue}>{currentValue.toLocaleString()} PO</Text>
          </View>
          <View style={[styles.detailRow, styles.profitRow]}>
            <Text style={styles.profitLabel}>손익</Text>
            <View style={styles.profitContainer}>
              <Text style={[styles.profitValue, { color: isProfit ? COLORS.up : COLORS.down }]}>
                {isProfit ? '+' : ''}{profitLoss.toLocaleString()} PO
              </Text>
              <Text style={[styles.profitPercent, { color: isProfit ? COLORS.up : COLORS.down }]}>
                ({isProfit ? '+' : ''}{profitLossPercent}%)
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSummary = () => {
    if (holdings.length === 0) return null;

    const totalValue = holdings.reduce((sum, h) => sum + (h.shares * h.stock.sharePrice), 0);
    const totalCost = holdings.reduce((sum, h) => sum + (h.averagePrice * h.shares), 0);
    const totalProfitLoss = totalValue - totalCost;
    const totalProfitLossPercent = totalCost > 0 ? ((totalProfitLoss / totalCost) * 100).toFixed(2) : 0;
    const isProfit = totalProfitLoss >= 0;

    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>투자 요약</Text>
        <View style={styles.summaryContent}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>총 평가액</Text>
            <Text style={styles.summaryValue}>{totalValue.toLocaleString()} PO</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>총 투자금</Text>
            <Text style={styles.summaryValue}>{totalCost.toLocaleString()} PO</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryProfitLabel}>총 손익</Text>
            <View style={styles.profitContainer}>
              <Text style={[styles.summaryProfitValue, { color: isProfit ? COLORS.up : COLORS.down }]}>
                {isProfit ? '+' : ''}{totalProfitLoss.toLocaleString()} PO
              </Text>
              <Text style={[styles.summaryProfitPercent, { color: isProfit ? COLORS.up : COLORS.down }]}>
                ({isProfit ? '+' : ''}{totalProfitLossPercent}%)
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={holdings}
        renderItem={renderHolding}
        keyExtractor={(item) => item.stock.id}
        ListHeaderComponent={renderSummary}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>보유 중인 주식이 없습니다</Text>
            <Text style={styles.emptySubtext}>
              홈 화면에서 마음에 드는 주식을 구매해보세요
            </Text>
          </View>
        }
        contentContainerStyle={holdings.length === 0 ? styles.emptyListContent : styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyListContent: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    opacity: 0.9,
  },
  summaryContent: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#FFFFFF',
    opacity: 0.2,
    marginVertical: 8,
  },
  summaryProfitLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryProfitValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  summaryProfitPercent: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  holdingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  holdingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  stockInfo: {
    gap: 4,
  },
  stockName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  stockMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  chevron: {
    fontSize: 24,
    color: COLORS.textTertiary,
    marginLeft: 8,
  },
  holdingDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  profitRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  profitLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  profitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profitValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  profitPercent: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
