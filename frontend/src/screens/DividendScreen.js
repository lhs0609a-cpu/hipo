import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { dividendAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const DividendScreen = ({ navigation }) => {
  const { isAuthenticated } = useAuth();
  const [dividends, setDividends] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('history');
  const [totalDividend, setTotalDividend] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDividends();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchDividends = async () => {
    try {
      const [historyRes, upcomingRes] = await Promise.all([
        dividendAPI.getHistory(),
        dividendAPI.getUpcoming(),
      ]);
      setDividends(historyRes.data.dividends || []);
      setUpcoming(upcomingRes.data.upcoming || []);

      const total = (historyRes.data.dividends || []).reduce(
        (sum, d) => sum + (d.amount || 0), 0
      );
      setTotalDividend(total);
    } catch (error) {
      console.error('Error fetching dividends:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderDividendItem = ({ item }) => (
    <View style={styles.dividendItem}>
      <View style={styles.dividendLeft}>
        <View style={styles.stockAvatar}>
          <Text style={styles.avatarText}>
            {(item.stock?.issuer?.displayName || 'S').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.dividendInfo}>
          <Text style={styles.stockName}>
            {item.stock?.issuer?.displayName || item.stock?.issuer?.username || '주식'}
          </Text>
          <Text style={styles.dividendDate}>
            {new Date(item.paidAt || item.createdAt).toLocaleDateString('ko-KR')}
          </Text>
        </View>
      </View>
      <View style={styles.dividendRight}>
        <Text style={styles.dividendAmount}>+{(item.amount || 0).toLocaleString()}원</Text>
        <Text style={styles.dividendShares}>{item.shares || 0}주 보유</Text>
      </View>
    </View>
  );

  const renderUpcomingItem = ({ item }) => (
    <View style={styles.upcomingItem}>
      <View style={styles.upcomingLeft}>
        <View style={styles.stockAvatar}>
          <Text style={styles.avatarText}>
            {(item.stock?.issuer?.displayName || 'S').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.dividendInfo}>
          <Text style={styles.stockName}>
            {item.stock?.issuer?.displayName || item.stock?.issuer?.username || '주식'}
          </Text>
          <Text style={styles.upcomingDate}>
            {new Date(item.scheduledAt).toLocaleDateString('ko-KR')} 지급 예정
          </Text>
        </View>
      </View>
      <View style={styles.dividendRight}>
        <Text style={styles.expectedAmount}>
          예상 {(item.expectedAmount || 0).toLocaleString()}원
        </Text>
        <Text style={styles.dividendRate}>{item.rate || 0}% 배당률</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>배당 내역</Text>
        </View>
        <View style={styles.loginRequiredContainer}>
          <Text style={styles.loginRequiredIcon}>💰</Text>
          <Text style={styles.loginRequiredTitle}>로그인이 필요합니다</Text>
          <Text style={styles.loginRequiredText}>
            배당 내역을 확인하려면{'\n'}로그인해주세요.
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>로그인하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>배당 내역</Text>
        <Text style={styles.headerSubtitle}>총 수령 배당금</Text>
        <Text style={styles.totalAmount}>{totalDividend.toLocaleString()}원</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            배당 내역
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            예정 배당
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === 'history' ? dividends : upcoming}
        renderItem={activeTab === 'history' ? renderDividendItem : renderUpcomingItem}
        keyExtractor={(item) => item.id?.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchDividends} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💵</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'history' ? '배당 내역이 없습니다' : '예정된 배당이 없습니다'}
            </Text>
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
    backgroundColor: '#4CAF50',
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 12,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 4,
    margin: 16,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#4CAF50',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  dividendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  upcomingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  dividendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  upcomingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stockAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dividendInfo: {
    flex: 1,
  },
  stockName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  dividendDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  upcomingDate: {
    fontSize: 13,
    color: '#4CAF50',
    marginTop: 2,
  },
  dividendRight: {
    alignItems: 'flex-end',
  },
  dividendAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  expectedAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dividendShares: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  dividendRate: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  loginRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loginRequiredIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  loginRequiredTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  loginRequiredText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default DividendScreen;
