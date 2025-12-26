import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { stockAPI } from '../services/api';

const StockDetailScreen = ({ route, navigation }) => {
  const { stockId, stock: initialStock } = route.params;
  const [stock, setStock] = useState(initialStock || null);
  const [loading, setLoading] = useState(!initialStock);
  const [quantity, setQuantity] = useState('1');
  const [activeTab, setActiveTab] = useState('buy');
  const [trading, setTrading] = useState(false);

  useEffect(() => {
    if (!initialStock) {
      fetchStockDetails();
    }
  }, [stockId]);

  const fetchStockDetails = async () => {
    try {
      const response = await stockAPI.getById(stockId);
      setStock(response.data.stock);
    } catch (error) {
      console.error('Error fetching stock:', error);
      Alert.alert('오류', '주식 정보를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleTrade = async () => {
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      Alert.alert('오류', '올바른 수량을 입력해주세요');
      return;
    }

    setTrading(true);
    try {
      if (activeTab === 'buy') {
        await stockAPI.buy(stockId, qty);
        Alert.alert('성공', `${stock.name} ${qty}주를 매수했습니다`);
      } else {
        await stockAPI.sell(stockId, qty);
        Alert.alert('성공', `${stock.name} ${qty}주를 매도했습니다`);
      }
      setQuantity('1');
    } catch (error) {
      Alert.alert('실패', error.response?.data?.message || '거래에 실패했습니다');
    } finally {
      setTrading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!stock) {
    return (
      <View style={styles.errorContainer}>
        <Text>주식 정보를 찾을 수 없습니다</Text>
      </View>
    );
  }

  const totalAmount = (stock.currentPrice || 0) * parseInt(quantity || 0);
  const priceChange = stock.priceChange || 0;
  const priceChangePercent = stock.priceChangePercent || 0;
  const isPositive = priceChange >= 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {stock.symbol?.charAt(0) || stock.name?.charAt(0)}
          </Text>
        </View>
        <Text style={styles.stockName}>{stock.name}</Text>
        <Text style={styles.stockSymbol}>{stock.symbol}</Text>
      </View>

      <View style={styles.priceSection}>
        <Text style={styles.currentPrice}>
          {stock.currentPrice?.toLocaleString() || 0}원
        </Text>
        <Text style={[styles.priceChange, isPositive ? styles.positive : styles.negative]}>
          {isPositive ? '▲' : '▼'} {Math.abs(priceChange).toLocaleString()}원 ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
        </Text>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>시가총액</Text>
          <Text style={styles.infoValue}>{(stock.marketCap || 0).toLocaleString()}원</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>거래량</Text>
          <Text style={styles.infoValue}>{(stock.volume || 0).toLocaleString()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>최고가</Text>
          <Text style={styles.infoValue}>{(stock.highPrice || 0).toLocaleString()}원</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>최저가</Text>
          <Text style={styles.infoValue}>{(stock.lowPrice || 0).toLocaleString()}원</Text>
        </View>
      </View>

      <View style={styles.tradeSection}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'buy' && styles.activeTabBuy]}
            onPress={() => setActiveTab('buy')}
          >
            <Text style={[styles.tabText, activeTab === 'buy' && styles.activeTabTextBuy]}>
              매수
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'sell' && styles.activeTabSell]}
            onPress={() => setActiveTab('sell')}
          >
            <Text style={[styles.tabText, activeTab === 'sell' && styles.activeTabTextSell]}>
              매도
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quantityContainer}>
          <Text style={styles.quantityLabel}>수량</Text>
          <View style={styles.quantityInputContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(String(Math.max(1, parseInt(quantity || 1) - 1)))}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.quantityInput}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              textAlign="center"
            />
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(String(parseInt(quantity || 0) + 1))}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>총 금액</Text>
          <Text style={styles.totalAmount}>{totalAmount.toLocaleString()}원</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.tradeButton,
            activeTab === 'buy' ? styles.buyButton : styles.sellButton,
            trading && styles.buttonDisabled
          ]}
          onPress={handleTrade}
          disabled={trading}
        >
          {trading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.tradeButtonText}>
              {activeTab === 'buy' ? '매수하기' : '매도하기'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  stockName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  stockSymbol: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  priceSection: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
  },
  currentPrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
  },
  priceChange: {
    fontSize: 18,
    marginTop: 8,
  },
  positive: {
    color: '#e74c3c',
  },
  negative: {
    color: '#3498db',
  },
  infoSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 15,
    color: '#666',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  tradeSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 8,
    marginBottom: 30,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTabBuy: {
    backgroundColor: '#e74c3c',
  },
  activeTabSell: {
    backgroundColor: '#3498db',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTabTextBuy: {
    color: '#fff',
  },
  activeTabTextSell: {
    color: '#fff',
  },
  quantityContainer: {
    marginTop: 24,
  },
  quantityLabel: {
    fontSize: 15,
    color: '#666',
    marginBottom: 12,
  },
  quantityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 24,
    color: '#333',
  },
  quantityInput: {
    width: 100,
    fontSize: 24,
    fontWeight: '600',
    marginHorizontal: 20,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  tradeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  buyButton: {
    backgroundColor: '#e74c3c',
  },
  sellButton: {
    backgroundColor: '#3498db',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  tradeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default StockDetailScreen;
