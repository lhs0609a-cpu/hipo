import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStockDetail, getStockStats, buyStock, sellStock } from '../api/stocks';
import { getSavedUser } from '../api/auth';
import { COLORS } from '../constants/colors';
import StockChart from '../components/StockChart';
import PriceDisplay from '../components/stock/PriceDisplay';
import StockTabNavigation from '../components/stock/StockTabNavigation';
import TimePeriodSelector from '../components/stock/TimePeriodSelector';
import OrderBook from '../components/stock/OrderBook';

export default function StockDetailScreen({ route, navigation }) {
  const { stockId } = route.params;

  // 기본 상태
  const [stock, setStock] = useState(null);
  const [stats, setStats] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentTrades, setRecentTrades] = useState([]);

  // 탭 상태
  const [activeTab, setActiveTab] = useState('chart');

  // 차트 상태
  const [chartPeriod, setChartPeriod] = useState('1M');
  const [chartType, setChartType] = useState('candle');

  // 거래 상태
  const [tradeType, setTradeType] = useState('buy');
  const [shares, setShares] = useState('');
  const [isTrading, setIsTrading] = useState(false);

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      const [stockData, statsData, userData] = await Promise.all([
        getStockDetail(stockId),
        getStockStats(stockId),
        getSavedUser(),
      ]);
      setStock(stockData.stock);
      setStats(statsData);
      setUser(userData);
      setRecentTrades(stockData.recentTrades || []);
    } catch (error) {
      console.error('주식 상세 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  }, [stockId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 거래 처리
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
        const message = `매수 완료!\n${tradeShares}주를 ${result.transaction.totalCost.toLocaleString()} PO에 매수했습니다.`;
        Platform.OS === 'web' ? alert(message) : Alert.alert('매수 완료', message);
      } else {
        const result = await sellStock(stockId, tradeShares);
        const message = `매도 완료!\n${tradeShares}주를 ${result.transaction.totalRevenue.toLocaleString()} PO에 매도했습니다.`;
        Platform.OS === 'web' ? alert(message) : Alert.alert('매도 완료', message);
      }

      setShares('');
      loadData();
    } catch (error) {
      const errorMsg =
        error.response?.data?.error || error.message || '거래 중 오류가 발생했습니다';
      Platform.OS === 'web' ? alert(errorMsg) : Alert.alert('오류', errorMsg);
    } finally {
      setIsTrading(false);
    }
  };

  const calculateTotalAmount = () => {
    if (!stock || !shares) return 0;
    return stock.sharePrice * parseInt(shares || 0);
  };

  // 기간 변경 처리
  const handlePeriodChange = (periodKey) => {
    setChartPeriod(periodKey);
  };

  // 로딩 화면
  if (loading || !stock) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const priceChange = stats?.priceChangePercent || stock.priceChangePercent || 0;

  // 탭 콘텐츠 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case 'chart':
        return (
          <View style={styles.tabContent}>
            {/* 기간 선택 */}
            <TimePeriodSelector selected={chartPeriod} onChange={handlePeriodChange} />

            {/* 차트 타입 선택 */}
            <View style={styles.chartTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.chartTypeButton,
                  chartType === 'candle' && styles.chartTypeButtonActive,
                ]}
                onPress={() => setChartType('candle')}
              >
                <Text
                  style={[
                    styles.chartTypeText,
                    chartType === 'candle' && styles.chartTypeTextActive,
                  ]}
                >
                  캔들
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.chartTypeButton,
                  chartType === 'line' && styles.chartTypeButtonActive,
                ]}
                onPress={() => setChartType('line')}
              >
                <Text
                  style={[
                    styles.chartTypeText,
                    chartType === 'line' && styles.chartTypeTextActive,
                  ]}
                >
                  라인
                </Text>
              </TouchableOpacity>
            </View>

            {/* 차트 */}
            <StockChart
              stockId={stockId}
              period={chartPeriod}
              chartType={chartType}
              showIndicators={true}
            />
          </View>
        );

      case 'orderbook':
        return (
          <View style={styles.tabContent}>
            <OrderBook
              stockId={stockId}
              currentPrice={stock.sharePrice}
              priceChangePercent={priceChange}
            />
          </View>
        );

      case 'info':
        return (
          <View style={styles.tabContent}>
            {/* 주식 정보 */}
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>시가총액</Text>
                <Text style={styles.infoValue}>
                  {(stock.marketCapTotal || 0).toLocaleString()} PO
                </Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>발행 주식</Text>
                <Text style={styles.infoValue}>
                  {stock.issuedShares.toLocaleString()} / {stock.totalShares.toLocaleString()}주
                </Text>
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
            {stock.issuer?.bio && (
              <View style={styles.bioSection}>
                <Text style={styles.bioTitle}>소개</Text>
                <Text style={styles.bioText}>{stock.issuer.bio}</Text>
              </View>
            )}

            {/* 최근 거래 내역 */}
            {recentTrades.length > 0 && (
              <View style={styles.tradesSection}>
                <Text style={styles.tradesTitle}>최근 거래</Text>
                {recentTrades.slice(0, 5).map((trade, index) => (
                  <View key={index} style={styles.tradeRow}>
                    <Text style={styles.tradeUser}>
                      {trade.buyer?.username || '익명'}
                    </Text>
                    <Text
                      style={[
                        styles.tradeType,
                        trade.transactionType === 'buy'
                          ? styles.buyType
                          : styles.sellType,
                      ]}
                    >
                      {trade.transactionType === 'buy' ? '매수' : '매도'}
                    </Text>
                    <Text style={styles.tradeAmount}>
                      {trade.shares}주 × {trade.pricePerShare?.toLocaleString()} PO
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 가격 표시 섹션 */}
        <PriceDisplay stats={stats} stockName={stock.issuer?.username || '크리에이터'} />

        {/* 탭 네비게이션 */}
        <StockTabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* 탭 콘텐츠 */}
        {renderTabContent()}
      </ScrollView>

      {/* 하단 거래 영역 */}
      <View style={styles.tradeSection}>
        {/* 매수/매도 탭 */}
        <View style={styles.tradeTabs}>
          <TouchableOpacity
            style={[styles.tradeTab, tradeType === 'buy' && styles.tradeTabActiveBuy]}
            onPress={() => setTradeType('buy')}
          >
            <Text
              style={[
                styles.tradeTabText,
                tradeType === 'buy' && styles.tradeTabTextActiveBuy,
              ]}
            >
              매수
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tradeTab, tradeType === 'sell' && styles.tradeTabActiveSell]}
            onPress={() => setTradeType('sell')}
          >
            <Text
              style={[
                styles.tradeTabText,
                tradeType === 'sell' && styles.tradeTabTextActiveSell,
              ]}
            >
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

          <View style={styles.quickButtons}>
            {[10, 50, 100, 500].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={styles.quickButton}
                onPress={() => setShares(String(amount))}
              >
                <Text style={styles.quickButtonText}>{amount}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>주문 금액</Text>
            <Text style={styles.totalValue}>{calculateTotalAmount().toLocaleString()} PO</Text>
          </View>
        </View>

        {/* 매수/매도 버튼 */}
        <View style={styles.tradeButtonRow}>
          <TouchableOpacity
            style={[
              styles.tradeButton,
              styles.tradeButtonMain,
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
                {tradeType === 'buy' ? '매수하기' : '매도하기'}
              </Text>
            )}
          </TouchableOpacity>

          {/* 지정가 주문 버튼 */}
          <TouchableOpacity
            style={styles.advancedOrderButton}
            onPress={() =>
              navigation.navigate('AdvancedOrder', {
                stockId,
                stockName: stock.issuer?.displayName || stock.issuer?.username,
                currentPrice: stock.sharePrice,
              })
            }
          >
            <Ionicons name="options-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* 지정가 주문 안내 */}
        <TouchableOpacity
          style={styles.advancedOrderBanner}
          onPress={() =>
            navigation.navigate('AdvancedOrder', {
              stockId,
              stockName: stock.issuer?.displayName || stock.issuer?.username,
              currentPrice: stock.sharePrice,
            })
          }
        >
          <View style={styles.advancedOrderBannerContent}>
            <Ionicons name="pricetag-outline" size={18} color={COLORS.primary} />
            <Text style={styles.advancedOrderBannerText}>
              지정가/손절/익절 주문하기
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
        </TouchableOpacity>

        {/* 사용자 잔액 정보 */}
        {user && (
          <View style={styles.userBalance}>
            <Text style={styles.balanceText}>
              보유 PO: <Text style={styles.balanceValue}>{user.poBalance?.toLocaleString()}</Text>
            </Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  tabContent: {
    backgroundColor: COLORS.surface,
    minHeight: 300,
  },
  chartTypeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chartTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartTypeButtonActive: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.text,
  },
  chartTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chartTypeTextActive: {
    color: '#FFFFFF',
  },
  infoSection: {
    backgroundColor: COLORS.surface,
    padding: 20,
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
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  bioText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  tradesSection: {
    backgroundColor: COLORS.surface,
    padding: 20,
    marginTop: 8,
  },
  tradesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  tradeUser: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  tradeType: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  buyType: {
    backgroundColor: 'rgba(240, 68, 82, 0.1)',
    color: COLORS.up,
  },
  sellType: {
    backgroundColor: 'rgba(18, 97, 196, 0.1)',
    color: COLORS.down,
  },
  tradeAmount: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  tradeSection: {
    backgroundColor: COLORS.surface,
    padding: 16,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tradeTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 4,
  },
  tradeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tradeTabActiveBuy: {
    backgroundColor: COLORS.buttonBuy,
  },
  tradeTabActiveSell: {
    backgroundColor: COLORS.buttonSell,
  },
  tradeTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tradeTabTextActiveBuy: {
    color: '#FFFFFF',
  },
  tradeTabTextActiveSell: {
    color: '#FFFFFF',
  },
  inputSection: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
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
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
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
  tradeButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  tradeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  tradeButtonMain: {
    flex: 1,
  },
  tradeButtonDisabled: {
    opacity: 0.6,
  },
  tradeButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  advancedOrderButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  advancedOrderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  advancedOrderBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  advancedOrderBannerText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
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
