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
import { stockAPI, walletAPI } from '../services/api';

const PortfolioScreen = ({ navigation }) => {
  const [holdings, setHoldings] = useState([]);
  const [balance, setBalance] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [holdingsRes, walletRes] = await Promise.all([
        stockAPI.getHoldings(),
        walletAPI.getBalance(),
      ]);

      const holdingsData = holdingsRes.data.holdings || [];
      setHoldings(holdingsData);
      setBalance(walletRes.data.balance || 0);

      const total = holdingsData.reduce((sum, item) => {
        return sum + (item.currentPrice || 0) * (item.quantity || 0);
      }, 0);
      setTotalValue(total);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const renderHoldingItem = ({ item }) => {
    const currentValue = (item.currentPrice || 0) * (item.quantity || 0);
    const purchaseValue = (item.avgPrice || 0) * (item.quantity || 0);
    const profitLoss = currentValue - purchaseValue;
    const profitLossPercent = purchaseValue > 0 ? ((profitLoss / purchaseValue) * 100) : 0;
    const isPositive = profitLoss >= 0;

    return (
      <TouchableOpacity
        style={styles.holdingItem}
        onPress={() => navigation.navigate('StockDetail', { stockId: item.stockId })}
      >
        <View style={styles.holdingLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.stock?.symbol?.charAt(0) || 'S'}
            </Text>
          </View>
          <View style={styles.holdingInfo}>
            <Text style={styles.stockName}>{item.stock?.name || '주식'}</Text>
            <Text style={styles.quantity}>{item.quantity}주 보유</Text>
          </View>
        </View>
        <View style={styles.holdingRight}>
          <Text style={styles.value}>{currentValue.toLocaleString()}원</Text>
          <Text style={[styles.profitLoss, isPositive ? styles.positive : styles.negative]}>
            {isPositive ? '+' : ''}{profitLoss.toLocaleString()}원 ({isPositive ? '+' : ''}{profitLossPercent.toFixed(2)}%)
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

  const totalAssets = balance + totalValue;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>내 포트폴리오</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>총 자산</Text>
          <Text style={styles.summaryValue}>{totalAssets.toLocaleString()}원</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>예수금</Text>
            <Text style={styles.detailValue}>{balance.toLocaleString()}원</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>주식 평가</Text>
            <Text style={styles.detailValue}>{totalValue.toLocaleString()}원</Text>
          </View>
        </View>
      </View>

      <View style={styles.holdingsSection}>
        <Text style={styles.sectionTitle}>보유 주식</Text>
        <FlatList
          data={holdings}
          renderItem={renderHoldingItem}
          keyExtractor={(item) => item.id?.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>보유 중인 주식이 없습니다</Text>
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => navigation.navigate('Home')}
              >
                <Text style={styles.exploreButtonText}>주식 둘러보기</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>
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
  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 16,
  },
  summaryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  holdingsSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  holdingItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  holdingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  holdingInfo: {
    justifyContent: 'center',
  },
  stockName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  quantity: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  profitLoss: {
    fontSize: 13,
    marginTop: 2,
  },
  positive: {
    color: '#e74c3c',
  },
  negative: {
    color: '#3498db',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  exploreButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PortfolioScreen;
