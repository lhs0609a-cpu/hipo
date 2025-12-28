import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Modal,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSavedUser } from '../api/auth';
import { getUserProfile, followUser } from '../api/users';
import { COLORS, TRUST_LEVEL_COLORS } from '../constants/colors';
import api from '../api/client';

export default function ProfileScreen({ navigation, route }) {
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [stockData, setStockData] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeType, setTradeType] = useState('buy'); // 'buy' or 'sell'
  const [quantity, setQuantity] = useState('');
  const [tradeLoading, setTradeLoading] = useState(false);
  const userId = route?.params?.userId;

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      // 현재 로그인한 사용자 정보
      const currentUserData = await getSavedUser();
      setCurrentUser(currentUserData);

      // 프로필 사용자 정보
      if (userId && userId !== currentUserData.id) {
        // 다른 사용자의 프로필 조회
        const profileData = await getUserProfile(userId);
        setUser(profileData.user);

        // 주식 정보 및 히스토리 로드
        await loadStockData(userId);
      } else {
        // 본인 프로필
        setUser(currentUserData);
        await loadStockData(currentUserData.id);
      }
    } catch (error) {
      console.error('프로필 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStockData = async (targetUserId) => {
    try {
      // 사용자의 크리에이터 정보 조회
      const stockResponse = await api.get(`/stocks/user/${targetUserId}`);
      if (stockResponse.data.success && stockResponse.data.stock) {
        setStockData(stockResponse.data.stock);

        // 가격 히스토리 조회
        const historyResponse = await api.get(`/stocks/${stockResponse.data.stock.id}/history`, {
          params: { timeframe: '7d' }
        });

        if (historyResponse.data.success && historyResponse.data.history) {
          setPriceHistory(historyResponse.data.history);
        }
      }
    } catch (error) {
      console.error('크리에이터 데이터 로드 오류:', error);
    }
  };

  const handleFollow = async () => {
    try {
      setFollowLoading(true);
      const result = await followUser(user.id);

      // 팔로우 상태 업데이트
      setUser({
        ...user,
        isFollowing: result.isFollowing,
        followersCount: result.isFollowing ? user.followersCount + 1 : user.followersCount - 1
      });

      const message = result.isFollowing ? '팔로우했습니다' : '언팔로우했습니다';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('알림', message);
      }
    } catch (error) {
      console.error('팔로우 오류:', error);
      const message = '팔로우 처리 중 오류가 발생했습니다';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('오류', message);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const handleTrade = async () => {
    if (!quantity || parseFloat(quantity) <= 0) {
      const message = '수량을 입력해주세요';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('알림', message);
      }
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
        // 매수 성공 시 자동 팔로우
        if (tradeType === 'buy' && !user.isFollowing) {
          try {
            await api.post(`/users/${userId}/follow`);
            setUser({
              ...user,
              isFollowing: true,
              followersCount: (user.followersCount || 0) + 1
            });
          } catch (followError) {
            console.error('자동 팔로우 오류:', followError);
            // 팔로우 실패해도 거래는 성공했으므로 계속 진행
          }
        }

        const message = tradeType === 'buy'
          ? `${quantity}주를 매수했습니다! ${!user.isFollowing ? '자동으로 팔로우되었습니다.' : ''}`
          : `${quantity}주를 매도했습니다!`;

        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('성공', message);
        }

        setShowTradeModal(false);
        setQuantity('');
        loadProfile(); // 프로필 새로고침
      }
    } catch (error) {
      console.error('거래 오류:', error);
      const message = error.response?.data?.error || '거래 처리 중 오류가 발생했습니다';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('오류', message);
      }
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
    if (Platform.OS === 'web') {
      if (window.confirm('로그아웃 하시겠습니까?')) {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        window.location.href = '/';
      }
    } else {
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
              navigation.replace('Auth');
            },
          },
        ]
      );
    }
  };

  if (loading || !user) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const trustLevelColor = TRUST_LEVEL_COLORS[user.trustLevel] || COLORS.textSecondary;
  const isOwnProfile = !userId || userId === currentUser?.id;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileInfo}>
          <View style={styles.usernameRow}>
            <Text style={styles.username}>{user.username}</Text>
            {user.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            )}
          </View>
          <Text style={styles.email}>{user.email}</Text>
          <View style={[styles.trustBadge, { backgroundColor: trustLevelColor }]}>
            <Text style={styles.trustText}>신뢰도 {user.trustLevel}</Text>
          </View>
        </View>

        {/* 팔로우 버튼 (다른 사용자 프로필인 경우) */}
        {!isOwnProfile && (
          <TouchableOpacity
            style={[
              styles.followButton,
              user.isFollowing && styles.followingButton
            ]}
            onPress={handleFollow}
            disabled={followLoading}
          >
            {followLoading ? (
              <ActivityIndicator size="small" color={user.isFollowing ? COLORS.primary : '#FFFFFF'} />
            ) : (
              <Text style={[
                styles.followButtonText,
                user.isFollowing && styles.followingButtonText
              ]}>
                {user.isFollowing ? '팔로잉' : '팔로우'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* 팔로워/팔로잉/포스트 수 */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{user.postsCount || 0}</Text>
          <Text style={styles.statLabel}>게시물</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{user.followersCount || 0}</Text>
          <Text style={styles.statLabel}>팔로워</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{user.followingCount || 0}</Text>
          <Text style={styles.statLabel}>팔로잉</Text>
        </View>
      </View>

      {/* 크리에이터 정보 및 차트 */}
      {stockData && (
        <View style={styles.stockSection}>
          <View style={styles.stockHeader}>
            <View>
              <Text style={styles.stockLabel}>현재 가격</Text>
              <Text style={styles.stockPrice}>{stockData.sharePrice?.toLocaleString() || 0} PO</Text>
            </View>
            <View>
              <Text style={styles.stockLabel}>시가총액</Text>
              <Text style={styles.stockMarketCap}>
                {(stockData.marketCapTotal || 0).toLocaleString()} PO
              </Text>
            </View>
            <View>
              <Text style={styles.stockLabel}>발행 주식</Text>
              <Text style={styles.stockShares}>{stockData.totalShares?.toLocaleString() || 0}주</Text>
            </View>
          </View>

          {/* 가격 차트 */}
          {priceHistory.length > 0 && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>7일 가격 추이</Text>
              <LineChart
                data={{
                  labels: priceHistory.map((item) => {
                    const date = new Date(item.timestamp);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }),
                  datasets: [
                    {
                      data: priceHistory.map((item) => item.price),
                    },
                  ],
                }}
                width={Dimensions.get('window').width - 32}
                height={200}
                chartConfig={{
                  backgroundColor: COLORS.surface,
                  backgroundGradientFrom: COLORS.surface,
                  backgroundGradientTo: COLORS.surface,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                  labelColor: (opacity = 1) => COLORS.textSecondary,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                    stroke: COLORS.primary,
                  },
                }}
                bezier
                style={styles.chart}
              />
            </View>
          )}

          {/* 매수/매도 버튼 (다른 사용자 프로필인 경우) */}
          {!isOwnProfile && (
            <View style={styles.tradeButtons}>
              <TouchableOpacity
                style={[styles.tradeButton, styles.buyButton]}
                onPress={() => openTradeModal('buy')}
              >
                <Text style={styles.tradeButtonText}>매수</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tradeButton, styles.sellButton]}
                onPress={() => openTradeModal('sell')}
              >
                <Text style={styles.tradeButtonText}>매도</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>자산 정보</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>PO 잔액</Text>
            <Text style={styles.infoValue}>{user.poBalance?.toLocaleString() || 0} PO</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>신뢰 배수</Text>
            <Text style={styles.infoValue}>x{user.trustMultiplier || 1}</Text>
          </View>
        </View>
      </View>

      {user.bio && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>소개</Text>
          <View style={styles.infoCard}>
            <Text style={styles.bioText}>{user.bio}</Text>
          </View>
        </View>
      )}

      {/* 설정 (본인 프로필인 경우만) */}
      {isOwnProfile && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>설정</Text>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuText}>알림 설정</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuText}>개인정보 설정</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuText}>약관 및 정책</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        </>
      )}

      {/* 거래 모달 */}
      <Modal
        visible={showTradeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTradeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {tradeType === 'buy' ? '주식 매수' : '주식 매도'}
              </Text>
              <TouchableOpacity onPress={() => setShowTradeModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.tradeInfo}>
                <View style={styles.tradeInfoRow}>
                  <Text style={styles.tradeInfoLabel}>사용자</Text>
                  <Text style={styles.tradeInfoValue}>{user.username}</Text>
                </View>
                <View style={styles.tradeInfoRow}>
                  <Text style={styles.tradeInfoLabel}>현재가</Text>
                  <Text style={styles.tradeInfoValue}>
                    {stockData?.sharePrice?.toLocaleString() || 0} PO
                  </Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>수량</Text>
              <TextInput
                style={styles.input}
                placeholder="매수/매도할 주식 수량"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />

              {quantity && stockData && (
                <View style={styles.totalAmount}>
                  <Text style={styles.totalLabel}>총 금액</Text>
                  <Text style={styles.totalValue}>
                    {(parseInt(quantity) * stockData.sharePrice).toLocaleString()} PO
                  </Text>
                </View>
              )}

              {tradeType === 'buy' && !user.isFollowing && (
                <View style={styles.autoFollowNotice}>
                  <Text style={styles.autoFollowText}>
                    💡 매수 시 자동으로 팔로우됩니다
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  tradeType === 'buy' ? styles.confirmBuyButton : styles.confirmSellButton,
                ]}
                onPress={handleTrade}
                disabled={tradeLoading}
              >
                {tradeLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {tradeType === 'buy' ? '매수하기' : '매도하기'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  header: {
    backgroundColor: COLORS.surface,
    padding: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
  profileInfo: {
    alignItems: 'center',
  },
  followButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
    minWidth: 120,
  },
  followingButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  followingButtonText: {
    color: COLORS.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  verifiedBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  email: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  trustBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  trustText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  bioText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  menuItem: {
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuText: {
    fontSize: 14,
    color: COLORS.text,
  },
  logoutButton: {
    backgroundColor: COLORS.danger,
    padding: 15,
    borderRadius: 12,
    margin: 15,
    marginTop: 30,
    marginBottom: 40,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stockSection: {
    backgroundColor: COLORS.surface,
    padding: 16,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  stockLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  stockPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  stockMarketCap: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  stockShares: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  chartContainer: {
    marginVertical: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  tradeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  tradeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buyButton: {
    backgroundColor: COLORS.success,
  },
  sellButton: {
    backgroundColor: COLORS.danger,
  },
  tradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalClose: {
    fontSize: 24,
    color: COLORS.textSecondary,
  },
  modalBody: {
    padding: 20,
  },
  tradeInfo: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  tradeInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  tradeInfoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  tradeInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  totalAmount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  autoFollowNotice: {
    backgroundColor: COLORS.primary + '20',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  autoFollowText: {
    fontSize: 13,
    color: COLORS.primary,
    textAlign: 'center',
  },
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  confirmBuyButton: {
    backgroundColor: COLORS.success,
  },
  confirmSellButton: {
    backgroundColor: COLORS.danger,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
