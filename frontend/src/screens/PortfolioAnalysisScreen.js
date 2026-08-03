import React, { useState, useEffect } from 'react';
import { getAppWidth, getAppHeight } from '../utils/appWidth';
import useThemedStyles from '../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { portfolioAPI } from '../services/api';

const width = getAppWidth();

const PortfolioAnalysisScreen = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [summary, setSummary] = useState(null);
  const [sectorData, setSectorData] = useState(null);
  const [dividendData, setDividendData] = useState(null);
  const [tradeStats, setTradeStats] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, sectorRes, dividendRes, tradeRes] = await Promise.all([
        portfolioAPI.getSummary(),
        portfolioAPI.getSectorAnalysis(),
        portfolioAPI.getDividendAnalysis(),
        portfolioAPI.getTradeStatistics(),
      ]);
      setSummary(summaryRes.data);
      setSectorData(sectorRes.data);
      setDividendData(dividendRes.data);
      setTradeStats(tradeRes.data);
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    return num.toLocaleString();
  };

  const formatPercent = (num) => {
    if (!num) return '0%';
    const prefix = num >= 0 ? '+' : '';
    return `${prefix}${num.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2B5FE3" />
      </View>
    );
  }

  const renderSummaryTab = () => (
    <View style={styles.tabContent}>
      {/* 총 자산 카드 */}
      <View style={styles.totalAssetCard}>
        <Text style={styles.totalAssetLabel}>총 자산</Text>
        <Text style={styles.totalAssetValue}>
          {formatNumber(summary?.summary?.totalAssets)} PO
        </Text>
        <View style={styles.assetBreakdown}>
          <View style={styles.assetItem}>
            <Text style={styles.assetItemLabel}>주식 평가액</Text>
            <Text style={styles.assetItemValue}>
              {formatNumber(summary?.summary?.totalValue)} PO
            </Text>
          </View>
          <View style={styles.assetItem}>
            <Text style={styles.assetItemLabel}>현금</Text>
            <Text style={styles.assetItemValue}>
              {formatNumber(summary?.summary?.cashBalance)} PO
            </Text>
          </View>
        </View>
      </View>

      {/* 수익률 카드 */}
      <View style={styles.profitCard}>
        <View style={styles.profitRow}>
          <Text style={styles.profitLabel}>평가 손익</Text>
          <Text style={[
            styles.profitValue,
            summary?.summary?.totalProfit >= 0 ? styles.profitUp : styles.profitDown
          ]}>
            {formatNumber(summary?.summary?.totalProfit)} PO
          </Text>
        </View>
        <View style={styles.profitRow}>
          <Text style={styles.profitLabel}>수익률</Text>
          <Text style={[
            styles.profitValue,
            summary?.summary?.totalProfitPercent >= 0 ? styles.profitUp : styles.profitDown
          ]}>
            {formatPercent(parseFloat(summary?.summary?.totalProfitPercent))}
          </Text>
        </View>
        <View style={styles.profitRow}>
          <Text style={styles.profitLabel}>누적 배당금</Text>
          <Text style={styles.dividendValue}>
            {formatNumber(summary?.summary?.totalDividends)} PO
          </Text>
        </View>
      </View>

      {/* 보유 종목 */}
      <View style={styles.holdingsSection}>
        <Text style={styles.sectionTitle}>보유 종목 ({summary?.holdings?.length || 0})</Text>
        {summary?.holdings?.map((holding, index) => (
          <TouchableOpacity
            key={index}
            style={styles.holdingItem}
            onPress={() => navigation.navigate('StockDetail', { stockId: holding.stockId })}
          >
            <View style={styles.holdingLeft}>
              <Text style={styles.holdingName}>{holding.creator?.username}</Text>
              <Text style={styles.holdingShares}>{holding.shares}주</Text>
            </View>
            <View style={styles.holdingRight}>
              <Text style={styles.holdingValue}>
                {formatNumber(holding.currentValue)} PO
              </Text>
              <Text style={[
                styles.holdingProfit,
                holding.profitPercent >= 0 ? styles.profitUp : styles.profitDown
              ]}>
                {formatPercent(holding.profitPercent)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSectorTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectorChart}>
        {sectorData?.sectors?.map((sector, index) => (
          <View key={index} style={styles.sectorBar}>
            <View style={styles.sectorBarLabel}>
              <Text style={styles.sectorName}>{sector.displayName}</Text>
              <Text style={styles.sectorPercent}>{sector.weight}%</Text>
            </View>
            <View style={styles.sectorBarContainer}>
              <View
                style={[
                  styles.sectorBarFill,
                  { width: `${sector.weight}%`, backgroundColor: getSectorColor(index) }
                ]}
              />
            </View>
            <Text style={styles.sectorValue}>
              {formatNumber(sector.value)} PO
            </Text>
          </View>
        ))}
      </View>

      {/* 섹터별 상세 */}
      {sectorData?.sectors?.map((sector, index) => (
        <View key={index} style={styles.sectorDetail}>
          <View style={styles.sectorHeader}>
            <View style={[styles.sectorDot, { backgroundColor: getSectorColor(index) }]} />
            <Text style={styles.sectorDetailName}>{sector.displayName}</Text>
            <Text style={styles.sectorDetailCount}>{sector.count}종목</Text>
          </View>
          {sector.stocks?.map((stock, idx) => (
            <View key={idx} style={styles.sectorStock}>
              <Text style={styles.sectorStockName}>{stock.creator}</Text>
              <Text style={styles.sectorStockValue}>
                {formatNumber(stock.value)} PO
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );

  const renderDividendTab = () => (
    <View style={styles.tabContent}>
      {/* 배당 요약 */}
      <View style={styles.dividendSummary}>
        <View style={styles.dividendSummaryItem}>
          <Text style={styles.dividendSummaryLabel}>총 배당금</Text>
          <Text style={styles.dividendSummaryValue}>
            {formatNumber(dividendData?.totalDividends)} PO
          </Text>
        </View>
        <View style={styles.dividendSummaryItem}>
          <Text style={styles.dividendSummaryLabel}>예상 월 배당</Text>
          <Text style={styles.dividendSummaryValue}>
            {formatNumber(dividendData?.estimatedMonthlyDividend)} PO
          </Text>
        </View>
      </View>

      {/* 종목별 배당 */}
      <View style={styles.dividendByStock}>
        <Text style={styles.sectionTitle}>종목별 배당</Text>
        {dividendData?.byStock?.map((item, index) => (
          <View key={index} style={styles.dividendStockItem}>
            <Text style={styles.dividendStockName}>{item.creator}</Text>
            <View style={styles.dividendStockRight}>
              <Text style={styles.dividendStockValue}>
                {formatNumber(item.total)} PO
              </Text>
              <Text style={styles.dividendStockCount}>
                {item.count}회
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderTradeTab = () => (
    <View style={styles.tabContent}>
      {/* 거래 요약 */}
      <View style={styles.tradeSummary}>
        <View style={styles.tradeRow}>
          <View style={styles.tradeItem}>
            <Text style={styles.tradeLabel}>총 거래</Text>
            <Text style={styles.tradeValue}>
              {tradeStats?.summary?.totalTrades || 0}건
            </Text>
          </View>
          <View style={styles.tradeItem}>
            <Text style={styles.tradeLabel}>매수</Text>
            <Text style={[styles.tradeValue, styles.buyText]}>
              {tradeStats?.summary?.buyCount || 0}건
            </Text>
          </View>
          <View style={styles.tradeItem}>
            <Text style={styles.tradeLabel}>매도</Text>
            <Text style={[styles.tradeValue, styles.sellText]}>
              {tradeStats?.summary?.sellCount || 0}건
            </Text>
          </View>
        </View>
      </View>

      {/* 거래량 */}
      <View style={styles.volumeSection}>
        <Text style={styles.sectionTitle}>거래 금액</Text>
        <View style={styles.volumeRow}>
          <Text style={styles.volumeLabel}>매수 총액</Text>
          <Text style={[styles.volumeValue, styles.buyText]}>
            {formatNumber(tradeStats?.summary?.buyVolume)} PO
          </Text>
        </View>
        <View style={styles.volumeRow}>
          <Text style={styles.volumeLabel}>매도 총액</Text>
          <Text style={[styles.volumeValue, styles.sellText]}>
            {formatNumber(tradeStats?.summary?.sellVolume)} PO
          </Text>
        </View>
        <View style={[styles.volumeRow, styles.netFlowRow]}>
          <Text style={styles.volumeLabel}>순 흐름</Text>
          <Text style={[
            styles.volumeValue,
            tradeStats?.summary?.netFlow >= 0 ? styles.profitUp : styles.profitDown
          ]}>
            {formatNumber(tradeStats?.summary?.netFlow)} PO
          </Text>
        </View>
      </View>

      {/* 가장 많이 거래한 종목 */}
      <View style={styles.topTradedSection}>
        <Text style={styles.sectionTitle}>가장 많이 거래한 종목</Text>
        {tradeStats?.topTraded?.map((item, index) => (
          <View key={index} style={styles.topTradedItem}>
            <Text style={styles.topTradedRank}>#{index + 1}</Text>
            <Text style={styles.topTradedName}>{item.creator}</Text>
            <Text style={styles.topTradedCount}>{item.tradeCount}회</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const getSectorColor = (index) => {
    const colors = ['#2B5FE3', '#F0344B', '#00B368', '#F59B00', '#8B5CF6', '#00B0A6'];
    return colors[index % colors.length];
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>포트폴리오 분석</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 탭 */}
      <View style={styles.tabs}>
        {[
          { key: 'summary', label: '요약' },
          { key: 'sector', label: '섹터' },
          { key: 'dividend', label: '배당' },
          { key: 'trade', label: '거래' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'summary' && renderSummaryTab()}
        {activeTab === 'sector' && renderSectorTab()}
        {activeTab === 'dividend' && renderDividendTab()}
        {activeTab === 'trade' && renderTradeTab()}
      </ScrollView>
    </View>
  );
};

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: t.colors.primary,
  },
  tabText: {
    fontSize: 15,
    color: '#666',
  },
  activeTabText: {
    color: t.colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  totalAssetCard: {
    backgroundColor: t.colors.primary,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  totalAssetLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 8,
  },
  totalAssetValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
  },
  assetBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  assetItem: {},
  assetItemLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 4,
  },
  assetItemValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  profitCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  profitLabel: {
    fontSize: 15,
    color: '#666',
  },
  profitValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  profitUp: {
    color: t.colors.error,
  },
  profitDown: {
    color: t.colors.primaryDark,
  },
  dividendValue: {
    fontSize: 16,
    fontWeight: '600',
    color: t.colors.success,
  },
  holdingsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  holdingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.backgroundSecondary,
  },
  holdingLeft: {},
  holdingName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  holdingShares: {
    fontSize: 13,
    color: '#666',
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  holdingProfit: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectorBar: {
    marginBottom: 16,
  },
  sectorBarLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectorName: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectorPercent: {
    fontSize: 14,
    color: '#666',
  },
  sectorBarContainer: {
    height: 8,
    backgroundColor: t.colors.backgroundSecondary,
    borderRadius: 4,
    marginBottom: 4,
  },
  sectorBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  sectorValue: {
    fontSize: 13,
    color: '#666',
  },
  sectorDetail: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  sectorDetailName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  sectorDetailCount: {
    fontSize: 13,
    color: '#666',
  },
  sectorStock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingLeft: 20,
    borderTopWidth: 1,
    borderTopColor: t.colors.backgroundSecondary,
  },
  sectorStockName: {
    fontSize: 14,
    color: '#333',
  },
  sectorStockValue: {
    fontSize: 14,
    color: '#666',
  },
  dividendSummary: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dividendSummaryItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  dividendSummaryLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  dividendSummaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: t.colors.success,
  },
  dividendByStock: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  dividendStockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.backgroundSecondary,
  },
  dividendStockName: {
    flex: 1,
    fontSize: 15,
  },
  dividendStockRight: {
    alignItems: 'flex-end',
  },
  dividendStockValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  dividendStockCount: {
    fontSize: 12,
    color: '#666',
  },
  tradeSummary: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  tradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tradeItem: {
    alignItems: 'center',
  },
  tradeLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  tradeValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  buyText: {
    color: t.colors.error,
  },
  sellText: {
    color: t.colors.primaryDark,
  },
  volumeSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  volumeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.backgroundSecondary,
  },
  netFlowRow: {
    borderBottomWidth: 0,
    paddingTop: 16,
  },
  volumeLabel: {
    fontSize: 15,
    color: '#666',
  },
  volumeValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  topTradedSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  topTradedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.backgroundSecondary,
  },
  topTradedRank: {
    width: 30,
    fontSize: 14,
    fontWeight: '600',
    color: t.colors.primary,
  },
  topTradedName: {
    flex: 1,
    fontSize: 15,
  },
  topTradedCount: {
    fontSize: 14,
    color: '#666',
  },
});

export default PortfolioAnalysisScreen;
