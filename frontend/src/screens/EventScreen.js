import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';

const EventScreen = ({ navigation }) => {
  const [events, setEvents] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('events');

  // 더미 데이터 (실제로는 API에서 가져옴)
  const dummyEvents = [
    {
      id: 1,
      title: '신규 가입 이벤트',
      description: '신규 가입 시 10,000 HIPO 포인트 지급!',
      image: null,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      isActive: true,
    },
    {
      id: 2,
      title: '첫 거래 보너스',
      description: '첫 주식 거래 시 거래 수수료 무료!',
      image: null,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      isActive: true,
    },
    {
      id: 3,
      title: '친구 초대 이벤트',
      description: '친구 초대 시 양측 모두 5,000 포인트!',
      image: null,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      isActive: true,
    },
  ];

  const dummyNews = [
    {
      id: 1,
      title: 'HIPO 플랫폼 정식 출시',
      summary: '크리에이터 주식 거래 플랫폼 HIPO가 정식으로 출시되었습니다.',
      date: '2024-01-15',
      category: '공지',
    },
    {
      id: 2,
      title: '새로운 크리에이터 상장 안내',
      summary: '이번 주 5명의 새로운 크리에이터가 상장됩니다.',
      date: '2024-01-14',
      category: '상장',
    },
    {
      id: 3,
      title: '배당금 지급 일정 안내',
      summary: '이번 달 배당금은 25일에 지급됩니다.',
      date: '2024-01-13',
      category: '배당',
    },
    {
      id: 4,
      title: '앱 업데이트 안내',
      summary: '새로운 기능이 추가된 버전 1.1.0이 출시되었습니다.',
      date: '2024-01-12',
      category: '업데이트',
    },
  ];

  const fetchData = async () => {
    try {
      // 실제로는 API 호출
      // const eventsRes = await api.get('/events');
      // const newsRes = await api.get('/news');

      // 더미 데이터 사용
      setTimeout(() => {
        setEvents(dummyEvents);
        setNews(dummyNews);
        setLoading(false);
        setRefreshing(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const getCategoryColor = (category) => {
    switch (category) {
      case '공지':
        return '#007AFF';
      case '상장':
        return '#4CAF50';
      case '배당':
        return '#FF9800';
      case '업데이트':
        return '#9C27B0';
      default:
        return '#666';
    }
  };

  const renderEventItem = ({ item }) => (
    <TouchableOpacity style={styles.eventCard}>
      <View style={styles.eventImagePlaceholder}>
        <Text style={styles.eventEmoji}>🎉</Text>
      </View>
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          {item.isActive && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>진행중</Text>
            </View>
          )}
        </View>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.eventDate}>
          {item.startDate} ~ {item.endDate}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderNewsItem = ({ item }) => (
    <TouchableOpacity style={styles.newsCard}>
      <View style={styles.newsHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
        <Text style={styles.newsDate}>{item.date}</Text>
      </View>
      <Text style={styles.newsTitle}>{item.title}</Text>
      <Text style={styles.newsSummary} numberOfLines={2}>
        {item.summary}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>이벤트 & 뉴스</Text>
        <Text style={styles.headerSubtitle}>HIPO의 새로운 소식</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'events' && styles.activeTab]}
          onPress={() => setActiveTab('events')}
        >
          <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>
            이벤트
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'news' && styles.activeTab]}
          onPress={() => setActiveTab('news')}
        >
          <Text style={[styles.tabText, activeTab === 'news' && styles.activeTabText]}>
            뉴스
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'events' ? (
        <FlatList
          data={events}
          renderItem={renderEventItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎈</Text>
              <Text style={styles.emptyText}>진행 중인 이벤트가 없습니다</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={news}
          renderItem={renderNewsItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📰</Text>
              <Text style={styles.emptyText}>뉴스가 없습니다</Text>
            </View>
          }
        />
      )}
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 4,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#007AFF',
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
    padding: 16,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventImagePlaceholder: {
    height: 120,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventEmoji: {
    fontSize: 48,
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  activeBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 13,
    color: '#999',
  },
  newsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  newsDate: {
    fontSize: 13,
    color: '#999',
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  newsSummary: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
});

export default EventScreen;
