import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { stockAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const TransactionHistoryScreen = ({ navigation }) => {
  const { isAuthenticated } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchTransactions = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await stockAPI.getTransactions();
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      let errorMessage = '거래 내역을 불러올 수 없습니다';
      if (error.response) {
        errorMessage = error.response.data?.message || `서버 오류 (${error.response.status})`;
      } else if (error.request) {
        errorMessage = '서버에 연결할 수 없습니다.\n인터넷 연결을 확인해주세요.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [isAuthenticated]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions();
  }, []);

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    return t.type === filter;
  });

  const renderTransactionItem = ({ item }) => {
    const isBuy = item.type === 'buy';
    const stockName = item.stock?.issuer?.displayName || item.stock?.issuer?.username || item.stockName || '주식';
    const totalAmount = (item.price || 0) * (item.quantity || 0);

    return (
      <TouchableOpacity
        style={styles.transactionItem}
        onPress={() => item.stockId && navigation.navigate('StockDetail', { stockId: item.stockId })}
      >
        <View style={[styles.typeBadge, isBuy ? styles.buyBadge : styles.sellBadge]}>
          <Text style={styles.typeBadgeText}>{isBuy ? '매수' : '매도'}</Text>
        </View>

        <View style={styles.transactionInfo}>
          <Text style={styles.stockName}>{stockName}</Text>
          <Text style={styles.transactionDetail}>
            {item.quantity}주 × {(item.price || 0).toLocaleString()}원
          </Text>
          <Text style={styles.transactionDate}>
            {new Date(item.createdAt || item.created_at).toLocaleString('ko-KR')}
          </Text>
        </View>

        <View style={styles.amountContainer}>
          <Text style={[styles.totalAmount, isBuy ? styles.buyAmount : styles.sellAmount]}>
            {isBuy ? '-' : '+'}{totalAmount.toLocaleString()}원
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>거래 내역</Text>
        </View>
        <View style={styles.loginRequiredContainer}>
          <Text style={styles.loginRequiredIcon}>📊</Text>
          <Text style={styles.loginRequiredTitle}>로그인이 필요합니다</Text>
          <Text style={styles.loginRequiredText}>
            거래 내역을 확인하려면{'\n'}로그인해주세요.
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>로그인하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>거래 내역</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchTransactions}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>거래 내역</Text>
        <Text style={styles.headerSubtitle}>총 {transactions.length}건의 거래</Text>
      </View>

      <View style={styles.filterContainer}>
        {[
          { key: 'all', label: '전체' },
          { key: 'buy', label: '매수' },
          { key: 'sell', label: '매도' },
        ].map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterButton, filter === f.key && styles.filterButtonActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item.id?.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>거래 내역이 없습니다</Text>
            <Text style={styles.emptySubtext}>주식을 매수하면 여기에 표시됩니다</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  transactionItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginRight: 12,
  },
  buyBadge: {
    backgroundColor: '#ffebee',
  },
  sellBadge: {
    backgroundColor: '#e3f2fd',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  transactionInfo: {
    flex: 1,
  },
  stockName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  transactionDetail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  buyAmount: {
    color: '#e74c3c',
  },
  sellAmount: {
    color: '#3498db',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  loginRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loginRequiredIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  loginRequiredTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  loginRequiredText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TransactionHistoryScreen;
