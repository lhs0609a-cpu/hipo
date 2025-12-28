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
import { getTransactions } from '../api/stocks';
import { COLORS } from '../constants/colors';

export default function TransactionHistoryScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all', 'buy', 'sell'

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await getTransactions();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('거래 내역 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFilteredTransactions = () => {
    if (filterType === 'all') return transactions;
    return transactions.filter(t => t.transactionType === filterType.toUpperCase());
  };

  const renderTransaction = ({ item }) => {
    const isBuy = item.transactionType === 'BUY';
    const typeColor = isBuy ? COLORS.up : COLORS.down;
    const typeText = isBuy ? '매수' : '매도';
    const totalAmount = item.shares * item.pricePerShare;

    return (
      <TouchableOpacity
        style={styles.transactionCard}
        onPress={() => navigation.navigate('StockDetail', { stockId: item.stock?.id })}
        activeOpacity={0.7}
      >
        <View style={styles.transactionHeader}>
          <View style={styles.transactionLeft}>
            <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
              <Text style={styles.typeBadgeText}>{typeText}</Text>
            </View>
            <View style={styles.stockInfo}>
              <Text style={styles.stockName}>{item.stock?.issuer?.username || '알 수 없음'}</Text>
              <Text style={styles.transactionDate}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.transactionDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>거래 수량</Text>
            <Text style={styles.detailValue}>{item.shares.toLocaleString()}주</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>거래 단가</Text>
            <Text style={styles.detailValue}>{item.pricePerShare.toLocaleString()} PO</Text>
          </View>
          <View style={[styles.detailRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>총 거래금액</Text>
            <Text style={[styles.totalValue, { color: typeColor }]}>
              {isBuy ? '-' : '+'}{totalAmount.toLocaleString()} PO
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterTabs = () => {
    const tabs = [
      { key: 'all', label: '전체' },
      { key: 'buy', label: '매수' },
      { key: 'sell', label: '매도' },
    ];

    return (
      <View style={styles.filterTabs}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.filterTab,
              filterType === tab.key && styles.filterTabActive,
            ]}
            onPress={() => setFilterType(tab.key)}
          >
            <Text
              style={[
                styles.filterTabText,
                filterType === tab.key && styles.filterTabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
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

  const filteredTransactions = getFilteredTransactions();

  return (
    <View style={styles.container}>
      {/* 필터 탭 */}
      {renderFilterTabs()}

      {/* 거래 내역 리스트 */}
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>거래 내역이 없습니다</Text>
            <Text style={styles.emptySubtext}>
              {filterType === 'all'
                ? '주식을 거래하면 내역이 표시됩니다'
                : `${filterType === 'buy' ? '매수' : '매도'} 내역이 없습니다`}
            </Text>
          </View>
        }
        contentContainerStyle={filteredTransactions.length === 0 ? styles.emptyListContent : styles.listContent}
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
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyListContent: {
    flex: 1,
  },
  transactionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
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
  transactionDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  transactionDetails: {
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
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
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
  },
});
