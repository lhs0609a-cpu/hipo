import React, { useState, useEffect } from 'react';
import { getAppWidth, getAppHeight } from '../utils/appWidth';
import { useTheme } from '../contexts/ThemeContext';
import useThemedStyles from '../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSavedUser } from '../api/auth';
import { getUserProfile, followUser } from '../api/users';
import api from '../api/client';
import Button from '../components/Button';
import { SectionCard, ListItem, StatsCard } from '../components/Card';

const screenWidth = getAppWidth();

export default function ProfileScreen({ navigation, route }) {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [stockData, setStockData] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeType, setTradeType] = useState('buy');
  const [quantity, setQuantity] = useState('');
  const [tradeLoading, setTradeLoading] = useState(false);
  const userId = route?.params?.userId;

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const currentUserData = await getSavedUser();
      setCurrentUser(currentUserData);

      if (userId && userId !== currentUserData.id) {
        const profileData = await getUserProfile(userId);
        setUser(profileData.user);
        await loadStockData(userId);
      } else {
        setUser(currentUserData);
        await loadStockData(currentUserData.id);
      }
    } catch (error) {
      console.error('Profile load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStockData = async (targetUserId) => {
    try {
      const stockResponse = await api.get(`/stocks/user/${targetUserId}`);
      if (stockResponse.data.success && stockResponse.data.stock) {
        setStockData(stockResponse.data.stock);

        const historyResponse = await api.get(`/stocks/${stockResponse.data.stock.id}/history`, {
          params: { timeframe: '7d' }
        });

        if (historyResponse.data.success && historyResponse.data.history) {
          setPriceHistory(historyResponse.data.history);
        }
      }
    } catch (error) {
      console.error('Stock data load error:', error);
    }
  };

  const handleFollow = async () => {
    try {
      setFollowLoading(true);
      const result = await followUser(user.id);

      setUser({
        ...user,
        isFollowing: result.isFollowing,
        followersCount: result.isFollowing ? user.followersCount + 1 : user.followersCount - 1
      });
    } catch (error) {
      console.error('Follow error:', error);
      Alert.alert('오류', '팔로우 처리 중 오류가 발생했습니다');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleTrade = async () => {
    if (!quantity || parseFloat(quantity) <= 0) {
      Alert.alert('알림', '수량을 입력해주세요');
      return;
    }

    try {
      setTradeLoading(true);
      const endpoint = tradeType === 'buy' ? '/stocks/buy' : '/stocks/sell';

      const response = await api.post(endpoint, {
        stockId: stockData.id,
        quantity: parseInt(quantity),
      });

      if (response.data.success) {
        if (tradeType === 'buy' && !user.isFollowing) {
          try {
            await api.post(`/users/${userId}/follow`);
            setUser({
              ...user,
              isFollowing: true,
              followersCount: (user.followersCount || 0) + 1
            });
          } catch (followError) {
            console.error('Auto follow error:', followError);
          }
        }

        Alert.alert(
          '완료',
          tradeType === 'buy'
            ? `${quantity}주를 매수했습니다`
            : `${quantity}주를 매도했습니다`
        );

        setShowTradeModal(false);
        setQuantity('');
        loadProfile();
      }
    } catch (error) {
      console.error('Trade error:', error);
      Alert.alert('오류', error.response?.data?.error || '거래 처리 중 오류가 발생했습니다');
    } finally {
      setTradeLoading(false);
    }
  };

  const openTradeModal = (type) => {
    setTradeType(type);
    setQuantity('');
    setShowTradeModal(true);
  };

  const handleLogout = async () => {
    Alert.alert(
      '로그아웃',
      '로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          onPress: async () => {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            if (Platform.OS === 'web') {
              window.location.href = '/';
            } else {
              navigation.replace('Auth');
            }
          },
        },
      ]
    );
  };

  if (loading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const isOwnProfile = !userId || userId === currentUser?.id;
  const priceChange = stockData?.priceChangePercent || 0;
  const isUp = priceChange >= 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.username?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            {user.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon}>✓</Text>
              </View>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.username}>{user.username}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        </View>

        {!isOwnProfile && (
          <Button
            variant={user.isFollowing ? 'outline' : 'primary'}
            size="sm"
            loading={followLoading}
            onPress={handleFollow}
            style={styles.followButton}
          >
            {user.isFollowing ? '팔로잉' : '팔로우'}
          </Button>
        )}
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user.postsCount || 0}</Text>
          <Text style={styles.statLabel}>게시물</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user.followersCount || 0}</Text>
          <Text style={styles.statLabel}>팔로워</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user.followingCount || 0}</Text>
          <Text style={styles.statLabel}>팔로잉</Text>
        </View>
      </View>

      {/* Stock Info Section */}
      {stockData && (
        <SectionCard title="주식 정보">
          <View style={styles.stockCard}>
            <View style={styles.stockPriceRow}>
              <View>
                <Text style={styles.stockLabel}>현재가</Text>
                <Text style={styles.stockPrice}>{stockData.sharePrice?.toLocaleString() || 0} P</Text>
              </View>
              <View style={[
                styles.changeBadge,
                { backgroundColor: isUp ? theme.colors.stockUpBackground : theme.colors.stockDownBackground }
              ]}>
                <Text style={[
                  styles.changeText,
                  { color: isUp ? theme.colors.stockUp : theme.colors.stockDown }
                ]}>
                  {isUp ? '+' : ''}{priceChange.toFixed(2)}%
                </Text>
              </View>
            </View>

            <View style={styles.stockMetaRow}>
              <View style={styles.stockMetaItem}>
                <Text style={styles.stockMetaLabel}>시가총액</Text>
                <Text style={styles.stockMetaValue}>{(stockData.marketCapTotal || 0).toLocaleString()} P</Text>
              </View>
              <View style={styles.stockMetaItem}>
                <Text style={styles.stockMetaLabel}>발행 주식</Text>
                <Text style={styles.stockMetaValue}>{stockData.totalShares?.toLocaleString() || 0}주</Text>
              </View>
              <View style={styles.stockMetaItem}>
                <Text style={styles.stockMetaLabel}>보유자</Text>
                <Text style={styles.stockMetaValue}>{stockData.holderCount || 0}명</Text>
              </View>
            </View>

            {/* Price Chart */}
            {priceHistory.length > 0 && (
              <View style={styles.chartSection}>
                <Text style={styles.chartTitle}>7일 추이</Text>
                <LineChart
                  data={{
                    labels: [],
                    datasets: [{
                      data: priceHistory.map((item) => item.price),
                    }],
                  }}
                  width={screenWidth - 80}
                  height={120}
                  withDots={false}
                  withInnerLines={false}
                  withOuterLines={false}
                  withVerticalLabels={false}
                  withHorizontalLabels={false}
                  chartConfig={{
                    backgroundColor: 'transparent',
                    backgroundGradientFrom: theme.colors.gray50,
                    backgroundGradientTo: theme.colors.gray50,
                    decimalPlaces: 0,
                    color: () => isUp ? theme.colors.stockUp : theme.colors.stockDown,
                    strokeWidth: 2,
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>
            )}

            {/* Trade Buttons */}
            {!isOwnProfile && (
              <View style={styles.tradeButtonsRow}>
                <Button
                  variant="buy"
                  onPress={() => openTradeModal('buy')}
                  style={styles.tradeButton}
                >
                  매수
                </Button>
                <Button
                  variant="sell"
                  onPress={() => openTradeModal('sell')}
                  style={styles.tradeButton}
                >
                  매도
                </Button>
              </View>
            )}
          </View>
        </SectionCard>
      )}

      {/* Asset Info */}
      <SectionCard title="자산 정보">
        <ListItem
          title="PO 잔액"
          right={<Text style={styles.assetValue}>{(user.poBalance || 0).toLocaleString()} P</Text>}
        />
        <ListItem
          title="신뢰도"
          right={
            <View style={styles.trustBadge}>
              <Text style={styles.trustBadgeText}>{user.trustLevel || 'Bronze'}</Text>
            </View>
          }
        />
        <ListItem
          title="신뢰 배수"
          right={<Text style={styles.assetValue}>x{user.trustMultiplier || 1}</Text>}
        />
      </SectionCard>

      {/* Bio */}
      {user.bio && (
        <SectionCard title="소개">
          <View style={styles.bioContainer}>
            <Text style={styles.bioText}>{user.bio}</Text>
          </View>
        </SectionCard>
      )}

      {/* Settings (Own Profile Only) */}
      {isOwnProfile && (
        <>
          <SectionCard title="설정">
            <ListItem
              title="알림 설정"
              showChevron
              onPress={() => {}}
            />
            <ListItem
              title="개인정보 설정"
              showChevron
              onPress={() => navigation.navigate('SecuritySettings')}
            />
            <ListItem
              title="약관 및 정책"
              showChevron
              onPress={() => navigation.navigate('Terms')}
            />
          </SectionCard>

          <View style={styles.logoutSection}>
            <Button
              variant="danger"
              onPress={handleLogout}
              fullWidth
            >
              로그아웃
            </Button>
          </View>
        </>
      )}

      <View style={styles.bottomSpacing} />

      {/* Trade Modal */}
      <Modal
        visible={showTradeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTradeModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowTradeModal(false)}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {tradeType === 'buy' ? '매수' : '매도'}
              </Text>
              <Pressable onPress={() => setShowTradeModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.tradeInfoCard}>
                <View style={styles.tradeInfoRow}>
                  <Text style={styles.tradeInfoLabel}>크리에이터</Text>
                  <Text style={styles.tradeInfoValue}>{user.username}</Text>
                </View>
                <View style={styles.tradeInfoRow}>
                  <Text style={styles.tradeInfoLabel}>현재가</Text>
                  <Text style={styles.tradeInfoValue}>
                    {stockData?.sharePrice?.toLocaleString() || 0} P
                  </Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>수량</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="매수할 주식 수량"
                  placeholderTextColor={theme.colors.textDisabled}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                />
              </View>

              {quantity && stockData && (
                <View style={styles.totalCard}>
                  <Text style={styles.totalLabel}>총 금액</Text>
                  <Text style={styles.totalValue}>
                    {(parseInt(quantity || 0) * stockData.sharePrice).toLocaleString()} P
                  </Text>
                </View>
              )}

              {tradeType === 'buy' && !user.isFollowing && (
                <View style={styles.noticeCard}>
                  <Text style={styles.noticeText}>매수 시 자동으로 팔로우됩니다</Text>
                </View>
              )}

              <Button
                variant={tradeType === 'buy' ? 'buy' : 'sell'}
                size="lg"
                fullWidth
                loading={tradeLoading}
                onPress={handleTrade}
                style={styles.confirmButton}
              >
                {tradeType === 'buy' ? '매수하기' : '매도하기'}
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

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

  // Header
  header: {
    backgroundColor: t.colors.white,
    paddingTop: 10,
    paddingBottom: t.spacing.lg,
    paddingHorizontal: t.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: t.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: t.typography.fontSize.xl,
    fontWeight: t.typography.fontWeight.bold,
    color: t.colors.white,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: t.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: t.colors.white,
  },
  verifiedIcon: {
    fontSize: 10,
    color: t.colors.white,
    fontWeight: t.typography.fontWeight.bold,
  },
  profileInfo: {
    marginLeft: t.spacing.base,
  },
  username: {
    fontSize: t.typography.fontSize.lg,
    fontWeight: t.typography.fontWeight.bold,
    color: t.colors.textPrimary,
    marginBottom: 2,
  },
  email: {
    fontSize: t.typography.fontSize.sm,
    color: t.colors.textSecondary,
  },
  followButton: {
    minWidth: 80,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: t.colors.white,
    paddingVertical: t.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: t.typography.fontSize.lg,
    fontWeight: t.typography.fontWeight.bold,
    color: t.colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: t.typography.fontSize.sm,
    color: t.colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: t.colors.gray200,
    alignSelf: 'center',
  },

  // Stock Card
  stockCard: {
    marginHorizontal: t.spacing.lg,
    padding: t.spacing.lg,
    backgroundColor: t.colors.gray50,
    borderRadius: t.borderRadius.md,
  },
  stockPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: t.spacing.lg,
  },
  stockLabel: {
    fontSize: t.typography.fontSize.sm,
    color: t.colors.textSecondary,
    marginBottom: t.spacing.xs,
  },
  stockPrice: {
    fontSize: t.typography.fontSize['2xl'],
    fontWeight: t.typography.fontWeight.bold,
    color: t.colors.textPrimary,
  },
  changeBadge: {
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    borderRadius: t.borderRadius.sm,
  },
  changeText: {
    fontSize: t.typography.fontSize.sm,
    fontWeight: t.typography.fontWeight.semibold,
  },
  stockMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: t.spacing.base,
    borderTopWidth: 1,
    borderTopColor: t.colors.gray200,
  },
  stockMetaItem: {
    flex: 1,
    alignItems: 'center',
  },
  stockMetaLabel: {
    fontSize: t.typography.fontSize.xs,
    color: t.colors.textTertiary,
    marginBottom: 4,
  },
  stockMetaValue: {
    fontSize: t.typography.fontSize.sm,
    fontWeight: t.typography.fontWeight.semibold,
    color: t.colors.textPrimary,
  },
  chartSection: {
    marginTop: t.spacing.lg,
    paddingTop: t.spacing.base,
    borderTopWidth: 1,
    borderTopColor: t.colors.gray200,
  },
  chartTitle: {
    fontSize: t.typography.fontSize.sm,
    fontWeight: t.typography.fontWeight.medium,
    color: t.colors.textSecondary,
    marginBottom: t.spacing.sm,
  },
  chart: {
    borderRadius: t.borderRadius.sm,
    marginLeft: -t.spacing.sm,
  },
  tradeButtonsRow: {
    flexDirection: 'row',
    gap: t.spacing.sm,
    marginTop: t.spacing.lg,
  },
  tradeButton: {
    flex: 1,
  },

  // Asset Value
  assetValue: {
    fontSize: t.typography.fontSize.base,
    fontWeight: t.typography.fontWeight.semibold,
    color: t.colors.textPrimary,
  },
  trustBadge: {
    backgroundColor: t.colors.primaryBackground,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    borderRadius: t.borderRadius.sm,
  },
  trustBadgeText: {
    fontSize: t.typography.fontSize.sm,
    fontWeight: t.typography.fontWeight.semibold,
    color: t.colors.primary,
  },

  // Bio
  bioContainer: {
    paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.sm,
  },
  bioText: {
    fontSize: t.typography.fontSize.base,
    color: t.colors.textPrimary,
    lineHeight: t.typography.fontSize.base * t.typography.lineHeight.relaxed,
  },

  // Logout
  logoutSection: {
    paddingHorizontal: t.spacing.lg,
    marginTop: t.spacing.lg,
  },

  // Bottom Spacing
  bottomSpacing: {
    height: t.spacing['4xl'],
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: t.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: t.colors.white,
    borderTopLeftRadius: t.borderRadius.xl,
    borderTopRightRadius: t.borderRadius.xl,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: t.colors.gray300,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: t.spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  modalTitle: {
    fontSize: t.typography.fontSize.lg,
    fontWeight: t.typography.fontWeight.bold,
    color: t.colors.textPrimary,
  },
  modalClose: {
    fontSize: 20,
    color: t.colors.textTertiary,
    padding: t.spacing.xs,
  },
  modalBody: {
    padding: t.spacing.lg,
  },
  tradeInfoCard: {
    backgroundColor: t.colors.gray50,
    borderRadius: t.borderRadius.base,
    padding: t.spacing.base,
    marginBottom: t.spacing.lg,
  },
  tradeInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: t.spacing.sm,
  },
  tradeInfoLabel: {
    fontSize: t.typography.fontSize.sm,
    color: t.colors.textSecondary,
  },
  tradeInfoValue: {
    fontSize: t.typography.fontSize.sm,
    fontWeight: t.typography.fontWeight.semibold,
    color: t.colors.textPrimary,
  },
  inputLabel: {
    fontSize: t.typography.fontSize.sm,
    fontWeight: t.typography.fontWeight.semibold,
    color: t.colors.textPrimary,
    marginBottom: t.spacing.sm,
  },
  inputWrapper: {
    backgroundColor: t.colors.gray50,
    borderRadius: t.borderRadius.base,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  input: {
    paddingHorizontal: t.spacing.base,
    paddingVertical: t.spacing.base,
    fontSize: t.typography.fontSize.base,
    color: t.colors.textPrimary,
  },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: t.colors.gray50,
    padding: t.spacing.base,
    borderRadius: t.borderRadius.base,
    marginTop: t.spacing.md,
  },
  totalLabel: {
    fontSize: t.typography.fontSize.base,
    fontWeight: t.typography.fontWeight.medium,
    color: t.colors.textSecondary,
  },
  totalValue: {
    fontSize: t.typography.fontSize.lg,
    fontWeight: t.typography.fontWeight.bold,
    color: t.colors.textPrimary,
  },
  noticeCard: {
    backgroundColor: t.colors.primaryBackground,
    padding: t.spacing.md,
    borderRadius: t.borderRadius.base,
    marginTop: t.spacing.md,
  },
  noticeText: {
    fontSize: t.typography.fontSize.sm,
    color: t.colors.primary,
    textAlign: 'center',
  },
  confirmButton: {
    marginTop: t.spacing.lg,
  },
});
