import React, { useState, useEffect, useCallback } from 'react';
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
  Image,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ipoOfferingAPI } from '../services/api';

const IPOListScreen = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offerings, setOfferings] = useState([]);
  const [activeTab, setActiveTab] = useState('subscription'); // subscription, upcoming, ended

  useEffect(() => {
    fetchOfferings();
  }, [activeTab]);

  const fetchOfferings = async () => {
    try {
      const statusMap = {
        subscription: 'subscription',
        upcoming: 'approved',
        ended: 'listed'
      };
      const response = await ipoOfferingAPI.getOfferings({ status: statusMap[activeTab] });
      setOfferings(response.data.offerings || []);
    } catch (error) {
      console.error('Error fetching offerings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOfferings();
  }, [activeTab]);

  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    return num.toLocaleString();
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getTimeRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;

    if (diff <= 0) return '마감';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}일 ${hours}시간 남음`;
    if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
    return `${minutes}분 남음`;
  };

  const getCompetitionColor = (rate) => {
    if (rate >= 300) return '#F0344B';
    if (rate >= 100) return '#F59B00';
    return '#00B368';
  };

  const renderOfferingCard = ({ item }) => {
    const competitionRate = (item.subscribedShares / item.totalShares * 100).toFixed(1);
    const isActive = item.status === 'subscription';

    return (
      <TouchableOpacity
        style={styles.offeringCard}
        onPress={() => navigation.navigate('IPODetail', { offeringId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.issuerInfo}>
            <Image
              source={{ uri: item.issuer?.profileImage || 'https://via.placeholder.com/50' }}
              style={styles.issuerImage}
            />
            <View>
              <Text style={styles.issuerName}>{item.issuer?.displayName || item.issuer?.username}</Text>
              <Text style={styles.issuerCategory}>{item.category || '크리에이터'}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, isActive && styles.statusBadgeActive]}>
            <Text style={[styles.statusText, isActive && styles.statusTextActive]}>
              {isActive ? '청약중' : item.status === 'approved' ? '청약예정' : '마감'}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>공모가</Text>
            <Text style={styles.infoValue}>{formatNumber(item.offeringPrice)} PO</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>공모 수량</Text>
            <Text style={styles.infoValue}>{formatNumber(item.totalShares)}주</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>청약 인원</Text>
            <Text style={styles.infoValue}>{formatNumber(item.subscriberCount)}명</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.competitionSection}>
            <Text style={styles.competitionLabel}>경쟁률</Text>
            <Text style={[styles.competitionRate, { color: getCompetitionColor(parseFloat(competitionRate)) }]}>
              {competitionRate}%
            </Text>
          </View>
          <View style={styles.timeSection}>
            {isActive ? (
              <>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.timeText}>{getTimeRemaining(item.subscriptionEndAt)}</Text>
              </>
            ) : item.status === 'approved' ? (
              <>
                <Ionicons name="calendar-outline" size={16} color="#666" />
                <Text style={styles.timeText}>{formatDate(item.subscriptionStartAt)} 시작</Text>
              </>
            ) : (
              <Text style={styles.timeText}>상장완료</Text>
            )}
          </View>
        </View>

        {/* 경쟁률 바 */}
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(100, parseFloat(competitionRate))}%`,
                backgroundColor: getCompetitionColor(parseFloat(competitionRate))
              }
            ]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>IPO 공모</Text>
        <TouchableOpacity onPress={() => navigation.navigate('IPOEligibility')}>
          <Ionicons name="add-circle-outline" size={24} color="#2B5FE3" />
        </TouchableOpacity>
      </View>

      {/* 탭 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'subscription' && styles.tabActive]}
          onPress={() => setActiveTab('subscription')}
        >
          <Text style={[styles.tabText, activeTab === 'subscription' && styles.tabTextActive]}>
            청약중
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            청약예정
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ended' && styles.tabActive]}
          onPress={() => setActiveTab('ended')}
        >
          <Text style={[styles.tabText, activeTab === 'ended' && styles.tabTextActive]}>
            상장완료
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B5FE3" />
        </View>
      ) : offerings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {activeTab === 'subscription' ? '진행 중인 공모가 없습니다' :
              activeTab === 'upcoming' ? '예정된 공모가 없습니다' : '상장 완료된 공모가 없습니다'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={offerings}
          keyExtractor={(item) => item.id}
          renderItem={renderOfferingCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
};

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.backgroundSecondary,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: t.colors.primary,
  },
  tabText: {
    fontSize: 15,
    color: '#666',
  },
  tabTextActive: {
    color: t.colors.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  listContent: {
    padding: 16,
  },
  offeringCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  issuerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  issuerImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: t.colors.backgroundSecondary,
  },
  issuerName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  issuerCategory: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: t.colors.backgroundSecondary,
  },
  statusBadgeActive: {
    backgroundColor: t.colors.successBackground,
  },
  statusText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  statusTextActive: {
    color: t.colors.success,
  },
  cardBody: {
    backgroundColor: t.colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  competitionSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  competitionLabel: {
    fontSize: 14,
    color: '#666',
  },
  competitionRate: {
    fontSize: 24,
    fontWeight: '700',
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 13,
    color: '#666',
  },
  progressContainer: {
    height: 4,
    backgroundColor: t.colors.backgroundSecondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});

export default IPOListScreen;
