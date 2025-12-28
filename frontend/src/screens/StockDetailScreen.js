import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { getStockDetail, buyStock, sellStock } from '../api/stocks';
import { getSavedUser } from '../api/auth';
import { COLORS } from '../constants/colors';
import StockChart from '../components/StockChart';

const screenWidth = Dimensions.get('window').width;

export default function StockDetailScreen({ route, navigation }) {
  const { stockId } = route.params;
  const [stock, setStock] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tradeType, setTradeType] = useState('buy'); // 'buy' or 'sell'
  const [shares, setShares] = useState('');
  const [isTrading, setIsTrading] = useState(false);
  const [recentTrades, setRecentTrades] = useState([]);

  useEffect(() => {
    loadData();
  }, [stockId]);

  const loadData = async () => {
    try {
      const [stockData, userData] = await Promise.all([
        getStockDetail(stockId),
        getSavedUser(),
      ]);
      setStock(stockData.stock);
      setUser(userData);
      setRecentTrades(stockData.recentTrades || []);
    } catch (error) {
      console.error('주식 상세 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleTrade = async () => {
    if (!shares || parseInt(shares) <= 0) {
      const message = '수량을 입력해주세요';
      Platform.OS === 'web' ? alert(message) : Alert.alert('알림', message);
      return;
    }

    setIsTrading(true);
    try {
      const tradeShares = parseInt(shares);

      if (tradeType === 'buy') {
        const result = await buyStock(stockId, tradeShares);
        const message = `매수 완료!\n${tradeShares}주를 ${(result.transaction.totalCost).toLocaleString()} PO에 매수했습니다.`;
        Platform.OS === 'web' ? alert(message) : Alert.alert('매수 완료', message);
      } else {
        const result = await sellStock(stockId, tradeShares);
        const message = `매도 완료!\n${tradeShares}주를 ${(result.transaction.totalRevenue).toLocaleString()} PO에 매도했습니다.`;
        Platform.OS === 'web' ? alert(message) : Alert.alert('매도 완료', message);
      }

      setShares('');
      loadData(); // 데이터 새로고침
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || '거래 중 오류가 발생했습니다';
      Platform.OS === 'web' ? alert(errorMsg) : Alert.alert('오류', errorMsg);
    } finally {
      setIsTrading(false);
    }
  };

  const calculateTotalAmount = () => {
    if (!stock || !shares) return 0;
    return stock.sharePrice * parseInt(shares || 0);
  };


  if (loading || !stock) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const priceChange = stock.priceChangePercent || 0;
  const isUp = priceChange >= 0;
  const changeColor = isUp ? COLORS.up : COLORS.down;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 가격 정보 */}
        <View style={styles.priceSection}>
          <Text style={styles.stockName}>{stock.issuer.username}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice}>{stock.sharePrice.toLocaleString()}</Text>
            <Text style={styles.currency}>PO</Text>
          </View>
          <View style={styles.changeContainer}>
            <Text style={[styles.changeText, { color: changeColor }]}>
              {isUp ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
            </Text>
          </View>
        </View>

        {/* 차트 */}
        <View style={styles.chartSection}>
          <StockChart stockId={stockId} />
        </View>

        {/* 주식 정보 */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>시가총액</Text>
            <Text style={styles.infoValue}>{(stock.marketCapTotal || 0).toLocaleString()} PO</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>발행 주식</Text>
            <Text style={styles.infoValue}>{stock.issuedShares.toLocaleString()} / {stock.totalShares.toLocaleString()}주</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>배당률</Text>
            <Text style={styles.infoValue}>{stock.dividendRate}%</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>보유자</Text>
            <Text style={styles.infoValue}>{stock.holderCount || 0}명</Text>
          </View>
        </View>

        {/* 소개 */}
        {stock.issuer.bio && (
          <View style={styles.bioSection}>
            <Text style={styles.bioTitle}>소개</Text>
            <Text style={styles.bioText}>{stock.issuer.bio}</Text>
          </View>
        )}
      </ScrollView>

      {/* 하단 거래 영역 */}
      <View style={styles.tradeSection}>
        {/* 매수/매도 탭 */}
        <View style={styles.tradeTabs}>
          <TouchableOpacity
            style={[styles.tradeTab, tradeType === 'buy' && styles.tradeTabActive]}
            onPress={() => setTradeType('buy')}
          >
            <Text style={[styles.tradeTabText, tradeType === 'buy' && { color: COLORS.buttonBuy }]}>
              매수
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tradeTab, tradeType === 'sell' && styles.tradeTabActive]}
            onPress={() => setTradeType('sell')}
          >
            <Text style={[styles.tradeTabText, tradeType === 'sell' && { color: COLORS.buttonSell }]}>
              매도
            </Text>
          </TouchableOpacity>
        </View>

        {/* 수량 입력 */}
        <View style={styles.inputSection}>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>수량</Text>
            <TextInput
              style={styles.input}
              value={shares}
              onChangeText={setShares}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor={COLORS.textTertiary}
            />
            <Text style={styles.inputUnit}>주</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>주문 금액</Text>
            <Text style={styles.totalValue}>{calculateTotalAmount().toLocaleString()} PO</Text>
          </View>
        </View>

        {/* 매수/매도 버튼 */}
        <TouchableOpacity
          style={[
            styles.tradeButton,
            { backgroundColor: tradeType === 'buy' ? COLORS.buttonBuy : COLORS.buttonSell },
            isTrading && styles.tradeButtonDisabled,
          ]}
          onPress={handleTrade}
          disabled={isTrading}
        >
          {isTrading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.tradeButtonText}>
              {tradeType === 'buy' ? '매수' : '매도'}
            </Text>
          )}
        </TouchableOpacity>

        {/* 사용자 잔액 정보 */}
        {user && (
          <View style={styles.userBalance}>
            <Text style={styles.balanceText}>
              보유 PO: <Text style={styles.balanceValue}>{user.poBalance.toLocaleString()}</Text>
            </Text>
          </View>
        )}
      </View>
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
  priceSection: {
    backgroundColor: COLORS.surface,
    padding: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  stockName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 40,
    fontWeight: '700',
    color: COLORS.text,
  },
  currency: {
    fontSize: 20,
    color: COLORS.textSecondary,
    marginLeft: 8,
    marginBottom: 6,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    fontSize: 18,
    fontWeight: '600',
  },
  chartSection: {
    backgroundColor: COLORS.surface,
    marginTop: 8,
  },
  infoSection: {
    backgroundColor: COLORS.surface,
    padding: 20,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  bioSection: {
    backgroundColor: COLORS.surface,
    padding: 20,
    marginTop: 8,
  },
  bioTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  bioText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  tradeSection: {
    backgroundColor: COLORS.surface,
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tradeTabs: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 4,
  },
  tradeTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tradeTabActive: {
    backgroundColor: COLORS.surface,
  },
  tradeTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'right',
  },
  inputUnit: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  totalLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  tradeButton: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  tradeButtonDisabled: {
    opacity: 0.6,
  },
  tradeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  userBalance: {
    alignItems: 'center',
  },
  balanceText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  balanceValue: {
    fontWeight: '600',
    color: COLORS.text,
  },
});
