import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { getMyHoldings } from '../api/stocks';
import { COLORS } from '../constants/colors';

export default function PortfolioScreen({ navigation }) {
  const [holdings, setHoldings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHoldings();
  }, []);

  const loadHoldings = async () => {
    try {
      const data = await getMyHoldings();
      setHoldings(data.holdings);
      setSummary(data.summary);
    } catch (error) {
      console.error('보유 크리에이터 조회 오류:', error);
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
    const currentValue = item.stock.sharePrice * item.shares;
    const investedValue = item.averagePrice * item.shares;
    const profit = currentValue - investedValue;
    const profitRate = ((profit / investedValue) * 100).toFixed(2);
    const isProfit = profit >= 0;

    return (
      <TouchableOpacity
        style={styles.holdingCard}
        onPress={() => navigation.navigate('StockDetail', { stockId: item.stock.id })}
        activeOpacity={0.7}
      >
        <View style={styles.holdingHeader}>
          <Text style={styles.holdingName}>{item.stock.issuer.username}</Text>
          <View style={styles.holdingPriceInfo}>
            <Text style={styles.currentPrice}>{item.stock.sharePrice.toLocaleString()} PO</Text>
            <Text style={[styles.profitRate, { color: isProfit ? COLORS.up : COLORS.down }]}>
              {isProfit ? '+' : ''}{profitRate}%
            </Text>
          </View>
        </View>

        <View style={styles.holdingDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>보유 수량</Text>
            <Text style={styles.detailValue}>{item.shares.toLocaleString()}주</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>평가 금액</Text>
            <Text style={styles.detailValue}>{currentValue.toLocaleString()} PO</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>평가 손익</Text>
            <Text style={[styles.detailValue, { color: isProfit ? COLORS.up : COLORS.down }]}>
              {isProfit ? '+' : ''}{profit.toLocaleString()} PO
            </Text>
          </View>
        </View>
      </TouchableOpacity>
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
      {summary && (
        <View style={styles.summarySection}>
          <View style={styles.totalValue}>
            <Text style={styles.summaryLabel}>총 평가 금액</Text>
            <Text style={styles.summaryAmount}>{summary.totalValue.toLocaleString()}</Text>
            <Text style={styles.currency}>PO</Text>
          </View>

          <View style={styles.summaryDetails}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>총 투자 금액</Text>
              <Text style={styles.summaryItemValue}>{summary.totalInvested.toLocaleString()} PO</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>총 평가 손익</Text>
              <Text style={[
                styles.summaryItemValue,
                { color: summary.profitAmount >= 0 ? COLORS.up : COLORS.down }
              ]}>
                {summary.profitAmount >= 0 ? '+' : ''}{summary.profitAmount.toLocaleString()} PO
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>수익률</Text>
              <Text style={[
                styles.summaryItemValue,
                { color: summary.profitRate >= 0 ? COLORS.up : COLORS.down }
              ]}>
                {summary.profitRate >= 0 ? '+' : ''}{summary.profitRate}%
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>보유 크리에이터</Text>
        <Text style={styles.listCount}>{holdings.length}개</Text>
      </View>

      <FlatList
        data={holdings}
        renderItem={renderHolding}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>보유 중인 크리에이터가 없습니다</Text>
            <Text style={styles.emptySubtext}>홈에서 관심있는 크리에이터를 매수해보세요</Text>
          </View>
        }
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
  summarySection: {
    backgroundColor: COLORS.surface,
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  totalValue: {
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: COLORS.text,
  },
  currency: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  summaryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryItemLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  summaryItemValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.divider,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  listCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  list: {
    padding: 20,
    gap: 12,
  },
  holdingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  holdingName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  holdingPriceInfo: {
    alignItems: 'flex-end',
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  profitRate: {
    fontSize: 14,
    fontWeight: '600',
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
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
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
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
