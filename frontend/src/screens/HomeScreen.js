import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { stockAPI } from '../services/api';

const HomeScreen = ({ navigation }) => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStocks = async () => {
    try {
      const response = await stockAPI.getAll();
      setStocks(response.data.stocks || []);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStocks();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchStocks();
      return;
    }
    try {
      setLoading(true);
      const response = await stockAPI.search(searchQuery);
      setStocks(response.data.stocks || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStockItem = ({ item }) => {
    const priceChange = item.priceChange || 0;
    const priceChangePercent = item.priceChangePercent || 0;
    const isPositive = priceChange >= 0;

    return (
      <TouchableOpacity
        style={styles.stockItem}
        onPress={() => navigation.navigate('StockDetail', { stockId: item.id, stock: item })}
      >
        <View style={styles.stockLeft}>
          <View style={styles.stockAvatar}>
            <Text style={styles.stockAvatarText}>
              {item.symbol?.charAt(0) || item.name?.charAt(0)}
            </Text>
          </View>
          <View style={styles.stockInfo}>
            <Text style={styles.stockName}>{item.name}</Text>
            <Text style={styles.stockSymbol}>{item.symbol}</Text>
          </View>
        </View>
        <View style={styles.stockRight}>
          <Text style={styles.stockPrice}>
            {item.currentPrice?.toLocaleString() || 0}원
          </Text>
          <Text style={[styles.stockChange, isPositive ? styles.positive : styles.negative]}>
            {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>HIPO</Text>
        <Text style={styles.headerSubtitle}>크리에이터 주식</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="크리에이터 검색..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={stocks}
        renderItem={renderStockItem}
        keyExtractor={(item) => item.id?.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>등록된 주식이 없습니다</Text>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  stockItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stockAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  stockInfo: {
    justifyContent: 'center',
  },
  stockName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  stockSymbol: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  stockRight: {
    alignItems: 'flex-end',
  },
  stockPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  stockChange: {
    fontSize: 14,
    marginTop: 2,
  },
  positive: {
    color: '#e74c3c',
  },
  negative: {
    color: '#3498db',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default HomeScreen;
