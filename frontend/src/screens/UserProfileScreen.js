import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { COLORS } from '../constants/colors';

export default function UserProfileScreen({ route, navigation }) {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  const { userId } = route.params;
  const { user: currentUser } = useAuth();

  const [user, setUser] = useState(null);
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [userResponse, stockResponse] = await Promise.all([
        api.get(`/users/${userId}`),
        api.get(`/stocks/user/${userId}`).catch(() => ({ data: null }))
      ]);

      setUser(userResponse.data);
      setStock(stockResponse.data?.stock || null);
      setIsFollowing(userResponse.data?.isFollowing || false);
    } catch (err) {
      console.error('프로필 로드 오류:', err);
      setError('프로필을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleFollow = async () => {
    try {
      setFollowLoading(true);
      await api.post(`/users/${userId}/follow`);
      setIsFollowing(!isFollowing);
      setUser(prev => ({
        ...prev,
        followersCount: isFollowing ? prev.followersCount - 1 : prev.followersCount + 1
      }));
    } catch (err) {
      Alert.alert('오류', '팔로우 처리에 실패했습니다');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleBuyStock = () => {
    if (stock) {
      navigation.navigate('StockDetail', { stockId: stock.id });
    }
  };

  const handleMessage = () => {
    navigation.navigate('ChatDetail', { recipientId: userId });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>프로필</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>프로필</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchUserProfile}>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) return null;

  const isOwnProfile = currentUser?.id === userId;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{user.username}</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image
            source={{ uri: user.profileImage || 'https://via.placeholder.com/100' }}
            style={styles.profileImage}
          />
          <Text style={styles.displayName}>{user.displayName || user.username}</Text>
          <Text style={styles.username}>@{user.username}</Text>
          {user.bio && <Text style={styles.bio}>{user.bio}</Text>}

          {/* Stats */}
          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{user.postsCount || 0}</Text>
              <Text style={styles.statLabel}>포스트</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{user.followersCount || 0}</Text>
              <Text style={styles.statLabel}>팔로워</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{user.followingCount || 0}</Text>
              <Text style={styles.statLabel}>팔로잉</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          {!isOwnProfile && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.followingButton]}
                onPress={handleFollow}
                disabled={followLoading}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Text style={styles.followButtonText}>
                    {isFollowing ? '팔로잉' : '팔로우'}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
                <Ionicons name="chatbubble-outline" size={20} color={theme.colors.white} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Stock Info */}
        {stock && (
          <TouchableOpacity style={styles.stockCard} onPress={handleBuyStock}>
            <View style={styles.stockHeader}>
              <Text style={styles.stockTitle}>주식 정보</Text>
              <View style={[styles.tierBadge, { backgroundColor: getTierColor(stock.tier) }]}>
                <Text style={styles.tierText}>{stock.tier}</Text>
              </View>
            </View>
            <View style={styles.stockInfo}>
              <View style={styles.stockInfoItem}>
                <Text style={styles.stockLabel}>현재가</Text>
                <Text style={styles.stockValue}>{stock.sharePrice?.toLocaleString()} PO</Text>
              </View>
              <View style={styles.stockInfoItem}>
                <Text style={styles.stockLabel}>변동률</Text>
                <Text style={[
                  styles.stockChange,
                  { color: stock.priceChangePercent >= 0 ? theme.colors.success : theme.colors.error }
                ]}>
                  {stock.priceChangePercent >= 0 ? '+' : ''}{stock.priceChangePercent?.toFixed(2)}%
                </Text>
              </View>
              <View style={styles.stockInfoItem}>
                <Text style={styles.stockLabel}>주주 수</Text>
                <Text style={styles.stockValue}>{stock.shareholderCount || 0}명</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.buyButton} onPress={handleBuyStock}>
              <Text style={styles.buyButtonText}>주식 거래하기</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Badges */}
        {user.badges?.length > 0 && (
          <View style={styles.badgesSection}>
            <Text style={styles.sectionTitle}>보유 뱃지</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {user.badges.map((badge, index) => (
                <View key={index} style={styles.badgeItem}>
                  <Text style={styles.badgeIcon}>{badge.icon}</Text>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getTierColor(tier) {
  const colors = {
    BRONZE: '#B87333',
    SILVER: '#9BA3AF',
    GOLD: '#D9A521',
    PLATINUM: '#6E8CA0',
    DIAMOND: '#3FB6C9',
    MASTER: '#A78BFA',
    LEGEND: '#E85D2A',
  };
  return colors[tier] || theme.colors.textSecondary;
}

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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.white,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: t.colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: t.colors.white,
    fontWeight: '600',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: t.colors.primary,
  },
  displayName: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.white,
    marginTop: 12,
  },
  username: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    marginTop: 4,
  },
  bio: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    paddingHorizontal: 30,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.white,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  followButton: {
    backgroundColor: t.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 20,
  },
  followingButton: {
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  followButtonText: {
    color: t.colors.white,
    fontWeight: '600',
  },
  messageButton: {
    backgroundColor: t.colors.surface,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  stockCard: {
    margin: 16,
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stockTitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.white,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.background,
  },
  stockInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stockInfoItem: {
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  stockValue: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.white,
    marginTop: 4,
  },
  stockChange: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    marginTop: 4,
  },
  buyButton: {
    backgroundColor: t.colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buyButtonText: {
    color: t.colors.white,
    fontWeight: '600',
    fontSize: 17,
    fontFamily: t.fonts.semibold,
  },
  badgesSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.white,
    marginBottom: 12,
  },
  badgeItem: {
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: t.colors.surface,
    padding: 12,
    borderRadius: 12,
    minWidth: 80,
  },
  badgeIcon: {
    fontSize: 24,
    fontFamily: t.fonts.regular,
  },
  badgeName: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    marginTop: 6,
  },
});
