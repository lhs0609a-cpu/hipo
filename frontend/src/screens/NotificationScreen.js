import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import useThemedStyles from '../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../constants/colors';

const NOTIFICATION_TABS = [
  { key: 'all', label: '전체', icon: 'notifications-outline' },
  { key: 'trade', label: '거래', icon: 'swap-horizontal-outline' },
  { key: 'dividend', label: '배당', icon: 'cash-outline' },
  { key: 'social', label: '소셜', icon: 'people-outline' },
];

const NOTIFICATION_CONFIG = {
  trade: {
    icon: 'swap-horizontal',
    color: COLORS.primary,
    bgColor: COLORS.primaryBackground,
  },
  buy: {
    icon: 'arrow-up-circle',
    color: COLORS.up,
    bgColor: COLORS.stockUpBackground,
  },
  sell: {
    icon: 'arrow-down-circle',
    color: COLORS.down,
    bgColor: COLORS.stockDownBackground,
  },
  dividend: {
    icon: 'cash',
    color: '#F59B00',
    bgColor: '#FFF6E6',
  },
  price_alert: {
    icon: 'trending-up',
    color: COLORS.up,
    bgColor: COLORS.stockUpBackground,
  },
  follow: {
    icon: 'person-add',
    color: '#8B5CF6',
    bgColor: '#F2EEFE',
  },
  like: {
    icon: 'heart',
    color: '#EC5F9E',
    bgColor: '#FDEEF5',
  },
  comment: {
    icon: 'chatbubble',
    color: '#2B5FE3',
    bgColor: '#EEF4FF',
  },
  system: {
    icon: 'megaphone',
    color: COLORS.textSecondary,
    bgColor: COLORS.gray100,
  },
  welcome: {
    icon: 'gift',
    color: '#D9A521',
    bgColor: '#FFF6E6',
  },
  default: {
    icon: 'notifications',
    color: COLORS.textSecondary,
    bgColor: COLORS.gray100,
  },
};

const NotificationScreen = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const fetchNotifications = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await notificationAPI.getAll();
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      let errorMessage = '알림을 불러올 수 없습니다';
      if (error.response) {
        errorMessage = error.response.data?.message || `서버 오류 (${error.response.status})`;
      } else if (error.request) {
        errorMessage = '서버에 연결할 수 없습니다.\n인터넷 연결을 확인해주세요.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [isAuthenticated]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(notifications.map(notif => {
        if (notif.id === id) {
          return { ...notif, isRead: true };
        }
        return notif;
      }));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(notifications.map(notif => ({
        ...notif,
        isRead: true,
      })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationConfig = (type) => {
    return NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG.default;
  };

  const getFilteredNotifications = () => {
    if (activeTab === 'all') return notifications;
    if (activeTab === 'trade') {
      return notifications.filter(n => ['trade', 'buy', 'sell', 'price_alert'].includes(n.type));
    }
    if (activeTab === 'dividend') {
      return notifications.filter(n => n.type === 'dividend');
    }
    if (activeTab === 'social') {
      return notifications.filter(n => ['follow', 'like', 'comment'].includes(n.type));
    }
    return notifications;
  };

  const groupNotificationsByDate = (notifs) => {
    const groups = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    notifs.forEach(notif => {
      const date = new Date(notif.createdAt || notif.created_at);
      date.setHours(0, 0, 0, 0);

      let key;
      if (date.getTime() === today.getTime()) {
        key = '오늘';
      } else if (date.getTime() === yesterday.getTime()) {
        key = '어제';
      } else {
        key = date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(notif);
    });

    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  const renderNotificationItem = ({ item }) => {
    const config = getNotificationConfig(item.type);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.isRead && styles.unreadItem,
        ]}
        onPress={() => handleMarkAsRead(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
          <Ionicons name={config.icon} size={22} color={config.color} />
        </View>
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationTitle, !item.isRead && styles.unreadText]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.notificationTime}>
              {getTimeAgo(item.createdAt || item.created_at)}
            </Text>
          </View>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          {/* 거래/배당 알림의 경우 금액 하이라이트 */}
          {(item.type === 'trade' || item.type === 'buy' || item.type === 'sell' || item.type === 'dividend') && item.amount && (
            <View style={styles.amountBadge}>
              <Text style={[styles.amountText, { color: config.color }]}>
                {item.type === 'buy' ? '-' : '+'}{item.amount?.toLocaleString()} PO
              </Text>
            </View>
          )}
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2B5FE3" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Text style={styles.headerTitle}>알림</Text>
        </View>
        <View style={styles.loginRequiredContainer}>
          <Ionicons name="notifications-outline" style={styles.loginRequiredIcon} />
          <Text style={styles.loginRequiredTitle}>로그인이 필요합니다</Text>
          <Text style={styles.loginRequiredText}>
            알림을 확인하려면{'\n'}로그인해주세요.
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

  if (error) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Text style={styles.headerTitle}>알림</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" style={styles.errorIcon} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchNotifications}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const filteredNotifications = getFilteredNotifications();
  const sections = groupNotificationsByDate(filteredNotifications);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>알림</Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
              <Ionicons name="checkmark-done" size={18} color="#fff" />
              <Text style={styles.markAllText}>모두 읽음</Text>
            </TouchableOpacity>
          )}
        </View>
        {unreadCount > 0 && (
          <Text style={styles.headerSubtitle}>읽지 않은 알림 {unreadCount}개</Text>
        )}
      </View>

      {/* 탭 필터 */}
      <View style={styles.tabContainer}>
        {NOTIFICATION_TABS.map((tab) => {
          const tabCount = tab.key === 'all'
            ? notifications.length
            : tab.key === 'trade'
              ? notifications.filter(n => ['trade', 'buy', 'sell', 'price_alert'].includes(n.type)).length
              : tab.key === 'dividend'
                ? notifications.filter(n => n.type === 'dividend').length
                : notifications.filter(n => ['follow', 'like', 'comment'].includes(n.type)).length;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon}
                size={18}
                color={activeTab === tab.key ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                {tab.label}
              </Text>
              {tabCount > 0 && (
                <View style={[styles.tabBadge, activeTab === tab.key && styles.activeTabBadge]}>
                  <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.activeTabBadgeText]}>
                    {tabCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <SectionList
        sections={sections}
        renderItem={renderNotificationItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id?.toString()}
        contentContainerStyle={styles.listContainer}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="notifications-off-outline" size={48} color={theme.colors.textTertiary} />
            </View>
            <Text style={styles.emptyText}>
              {activeTab === 'all' ? '알림이 없습니다' : `${NOTIFICATION_TABS.find(t => t.key === activeTab)?.label} 알림이 없습니다`}
            </Text>
            <Text style={styles.emptySubtext}>새로운 소식이 있으면 알려드릴게요</Text>
          </View>
        }
      />
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
    backgroundColor: t.colors.background,
  },
  header: {
    backgroundColor: t.colors.primary,
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.surface,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  markAllText: {
    fontSize: 12,
    fontFamily: t.fonts.medium,
    color: t.colors.surface,
    fontWeight: '500',
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: t.colors.gray100,
    gap: 4,
  },
  activeTab: {
    backgroundColor: t.colors.primaryBackground,
  },
  tabText: {
    fontSize: 12,
    fontFamily: t.fonts.medium,
    fontWeight: '500',
    color: t.colors.textSecondary,
  },
  activeTabText: {
    color: t.colors.primary,
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: t.colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  activeTabBadge: {
    backgroundColor: t.colors.primary,
  },
  tabBadgeText: {
    fontSize: 11,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textSecondary,
  },
  activeTabBadgeText: {
    color: t.colors.surface,
  },
  // Section styles
  sectionHeader: {
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textSecondary,
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  notificationItem: {
    backgroundColor: t.colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  unreadItem: {
    backgroundColor: t.colors.primaryBackground,
    borderWidth: 1,
    borderColor: t.colors.primary + '30',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: t.fonts.regular,
    color: t.colors.text,
    marginRight: 8,
  },
  unreadText: {
    fontWeight: '600',
  },
  notificationMessage: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 11,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
  },
  amountBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: t.colors.gray100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  amountText: {
    fontSize: 14,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: t.colors.primary,
    marginLeft: 8,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: t.colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    textAlign: 'center',
  },
  loginRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: t.colors.background,
  },
  loginRequiredIcon: {
    fontSize: 64,
    fontFamily: t.fonts.regular,
    marginBottom: 20,
  },
  loginRequiredTitle: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.text,
    marginBottom: 12,
  },
  loginRequiredText: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: t.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 12,
  },
  loginButtonText: {
    color: t.colors.surface,
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: t.colors.background,
  },
  errorIcon: {
    fontSize: 48,
    fontFamily: t.fonts.regular,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: t.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  retryButtonText: {
    color: t.colors.surface,
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
});

export default NotificationScreen;
