import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { tierAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// 티어 색상 정의
const TIER_COLORS = {
  BRONZE: ['#CD7F32', '#8B4513'],
  SILVER: ['#C0C0C0', '#808080'],
  GOLD: ['#FFD700', '#DAA520'],
  PLATINUM: ['#E5E4E2', '#B0B0B0'],
  DIAMOND: ['#B9F2FF', '#87CEEB'],
  MASTER: ['#9B59B6', '#8E44AD'],
  LEGEND: ['#FF6B6B', '#EE5A5A'],
};

const TABS = [
  { key: 'overview', label: '개요' },
  { key: 'ranking', label: '랭킹' },
  { key: 'benefits', label: '혜택' },
];

export default function TierInfoScreen({ navigation, route }) {
  const { user } = useAuth();
  const initialTab = route?.params?.tab || 'overview';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myTierInfo, setMyTierInfo] = useState(null);
  const [allTiers, setAllTiers] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [ranking, setRanking] = useState([]);
  const [updating, setUpdating] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);

      // 전체 티어 정보 조회
      const [tiersRes, statsRes] = await Promise.all([
        tierAPI.getAllTiers(),
        tierAPI.getStatistics(),
      ]);

      if (tiersRes.data.success) {
        setAllTiers(tiersRes.data.tiers);
      }

      if (statsRes.data.success) {
        setStatistics(statsRes.data.statistics);
      }

      // 로그인한 경우 내 티어 정보 조회
      if (user) {
        try {
          const myTierRes = await tierAPI.getMyTierInfo();
          if (myTierRes.data.success) {
            setMyTierInfo(myTierRes.data);
          }
        } catch (error) {
          // 상장하지 않은 사용자
          setMyTierInfo(null);
        }
      }

      // 랭킹 조회
      const rankingRes = await tierAPI.getRanking({ limit: 30 });
      if (rankingRes.data.success) {
        setRanking(rankingRes.data.ranking);
      }
    } catch (error) {
      console.error('티어 정보 조회 오류:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTierUpdate = async () => {
    if (updating) return;
    setUpdating(true);

    try {
      const response = await tierAPI.requestTierUpdate();
      if (response.data.success) {
        alert(response.data.message);
        fetchData(true);
      } else {
        alert(response.data.message || '업데이트에 실패했습니다.');
      }
    } catch (error) {
      const message = error.response?.data?.message || '업데이트에 실패했습니다.';
      alert(message);
    } finally {
      setUpdating(false);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 100000000) return `${(num / 100000000).toFixed(1)}억`;
    if (num >= 10000) return `${(num / 10000).toFixed(1)}만`;
    return num.toLocaleString('ko-KR');
  };

  const renderMyTierCard = () => {
    if (!myTierInfo) {
      return (
        <View style={styles.noTierCard}>
          <Text style={styles.noTierIcon}>📊</Text>
          <Text style={styles.noTierTitle}>상장 후 확인 가능</Text>
          <Text style={styles.noTierDesc}>상장하면 티어 정보를 확인할 수 있습니다</Text>
          <TouchableOpacity
            style={styles.ipoButton}
            onPress={() => navigation.navigate('IPOManagement')}
          >
            <Text style={styles.ipoButtonText}>상장하러 가기</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const tierInfo = myTierInfo.tier?.info || {};
    const progress = myTierInfo.progress || {};
    const colors = TIER_COLORS[myTierInfo.tier?.current] || TIER_COLORS.BRONZE;

    return (
      <LinearGradient colors={colors} style={styles.myTierCard}>
        <View style={styles.myTierHeader}>
          <Text style={styles.tierIcon}>{tierInfo.icon}</Text>
          <View style={styles.tierTitleArea}>
            <Text style={styles.myTierName}>{tierInfo.displayName}</Text>
            <Text style={styles.myTierScore}>
              티어 점수: {formatNumber(myTierInfo.tier?.score)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.updateButton, updating && styles.updateButtonDisabled]}
            onPress={handleTierUpdate}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.updateButtonText}>갱신</Text>
            )}
          </TouchableOpacity>
        </View>

        {!progress.isMaxTier && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>다음 티어: {progress.nextTier}</Text>
              <Text style={styles.progressPercent}>{progress.progressPercent}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, parseFloat(progress.progressPercent || 0))}%` },
                ]}
              />
            </View>
            <Text style={styles.scoreNeeded}>
              {formatNumber(progress.scoreNeeded)}점 더 필요
            </Text>
          </View>
        )}

        {progress.isMaxTier && (
          <View style={styles.maxTierBadge}>
            <Text style={styles.maxTierText}>최고 티어 달성!</Text>
          </View>
        )}
      </LinearGradient>
    );
  };

  const renderScoreBreakdown = () => {
    if (!myTierInfo?.scoreBreakdown) return null;

    const breakdown = myTierInfo.scoreBreakdown;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>점수 상세</Text>
        {Object.entries(breakdown).map(([key, item]) => (
          <View key={key} style={styles.breakdownItem}>
            <View style={styles.breakdownHeader}>
              <Text style={styles.breakdownLabel}>{item.label}</Text>
              <Text style={styles.breakdownScore}>
                {formatNumber(item.score)} / {formatNumber(item.maxScore)}
              </Text>
            </View>
            <View style={styles.breakdownBar}>
              <View
                style={[
                  styles.breakdownFill,
                  { width: `${Math.min(100, (item.score / item.maxScore) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.breakdownValue}>
              {key === 'listing' ? `${item.value}일` : formatNumber(item.value)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderTierList = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>전체 티어</Text>
      {allTiers.map((tier) => {
        const colors = TIER_COLORS[tier.name] || TIER_COLORS.BRONZE;
        const stats = statistics[tier.name] || {};

        return (
          <LinearGradient
            key={tier.name}
            colors={[colors[0] + '30', colors[1] + '30']}
            style={styles.tierItem}
          >
            <View style={styles.tierItemHeader}>
              <Text style={styles.tierItemIcon}>{tier.icon}</Text>
              <View style={styles.tierItemInfo}>
                <Text style={styles.tierItemName}>{tier.displayName}</Text>
                <Text style={styles.tierItemReq}>최소 {formatNumber(tier.minScore)}점</Text>
              </View>
              <View style={styles.tierItemStats}>
                <Text style={styles.tierItemCount}>{stats.count || 0}명</Text>
              </View>
            </View>
            <View style={styles.tierItemBenefits}>
              <Text style={styles.benefitText}>
                발행 한도: {formatNumber(tier.maxShares)}주
              </Text>
              <Text style={styles.benefitText}>
                수수료: {(tier.tradingFeeRate * 100).toFixed(2)}%
              </Text>
              {tier.dividendBonus > 0 && (
                <Text style={styles.benefitText}>
                  배당 보너스: +{(tier.dividendBonus * 100).toFixed(0)}%
                </Text>
              )}
            </View>
          </LinearGradient>
        );
      })}
    </View>
  );

  const renderRankingItem = ({ item, index }) => {
    const stock = item.stock;
    const tierInfo = stock.tierInfo || {};
    const colors = TIER_COLORS[stock.tier] || TIER_COLORS.BRONZE;

    return (
      <TouchableOpacity
        style={styles.rankingItem}
        onPress={() => navigation.navigate('StockDetail', { stockId: stock.id })}
      >
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{item.rank}</Text>
        </View>
        <Image
          source={{ uri: stock.issuer?.profileImage || 'https://via.placeholder.com/50' }}
          style={styles.rankingAvatar}
        />
        <View style={styles.rankingInfo}>
          <Text style={styles.rankingName}>{stock.issuer?.displayName || '알 수 없음'}</Text>
          <View style={styles.rankingMeta}>
            <View style={[styles.tierBadge, { backgroundColor: colors[0] + '40' }]}>
              <Text style={styles.tierBadgeText}>{tierInfo.icon} {tierInfo.displayName}</Text>
            </View>
            <Text style={styles.rankingScore}>{formatNumber(stock.tierScore)}점</Text>
          </View>
        </View>
        <View style={styles.rankingStats}>
          <Text style={styles.rankingPrice}>{formatNumber(stock.sharePrice)}원</Text>
          <Text
            style={[
              styles.rankingChange,
              { color: stock.priceChangePercent >= 0 ? '#4CAF50' : '#f44336' },
            ]}
          >
            {stock.priceChangePercent >= 0 ? '+' : ''}
            {stock.priceChangePercent?.toFixed(2)}%
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderBenefitsTab = () => (
    <ScrollView style={styles.benefitsContainer}>
      {allTiers.map((tier) => {
        const colors = TIER_COLORS[tier.name] || TIER_COLORS.BRONZE;

        return (
          <View key={tier.name} style={styles.benefitCard}>
            <LinearGradient colors={colors} style={styles.benefitCardHeader}>
              <Text style={styles.benefitTierIcon}>{tier.icon}</Text>
              <Text style={styles.benefitTierName}>{tier.displayName}</Text>
            </LinearGradient>
            <View style={styles.benefitCardBody}>
              <View style={styles.benefitRow}>
                <Text style={styles.benefitLabel}>최대 발행량</Text>
                <Text style={styles.benefitValue}>{formatNumber(tier.maxShares)}주</Text>
              </View>
              <View style={styles.benefitRow}>
                <Text style={styles.benefitLabel}>거래 수수료</Text>
                <Text style={styles.benefitValue}>{(tier.tradingFeeRate * 100).toFixed(2)}%</Text>
              </View>
              <View style={styles.benefitRow}>
                <Text style={styles.benefitLabel}>배당 보너스</Text>
                <Text style={styles.benefitValue}>
                  {tier.dividendBonus > 0 ? `+${(tier.dividendBonus * 100).toFixed(0)}%` : '-'}
                </Text>
              </View>
              <View style={styles.benefitRow}>
                <Text style={styles.benefitLabel}>노출 가중치</Text>
                <Text style={styles.benefitValue}>x{tier.exposureBoost}</Text>
              </View>
              <View style={styles.benefitsList}>
                <Text style={styles.benefitsListTitle}>혜택</Text>
                {tier.benefits?.map((benefit, idx) => (
                  <Text key={idx} style={styles.benefitItem}>• {benefit}</Text>
                ))}
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>상장 티어</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 탭 */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
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

      {/* 컨텐츠 */}
      {activeTab === 'overview' && (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              tintColor="#4CAF50"
            />
          }
        >
          {renderMyTierCard()}
          {myTierInfo && renderScoreBreakdown()}
          {renderTierList()}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {activeTab === 'ranking' && (
        <FlatList
          data={ranking}
          renderItem={renderRankingItem}
          keyExtractor={(item) => item.stock.id}
          contentContainerStyle={styles.rankingList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              tintColor="#4CAF50"
            />
          }
        />
      )}

      {activeTab === 'benefits' && renderBenefitsTab()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 4,
  },
  backButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  myTierCard: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  myTierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  tierTitleArea: {
    flex: 1,
  },
  myTierName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  myTierScore: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  updateButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  updateButtonDisabled: {
    opacity: 0.5,
  },
  updateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  progressSection: {
    marginTop: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  progressPercent: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  scoreNeeded: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
  },
  maxTierBadge: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: 'center',
  },
  maxTierText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  noTierCard: {
    margin: 16,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  noTierIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noTierTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  noTierDesc: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  ipoButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  ipoButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  breakdownItem: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#888',
  },
  breakdownScore: {
    fontSize: 13,
    color: '#4CAF50',
  },
  breakdownBar: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  breakdownValue: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  tierItem: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  tierItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierItemIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  tierItemInfo: {
    flex: 1,
  },
  tierItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  tierItemReq: {
    fontSize: 12,
    color: '#aaa',
  },
  tierItemStats: {
    alignItems: 'flex-end',
  },
  tierItemCount: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  tierItemBenefits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  benefitText: {
    fontSize: 11,
    color: '#aaa',
    marginRight: 12,
  },
  rankingList: {
    padding: 16,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  rankingAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#333',
  },
  rankingInfo: {
    flex: 1,
  },
  rankingName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  rankingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  tierBadgeText: {
    fontSize: 11,
    color: '#fff',
  },
  rankingScore: {
    fontSize: 12,
    color: '#888',
  },
  rankingStats: {
    alignItems: 'flex-end',
  },
  rankingPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  rankingChange: {
    fontSize: 12,
    marginTop: 2,
  },
  benefitsContainer: {
    flex: 1,
    padding: 16,
  },
  benefitCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  benefitCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  benefitTierIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  benefitTierName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  benefitCardBody: {
    padding: 16,
    paddingTop: 0,
  },
  benefitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  benefitLabel: {
    fontSize: 14,
    color: '#888',
  },
  benefitValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  benefitsList: {
    marginTop: 12,
  },
  benefitsListTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
  },
  benefitItem: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 4,
  },
});
