import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { getTransactions } from '../api/stocks';
import { COLORS } from '../constants/colors';

export default function TransactionsScreen() {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await getTransactions();
      setTransactions(data.transactions);
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

  const renderTransaction = ({ item }) => {
    const isBuy = item.transactionType === 'buy';
    const date = new Date(item.createdAt);
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View>
            <Text style={styles.stockName}>{item.stock?.issuer?.username || '알 수 없음'}</Text>
            <Text style={styles.date}>{formattedDate}</Text>
          </View>
          <View style={[
            styles.typeBadge,
            { backgroundColor: isBuy ? theme.colors.danger : theme.colors.success }
          ]}>
            <Text style={styles.typeText}>{isBuy ? '매수' : '매도'}</Text>
          </View>
        </View>

        <View style={styles.transactionDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.label}>수량</Text>
            <Text style={styles.value}>{item.shares.toLocaleString()}주</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>주당 가격</Text>
            <Text style={styles.value}>{item.pricePerShare.toLocaleString()} PO</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>총액</Text>
            <Text style={[
              styles.value,
              styles.totalAmount,
              { color: isBuy ? theme.colors.danger : theme.colors.success }
            ]}>
              {isBuy ? '-' : '+'}{item.totalAmount.toLocaleString()} PO
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>거래 내역이 없습니다</Text>
          </View>
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
  list: {
    padding: 15,
  },
  transactionCard: {
    backgroundColor: t.colors.surface,
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: t.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  stockName: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.text,
  },
  date: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    marginTop: 4,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  typeText: {
    color: t.colors.surface,
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  transactionDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  value: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.text,
  },
  totalAmount: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
});
