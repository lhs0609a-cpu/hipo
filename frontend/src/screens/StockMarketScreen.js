import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants/colors';
import api from '../api/client';
import { useStockTicker, useStock } from '../contexts/StockContext';

export default function StockMarketScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all'); // all, rising, falling, volume
  const [stocks, setStocks] = useState([]);
  const [marketData, setMarketData] = useState({
    totalVolume: 0,
    totalMarketCap: 0,
    activeTraders: 0,
  });

  useEffect(() => {
    loadData();
  }, [selectedTab]);

  const loadData = async () => {
    try {
      setLoading(true);

      // 주식 목록 조회
      const response = await api.get('/stocks', {
        params: {
          sort: getSortParam(),
          limit: 50,
        }
      });

      if (response.data.success) {
        setStocks(response.data.stocks || []);
      }

      // 시장 차트 데이터 조회 (시장 통계)
      const marketResponse = await api.get('/stocks/market/chart');
      if (marketResponse.data.success) {
        setMarketData({
          totalVolume: marketResponse.data.totalVolume || 0,
          totalMarketCap: marketResponse.data.totalMarketCap || 0,
          activeTraders: marketResponse.data.activeTraders || 0,
        });
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getSortParam = () => {
    switch (selectedTab) {
      case 'rising': return 'price_change_desc';
      case 'falling': return 'price_change_asc';
      case 'volume': return 'volume_desc';
      default: return 'market_cap_desc';
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getPriceChangeColor = (change) => {
    if (change > 0) return COLORS.stockUp;
    if (change < 0) return COLORS.stockDown;
    return COLORS.textSecondary;
  };

  const getPriceChangeIcon = (change) => {
    if (change > 0) return '▲';
    if (change < 0) return '▼';
    return '─';
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="뒤로 가기"
          accessibilityRole="button"
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>실시간 크리에이터 시장</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 시장 통계 */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>시장 현황</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>총 시가총액</Text>
              <Text style={styles.statValue}>{formatNumber(marketData.totalMarketCap)} PO</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>24시간 거래량</Text>
              <Text style={styles.statValue}>{formatNumber(marketData.totalVolume)} PO</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>활성 트레이더</Text>
              <Text style={styles.statValue}>{marketData.activeTraders}명</Text>
            </View>
          </View>
        </View>

        {/* 탭 네비게이션 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'all' && styles.tabActive]}
            onPress={() => setSelectedTab('all')}
          >
            <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>
              시가총액 Top
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'rising' && styles.tabActive]}
            onPress={() => setSelectedTab('rising')}
          >
            <Text style={[styles.tabText, selectedTab === 'rising' && styles.tabTextActive]}>
              급상승 크리에이터 🔥
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'falling' && styles.tabActive]}
            onPress={() => setSelectedTab('falling')}
          >
            <Text style={[styles.tabText, selectedTab === 'falling' && styles.tabTextActive]}>
              급하락 크리에이터 ❄️
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'volume' && styles.tabActive]}
            onPress={() => setSelectedTab('volume')}
          >
            <Text style={[styles.tabText, selectedTab === 'volume' && styles.tabTextActive]}>
              거래량 순위
            </Text>
          </TouchableOpacity>
        </View>

        {/* 주식 목록 */}
        <View style={styles.stockList}>
          {stocks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>크리에이터 데이터가 없습니다</Text>
            </View>
          ) : (
            stocks.map((stock, index) => (
              <TouchableOpacity
                key={stock.id}
                style={styles.stockItem}
                onPress={() => navigation.navigate('StockDetail', { stockId: stock.id })}
                accessibilityLabel={`${stock.user?.username || '알 수 없음'}, 현재가 ${stock.sharePrice?.toLocaleString() || 0} PO, ${stock.priceChange >= 0 ? '상승' : '하락'} ${Math.abs(stock.priceChange || 0).toFixed(2)}%`}
                accessibilityRole="button"
                accessibilityHint="상세 정보 보기"
              >
                <View style={styles.stockRank}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                </View>
                <View style={styles.stockAvatar}>
                  <Text style={styles.avatarText}>
                    {stock.user?.username?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={styles.stockInfo}>
                  <Text style={styles.stockName} numberOfLines={1}>
                    {stock.user?.username || '알 수 없음'}
                  </Text>
                  <Text style={styles.stockSymbol}>
                    시총 {formatNumber(stock.marketCapTotal || 0)} PO
                  </Text>
                </View>
                <View style={styles.stockPriceInfo}>
                  <Text style={styles.stockPrice}>{stock.sharePrice?.toLocaleString() || 0} PO</Text>
                  <View style={styles.priceChange}>
                    <Text style={[styles.priceChangeText, { color: getPriceChangeColor(stock.priceChange || 0) }]}>
                      {getPriceChangeIcon(stock.priceChange || 0)} {Math.abs(stock.priceChange || 0).toFixed(2)}%
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: COLORS.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  statsCard: {
    backgroundColor: COLORS.surface,
    padding: 20,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.surface,
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  stockList: {
    backgroundColor: COLORS.surface,
    marginTop: 8,
  },
  stockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stockRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  stockAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  stockInfo: {
    flex: 1,
  },
  stockName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  stockSymbol: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  stockPriceInfo: {
    alignItems: 'flex-end',
  },
  stockPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  priceChange: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: COLORS.background,
  },
  priceChangeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
