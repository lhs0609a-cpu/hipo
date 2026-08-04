import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import useThemedStyles from '../hooks/useThemedStyles';
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
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
  getStockDetail,
  getStockStats,
  buyStock,
  sellStock,
  getShareholderCard,
  getExecutionQuote,
} from '../api/stocks';
import { stockOrderAPI } from '../services/api';
import ShareModal from '../components/ShareModal';
import { getSavedUser } from '../api/auth';

// 투자 리스크 동의 여부 저장 키
const RISK_DISCLOSURE_AGREED_KEY = '@hipo_risk_disclosure_agreed';
import { COLORS } from '../constants/colors';
import StockChart from '../components/StockChart';
import PriceDisplay from '../components/stock/PriceDisplay';
import StockTabNavigation from '../components/stock/StockTabNavigation';
import TimePeriodSelector from '../components/stock/TimePeriodSelector';
import OrderBook from '../components/stock/OrderBook';
import HoldingBonusWidget from '../components/HoldingBonusWidget';
import VirtualStatusBadge from '../components/VirtualStatusBadge';
import DepthChart from '../components/stock/DepthChart';
import TradeTape from '../components/stock/TradeTape';
import { shareStock } from '../services/deepLinkService';

export default function StockDetailScreen({ route, navigation }) {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
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
  /** 이 수량/방향이 어느 시장에서 체결될지 (발행시장 vs 호가창) */
  const [executionPlan, setExecutionPlan] = useState(null);
  const [isTrading, setIsTrading] = useState(false);

  // 투자 리스크 고지 모달 상태
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [riskAgreed, setRiskAgreed] = useState(false);
  const [hasAgreedBefore, setHasAgreedBefore] = useState(false);
  const [pendingTradeAction, setPendingTradeAction] = useState(null);

  // 주주 인증 카드 공유 (매수 직후 바이럴 루프)
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareholderCard, setShareholderCard] = useState(null);

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

  // 리스크 동의 여부 확인
  useEffect(() => {
    const checkRiskAgreement = async () => {
      try {
        const agreed = await AsyncStorage.getItem(RISK_DISCLOSURE_AGREED_KEY);
        setHasAgreedBefore(agreed === 'true');
      } catch (error) {
        console.error('리스크 동의 확인 오류:', error);
      }
    };
    checkRiskAgreement();
  }, []);

  // 리스크 동의 처리
  const handleRiskAgreement = async () => {
    if (!riskAgreed) {
      const message = '투자 위험 고지 사항에 동의해주세요';
      Platform.OS === 'web' ? alert(message) : Alert.alert('알림', message);
      return;
    }

    try {
      await AsyncStorage.setItem(RISK_DISCLOSURE_AGREED_KEY, 'true');
      setHasAgreedBefore(true);
      setShowRiskModal(false);

      // 대기 중인 거래 실행
      if (pendingTradeAction) {
        pendingTradeAction();
        setPendingTradeAction(null);
      }
    } catch (error) {
      console.error('리스크 동의 저장 오류:', error);
    }
  };

  // 거래 시도 (리스크 동의 확인 후)
  /**
   * 수량이나 매매 방향이 바뀌면 체결 경로를 다시 조회한다.
   * 타이핑 중 과도한 호출을 막기 위해 400ms 디바운스.
   */
  useEffect(() => {
    const qty = parseInt(shares, 10);
    if (!stockId || !Number.isFinite(qty) || qty <= 0) {
      setExecutionPlan(null);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const plan = await getExecutionQuote(stockId, tradeType, qty);
        if (!cancelled) setExecutionPlan(plan);
      } catch (e) {
        if (!cancelled) setExecutionPlan(null);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [stockId, shares, tradeType]);

  const attemptTrade = () => {
    if (!shares || parseInt(shares) <= 0) {
      const message = '수량을 입력해주세요';
      Platform.OS === 'web' ? alert(message) : Alert.alert('알림', message);
      return;
    }

    // 첫 거래 시 리스크 고지 모달 표시
    if (!hasAgreedBefore) {
      setPendingTradeAction(() => executeTrade);
      setShowRiskModal(true);
      return;
    }

    executeTrade();
  };

  /**
   * 실제 거래 처리.
   *
   * 이 앱에는 시장이 둘 있다 — 크리에이터 발행 물량(발행시장)과 다른 주주의 호가(호가창).
   * 예전에는 이 버튼이 항상 발행시장으로만 갔기 때문에, 호가창을 보면서 매수를 눌러도
   * 화면에 보이는 호가와는 체결되지 않았다.
   * 이제 서버가 계산한 유리한 경로(quote.route)로 보낸다.
   */
  const executeTrade = async () => {
    setIsTrading(true);
    try {
      const tradeShares = parseInt(shares);

      // 체결 경로 조회 (실패하면 기존 발행시장 경로로 폴백)
      let plan = null;
      try {
        plan = await getExecutionQuote(stockId, tradeType, tradeShares);
      } catch (e) {
        plan = null;
      }

      if (plan?.route === 'unavailable') {
        const msg = plan.reason || '지금은 체결할 수 있는 물량이 없습니다';
        Platform.OS === 'web' ? alert(msg) : Alert.alert('체결 불가', msg);
        return;
      }

      if (plan?.route === 'secondary') {
        // 호가창에서 체결 — 시장가 주문으로 접수
        await stockOrderAPI.createOrder({
          stockId,
          orderType: tradeType === 'buy' ? 'BUY' : 'SELL',
          orderMode: 'market',
          quantity: tradeShares,
        });
        const message =
          `${tradeType === 'buy' ? '매수' : '매도'} 주문을 호가창에 접수했습니다.\n` +
          `예상 체결가 ${plan.estimatedPrice.toLocaleString()} PO · ${tradeShares}주` +
          (plan.advantage > 0
            ? `\n현재가 대비 ${plan.advantage.toLocaleString()} PO 유리`
            : '');
        Platform.OS === 'web' ? alert(message) : Alert.alert('주문 접수', message);
      } else if (tradeType === 'buy') {
        const result = await buyStock(stockId, tradeShares);
        const message = `매수 완료!\n${tradeShares}주를 ${result.transaction.totalCost.toLocaleString()} PO에 매수했습니다.`;
        Platform.OS === 'web' ? alert(message) : Alert.alert('매수 완료', message);

        // 매수 성공 → 주주 인증 카드 공유 유도 (바이럴 루프). 실패해도 거래엔 영향 없음
        try {
          const card = await getShareholderCard(stockId);
          setShareholderCard(card);
          setShareModalVisible(true);
        } catch (e) {
          // 카드 생성 실패는 조용히 무시
        }
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

  // 잔액 부족 여부 확인
  const isInsufficientBalance = () => {
    if (!user || tradeType !== 'buy') return false;
    const totalAmount = calculateTotalAmount();
    return totalAmount > 0 && totalAmount > (user.poBalance || 0);
  };

  // 최대 매수 가능 수량 계산
  const getMaxBuyableShares = () => {
    if (!user || !stock || stock.sharePrice <= 0) return 0;
    return Math.floor((user.poBalance || 0) / stock.sharePrice);
  };

  // 기간 변경 처리
  const handlePeriodChange = (periodKey) => {
    setChartPeriod(periodKey);
  };

  /**
   * 호가창에서 호가를 누르면 그 가격으로 지정가 주문 화면을 연다.
   * 매도호가를 누르면 매수, 매수호가를 누르면 매도가 기본값이 된다 (증권앱 관행).
   */
  const handleSelectPrice = (price, side) => {
    navigation.navigate('AdvancedOrder', {
      stockId,
      stockName: stock?.issuer?.displayName || stock?.issuer?.username,
      currentPrice: stock?.sharePrice,
      presetPrice: price,
      presetOrderType: side === 'ask' ? 'BUY' : 'SELL',
    });
  };

  // 로딩 화면
  if (loading || !stock) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
              enableRealtime={true}
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
              onSelectPrice={handleSelectPrice}
            />
          </View>
        );

      case 'trades':
        return (
          <View style={styles.tabContent}>
            <TradeTape stockId={stockId} />
          </View>
        );

      case 'depth':
        return (
          <View style={styles.tabContent}>
            <DepthChart
              stockId={stockId}
              currentPrice={stock.sharePrice}
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
        {/* 가상 사전상장 배너 */}
        {stock.isVirtualListing && (
          <View style={styles.virtualBanner}>
            <View style={styles.virtualBannerHeader}>
              <VirtualStatusBadge
                virtualStatus={stock.issuer?.virtualStatus || 'unclaimed'}
                size="medium"
              />
              <Text style={styles.virtualBannerTitle}>사전상장 크리에이터</Text>
            </View>
            <Text style={styles.virtualBannerText}>
              {stock.virtualListingNote || '이 크리에이터는 아직 본인 인증을 완료하지 않았습니다. 본인이 인수하면 가상 주식이 인증 주식으로 자동 전환됩니다.'}
            </Text>
            {stock.issuer?.virtualStatus === 'unclaimed' && (
              <TouchableOpacity
                style={styles.claimButton}
                onPress={() => navigation.navigate('ClaimRequest', {
                  virtualUserId: stock.issuer?.id,
                  virtualUserName: stock.issuer?.displayName || stock.issuer?.username,
                })}
              >
                <Text style={styles.claimButtonText}>이 계정 인수하기</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 가격 표시 + 공유 버튼 */}
        <View style={styles.priceShareRow}>
          <View style={{ flex: 1 }}>
            <PriceDisplay stats={stats} stockName={stock.issuer?.username || '크리에이터'} />
          </View>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => shareStock({
              stockId,
              stockName: stock.issuer?.displayName || stock.issuer?.username,
              price: stock.sharePrice,
              change: priceChange,
            })}
          >
            <Ionicons name="share-outline" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* 탭 네비게이션 */}
        <StockTabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* 탭 콘텐츠 */}
        {renderTabContent()}

        {/* 장기 보유 보너스 위젯 */}
        {stock.myShares > 0 && (
          <HoldingBonusWidget stockId={stockId} onBonusClaimed={loadData} />
        )}
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
              placeholderTextColor={theme.colors.textTertiary}
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
            {tradeType === 'buy' && (
              <TouchableOpacity
                style={[styles.quickButton, styles.quickButtonMax]}
                onPress={() => setShares(String(getMaxBuyableShares()))}
              >
                <Text style={[styles.quickButtonText, styles.quickButtonMaxText]}>MAX</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>주문 금액</Text>
            <Text style={styles.totalValue}>{calculateTotalAmount().toLocaleString()} PO</Text>
          </View>
        </View>

        {/* 체결 경로 안내 — 발행시장인지 호가창인지 미리 보여준다 */}
        {executionPlan && executionPlan.route !== 'unavailable' && (
          <View
            style={[
              styles.routeBanner,
              executionPlan.route === 'secondary' && styles.routeBannerSecondary,
            ]}
          >
            <Ionicons
              name={executionPlan.route === 'secondary' ? 'git-compare-outline' : 'business-outline'}
              size={16}
              color={executionPlan.route === 'secondary' ? theme.colors.primary : theme.colors.textSecondary}
            />
            <View style={styles.routeBannerBody}>
              <Text style={styles.routeBannerTitle}>
                {executionPlan.routeLabel}에서 체결 · 예상{' '}
                {executionPlan.estimatedPrice.toLocaleString()} PO
              </Text>
              <Text style={styles.routeBannerReason}>{executionPlan.reason}</Text>
            </View>
            {executionPlan.advantage > 0 ? (
              <Text style={styles.routeBannerAdvantage}>
                +{executionPlan.advantage.toLocaleString()}
              </Text>
            ) : null}
          </View>
        )}

        {/* 매수/매도 버튼 */}
        <View style={styles.tradeButtonRow}>
          <TouchableOpacity
            style={[
              styles.tradeButton,
              styles.tradeButtonMain,
              { backgroundColor: tradeType === 'buy' ? theme.colors.buttonBuy : theme.colors.buttonSell },
              isTrading && styles.tradeButtonDisabled,
            ]}
            onPress={attemptTrade}
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
            <Ionicons name="options-outline" size={20} color={theme.colors.primary} />
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
            <Ionicons name="pricetag-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.advancedOrderBannerText}>
              시장가/지정가/손절·익절 주문하기
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
        </TouchableOpacity>

        {/* 미체결 주문 진입 — 예전엔 이 화면으로 가는 경로가 없어 주문 취소가 불가능했다 */}
        <TouchableOpacity
          style={styles.advancedOrderBanner}
          onPress={() =>
            navigation.navigate('AdvancedOrder', {
              stockId,
              stockName: stock.issuer?.displayName || stock.issuer?.username,
              currentPrice: stock.sharePrice,
              initialTab: 'pending',
            })
          }
        >
          <View style={styles.advancedOrderBannerContent}>
            <Ionicons name="time-outline" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.advancedOrderBannerText}>미체결 주문 확인·취소</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
        </TouchableOpacity>

        {/* 잔액 부족 경고 및 충전 안내 */}
        {isInsufficientBalance() && (
          <View style={styles.insufficientBalanceCard}>
            <View style={styles.insufficientBalanceHeader}>
              <Ionicons name="warning" size={20} color="#F0344B" />
              <Text style={styles.insufficientBalanceTitle}>잔액이 부족합니다</Text>
            </View>
            <View style={styles.insufficientBalanceInfo}>
              <View style={styles.balanceCompare}>
                <View style={styles.balanceCompareItem}>
                  <Text style={styles.balanceCompareLabel}>주문 금액</Text>
                  <Text style={styles.balanceCompareValue}>{calculateTotalAmount().toLocaleString()} PO</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={theme.colors.textTertiary} />
                <View style={styles.balanceCompareItem}>
                  <Text style={styles.balanceCompareLabel}>보유 잔액</Text>
                  <Text style={[styles.balanceCompareValue, styles.balanceCompareValueRed]}>
                    {(user?.poBalance || 0).toLocaleString()} PO
                  </Text>
                </View>
              </View>
              <Text style={styles.insufficientAmount}>
                {(calculateTotalAmount() - (user?.poBalance || 0)).toLocaleString()} PO 부족
              </Text>
            </View>
            <TouchableOpacity
              style={styles.chargeButton}
              onPress={() => navigation.navigate('Charge')}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.chargeButtonText}>지금 충전하기</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 사용자 잔액 정보 */}
        {user && !isInsufficientBalance() && (
          <View style={styles.userBalance}>
            <Text style={styles.balanceText}>
              보유 PO: <Text style={styles.balanceValue}>{user.poBalance?.toLocaleString()}</Text>
            </Text>
            {tradeType === 'buy' && getMaxBuyableShares() > 0 && (
              <Text style={styles.maxBuyableText}>
                최대 {getMaxBuyableShares().toLocaleString()}주 매수 가능
              </Text>
            )}
          </View>
        )}
      </View>

      {/* 투자 리스크 고지 모달 */}
      <Modal
        visible={showRiskModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRiskModal(false)}
      >
        <View style={styles.riskModalOverlay}>
          <View style={styles.riskModalContent}>
            <View style={styles.riskModalHeader}>
              <Ionicons name="warning" size={32} color="#F0344B" />
              <Text style={styles.riskModalTitle}>투자 위험 고지</Text>
            </View>

            <View style={styles.riskModalBody}>
              <Text style={styles.riskModalSubtitle}>
                HIPO에서의 거래를 시작하기 전에 아래 내용을 꼭 확인해주세요.
              </Text>

              <View style={styles.riskItem}>
                <Ionicons name="alert-circle" size={20} color="#F59B00" />
                <Text style={styles.riskItemText}>
                  <Text style={styles.riskItemBold}>원금 손실 위험: </Text>
                  크리에이터 주식의 가격은 변동될 수 있으며, 투자 원금의 일부 또는 전부를 잃을 수 있습니다.
                </Text>
              </View>

              <View style={styles.riskItem}>
                <Ionicons name="alert-circle" size={20} color="#F59B00" />
                <Text style={styles.riskItemText}>
                  <Text style={styles.riskItemBold}>환불 불가: </Text>
                  충전된 PO는 원칙적으로 환불되지 않습니다. 신중하게 결정해주세요.
                </Text>
              </View>

              <View style={styles.riskItem}>
                <Ionicons name="alert-circle" size={20} color="#F59B00" />
                <Text style={styles.riskItemText}>
                  <Text style={styles.riskItemBold}>배당금 미보장: </Text>
                  배당금은 크리에이터의 활동에 따라 지급되며, 금액이 보장되지 않습니다.
                </Text>
              </View>

              <View style={styles.riskItem}>
                <Ionicons name="alert-circle" size={20} color="#F59B00" />
                <Text style={styles.riskItemText}>
                  <Text style={styles.riskItemBold}>실제 주식 아님: </Text>
                  HIPO의 크리에이터 주식은 실제 증권이 아니며, 법적 소유권을 부여하지 않습니다.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.riskCheckboxRow}
              onPress={() => setRiskAgreed(!riskAgreed)}
            >
              <View style={[styles.riskCheckbox, riskAgreed && styles.riskCheckboxChecked]}>
                {riskAgreed && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={styles.riskCheckboxText}>
                위 내용을 모두 이해했으며, 투자에 따른 위험을 감수합니다.
              </Text>
            </TouchableOpacity>

            <View style={styles.riskModalButtons}>
              <TouchableOpacity
                style={styles.riskCancelButton}
                onPress={() => {
                  setShowRiskModal(false);
                  setPendingTradeAction(null);
                  setRiskAgreed(false);
                }}
              >
                <Text style={styles.riskCancelButtonText}>취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.riskAgreeButton,
                  !riskAgreed && styles.riskAgreeButtonDisabled,
                ]}
                onPress={handleRiskAgreement}
                disabled={!riskAgreed}
              >
                <Text style={styles.riskAgreeButtonText}>동의하고 계속</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 주주 인증 카드 공유 모달 (매수 직후 바이럴 루프) */}
      {shareModalVisible && shareholderCard && (
        <ShareModal
          visible={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
          shareType="shareholder"
          data={shareholderCard}
        />
      )}
    </KeyboardAvoidingView>
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
  priceShareRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginRight: 16,
  },
  virtualBanner: {
    backgroundColor: t.colors.warningBackground,
    borderBottomWidth: 1,
    borderBottomColor: '#FCD9A0',
    padding: 16,
  },
  virtualBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  virtualBannerTitle: {
    fontSize: 15,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.warningText,
  },
  virtualBannerText: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: '#8A5626',
    lineHeight: 20,
  },
  claimButton: {
    marginTop: 12,
    backgroundColor: '#8B5CF6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  claimButtonText: {
    color: t.colors.surface,
    fontSize: 14,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  tabContent: {
    backgroundColor: t.colors.surface,
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
    backgroundColor: t.colors.background,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  chartTypeButtonActive: {
    backgroundColor: t.colors.text,
    borderColor: t.colors.text,
  },
  chartTypeText: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textSecondary,
  },
  chartTypeTextActive: {
    color: t.colors.surface,
  },
  infoSection: {
    backgroundColor: t.colors.surface,
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 15,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.text,
  },
  infoDivider: {
    height: 1,
    backgroundColor: t.colors.divider,
  },
  bioSection: {
    backgroundColor: t.colors.surface,
    padding: 20,
    marginTop: 8,
  },
  bioTitle: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.text,
    marginBottom: 12,
  },
  bioText: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.text,
    lineHeight: 22,
  },
  tradesSection: {
    backgroundColor: t.colors.surface,
    padding: 20,
    marginTop: 8,
  },
  tradesTitle: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.text,
    marginBottom: 12,
  },
  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  tradeUser: {
    flex: 1,
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.text,
  },
  tradeType: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  buyType: {
    backgroundColor: 'rgba(240, 52, 75, 0.1)',
    color: t.colors.up,
  },
  sellType: {
    backgroundColor: 'rgba(18, 97, 196, 0.1)',
    color: t.colors.down,
  },
  tradeAmount: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  tradeSection: {
    backgroundColor: t.colors.surface,
    padding: 16,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  tradeTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: t.colors.background,
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
    backgroundColor: t.colors.buttonBuy,
  },
  tradeTabActiveSell: {
    backgroundColor: t.colors.buttonSell,
  },
  tradeTabText: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textSecondary,
  },
  tradeTabTextActiveBuy: {
    color: t.colors.surface,
  },
  tradeTabTextActiveSell: {
    color: t.colors.surface,
  },
  inputSection: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.text,
    textAlign: 'right',
  },
  inputUnit: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
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
    backgroundColor: t.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  quickButtonText: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textSecondary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  totalValue: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.text,
  },
  routeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: t.colors.surfaceSunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.borderLight,
  },
  routeBannerSecondary: {
    backgroundColor: t.colors.primaryBackground,
    borderColor: t.colors.primaryBorder,
  },
  routeBannerBody: {
    flex: 1,
  },
  routeBannerTitle: {
    fontSize: 12,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.textPrimary,
  },
  routeBannerReason: {
    fontSize: 11,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    marginTop: 2,
  },
  routeBannerAdvantage: {
    fontSize: 12,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.success,
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
    color: t.colors.surface,
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  advancedOrderButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: t.colors.background,
    borderWidth: 1,
    borderColor: t.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  advancedOrderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.colors.background,
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
    fontFamily: t.fonts.semibold,
    color: t.colors.primary,
    fontWeight: '600',
  },
  userBalance: {
    alignItems: 'center',
  },
  balanceText: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  balanceValue: {
    fontWeight: '600',
    color: t.colors.text,
  },
  maxBuyableText: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.primary,
    marginTop: 4,
  },
  // Quick button MAX 스타일
  quickButtonMax: {
    backgroundColor: t.colors.primary,
    borderColor: t.colors.primary,
  },
  quickButtonMaxText: {
    color: t.colors.surface,
  },
  // 잔액 부족 카드 스타일
  insufficientBalanceCard: {
    backgroundColor: t.colors.errorBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: t.colors.stockUpSoft,
  },
  insufficientBalanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  insufficientBalanceTitle: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.error,
  },
  insufficientBalanceInfo: {
    marginBottom: 12,
  },
  balanceCompare: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  balanceCompareItem: {
    alignItems: 'center',
  },
  balanceCompareLabel: {
    fontSize: 11,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    marginBottom: 4,
  },
  balanceCompareValue: {
    fontSize: 14,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.text,
  },
  balanceCompareValueRed: {
    color: t.colors.error,
  },
  insufficientAmount: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.error,
    textAlign: 'center',
  },
  chargeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
  },
  chargeButtonText: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.surface,
  },
  // 투자 리스크 고지 모달 스타일
  riskModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  riskModalContent: {
    backgroundColor: t.colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  riskModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  riskModalTitle: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.textPrimary,
    marginTop: 12,
  },
  riskModalBody: {
    marginBottom: 20,
  },
  riskModalSubtitle: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  riskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: t.colors.warningBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  riskItemText: {
    flex: 1,
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.gray700,
    lineHeight: 20,
  },
  riskItemBold: {
    fontWeight: '700',
    color: t.colors.textPrimary,
  },
  riskCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  riskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: t.colors.borderDark,
    backgroundColor: t.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  riskCheckboxChecked: {
    backgroundColor: t.colors.primary,
    borderColor: t.colors.primary,
  },
  riskCheckboxText: {
    flex: 1,
    fontSize: 14,
    fontFamily: t.fonts.medium,
    color: t.colors.gray700,
    fontWeight: '500',
    lineHeight: 20,
  },
  riskModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  riskCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: t.colors.backgroundSecondary,
    alignItems: 'center',
  },
  riskCancelButtonText: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textSecondary,
  },
  riskAgreeButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
  },
  riskAgreeButtonDisabled: {
    backgroundColor: t.colors.borderDark,
  },
  riskAgreeButtonText: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.surface,
  },
});
