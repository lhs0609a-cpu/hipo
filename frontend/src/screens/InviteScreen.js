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
  Alert,
  Share,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { viralReferralAPI, inviteLeaderboardAPI, shareAPI } from '../services/api';
import { copyText, copyFeedback } from '../utils/clipboard';

const InviteScreen = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('invite');

  // Data
  const [referralData, setReferralData] = useState(null);
  const [myReferrals, setMyReferrals] = useState([]);
  const [leaderboard, setLeaderboard] = useState(null);
  const [shareData, setShareData] = useState(null);

  // Modal
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [inputCode, setInputCode] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [codeRes, referralsRes, leaderboardRes] = await Promise.all([
        viralReferralAPI.getMyCode(),
        viralReferralAPI.getMyReferrals(),
        inviteLeaderboardAPI.getWeekly(),
      ]);
      setReferralData(codeRes.data);
      setMyReferrals(referralsRes.data.referrals || []);
      setLeaderboard(leaderboardRes.data);

      // 공유 데이터도 로드
      try {
        const shareRes = await shareAPI.getShareCard();
        setShareData(shareRes.data);
      } catch (e) {
        // 주식 미발행 시 무시
      }
    } catch (error) {
      console.error('Error fetching invite data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const formatNumber = (num) => {
    if (!num) return '0';
    return num.toLocaleString();
  };

  /**
   * 추천 코드 복사.
   * 예전에는 react-native 의 Clipboard 를 썼는데 RN 신아키텍처에서 제거돼
   * 누르는 순간 크래시했다. utils/clipboard 가 폴백까지 처리한다.
   */
  const handleCopyCode = async () => {
    const code = referralData?.referralCode;
    if (!code) return;
    const result = await copyText(code);
    Alert.alert(result.ok ? '복사 완료' : '알림', copyFeedback(result));
  };

  const handleShare = async (type) => {
    try {
      const message = type === 'stock' && shareData
        ? shareData.shareMessage
        : referralData?.shareMessage;

      const url = type === 'stock' && shareData
        ? shareData.shareUrl
        : referralData?.inviteLink;

      await Share.share({
        message: `${message}\n\n${url}`,
        url: url,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleApplyCode = async () => {
    if (!inputCode.trim()) {
      Alert.alert('오류', '추천 코드를 입력해주세요');
      return;
    }

    try {
      const res = await viralReferralAPI.applyCode(inputCode.trim());
      Alert.alert('성공', res.data.message);
      setApplyModalVisible(false);
      setInputCode('');
      fetchData();
    } catch (error) {
      Alert.alert('오류', error.response?.data?.message || '추천 코드 적용에 실패했습니다');
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return { icon: 'trophy', color: '#D9A521' };
    if (rank === 2) return { icon: 'medal', color: '#9BA3AF' };
    if (rank === 3) return { icon: 'medal', color: '#B87333' };
    return { icon: 'ribbon', color: '#2B5FE3' };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return '#00B368';
      case 'ACTIVE': return '#2B5FE3';
      default: return '#F59B00';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'COMPLETED': return '첫 거래 완료';
      case 'ACTIVE': return '활성';
      default: return '가입만 완료';
    }
  };

  const renderReferralItem = ({ item }) => (
    <View style={styles.referralItem}>
      <View style={styles.referralAvatar}>
        <Text style={styles.referralAvatarText}>
          {item.user?.username?.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.referralInfo}>
        <Text style={styles.referralName}>{item.user?.username}</Text>
        <Text style={styles.referralDate}>
          {new Date(item.joinedAt).toLocaleDateString('ko-KR')} 가입
        </Text>
      </View>
      <View style={styles.referralStatus}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
        <Text style={styles.commissionText}>+{formatNumber(item.commission)} PO</Text>
      </View>
    </View>
  );

  const renderLeaderboardItem = ({ item, index }) => {
    const badge = getRankBadge(item.rank);
    return (
      <View style={[styles.leaderboardItem, item.user?.id === referralData?.userId && styles.myRankItem]}>
        <View style={styles.rankBadge}>
          {item.rank <= 3 ? (
            <Ionicons name={badge.icon} size={24} color={badge.color} />
          ) : (
            <Text style={styles.rankNumber}>{item.rank}</Text>
          )}
        </View>
        <View style={styles.leaderboardInfo}>
          <Text style={styles.leaderboardName}>{item.user?.username}</Text>
          <Text style={styles.leaderboardCount}>{item.inviteCount}명 초대</Text>
        </View>
        {item.weeklyReward > 0 && (
          <View style={styles.rewardBadge}>
            <Text style={styles.rewardText}>+{formatNumber(item.weeklyReward)}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2B5FE3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>친구 초대</Text>
        <TouchableOpacity onPress={() => setApplyModalVisible(true)}>
          <Text style={styles.applyCodeText}>코드 입력</Text>
        </TouchableOpacity>
      </View>

      {/* 탭 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invite' && styles.activeTab]}
          onPress={() => setActiveTab('invite')}
        >
          <Text style={[styles.tabText, activeTab === 'invite' && styles.activeTabText]}>
            초대하기
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'list' && styles.activeTab]}
          onPress={() => setActiveTab('list')}
        >
          <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>
            초대 현황
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ranking' && styles.activeTab]}
          onPress={() => setActiveTab('ranking')}
        >
          <Text style={[styles.tabText, activeTab === 'ranking' && styles.activeTabText]}>
            랭킹
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'invite' ? (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* 보상 안내 */}
          <View style={styles.rewardCard}>
            <Text style={styles.rewardTitle}>친구 초대 보상</Text>
            <View style={styles.rewardGrid}>
              <View style={styles.rewardItem}>
                <Ionicons name="person-add" size={32} color="#2B5FE3" />
                <Text style={styles.rewardLabel}>친구 가입 시</Text>
                <Text style={styles.rewardValue}>
                  나: <Text style={styles.highlight}>500 PO</Text>
                </Text>
                <Text style={styles.rewardValue}>
                  친구: <Text style={styles.highlight}>1,000 PO</Text>
                </Text>
              </View>
              <View style={styles.rewardDivider} />
              <View style={styles.rewardItem}>
                <Ionicons name="swap-horizontal" size={32} color="#00B368" />
                <Text style={styles.rewardLabel}>첫 거래 완료 시</Text>
                <Text style={styles.rewardValue}>
                  나: <Text style={styles.highlight}>1,000 PO</Text>
                </Text>
                <Text style={styles.rewardValue}>
                  친구: <Text style={styles.highlight}>500 PO</Text>
                </Text>
              </View>
            </View>
            <View style={styles.vipReward}>
              <Ionicons name="star" size={20} color="#D9A521" />
              <Text style={styles.vipText}>10명 초대 달성 시 VIP 배지 + 거래 수수료 50% 할인!</Text>
            </View>
          </View>

          {/* 내 추천 코드 */}
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>내 추천 코드</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{referralData?.referralCode}</Text>
              <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
                <Ionicons name="copy-outline" size={20} color="#2B5FE3" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 공유 버튼들 */}
          <View style={styles.shareSection}>
            <TouchableOpacity
              style={[styles.shareButton, styles.kakaoButton]}
              onPress={() => handleShare('invite')}
            >
              <Ionicons name="chatbubble-ellipses" size={24} color="#000" />
              <Text style={[styles.shareButtonText, { color: '#000' }]}>카카오톡 공유</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareButton, styles.smsButton]}
              onPress={() => handleShare('invite')}
            >
              <Ionicons name="chatbubbles" size={24} color="#fff" />
              <Text style={styles.shareButtonText}>문자로 초대</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareButton, styles.linkButton]}
              onPress={() => handleShare('invite')}
            >
              <Ionicons name="link" size={24} color="#fff" />
              <Text style={styles.shareButtonText}>링크 공유</Text>
            </TouchableOpacity>
          </View>

          {/* 내 주식 공유 (자아 바이럴) */}
          {shareData && (
            <View style={styles.stockShareCard}>
              <Text style={styles.stockShareTitle}>내 주식 공유하기</Text>
              <Text style={styles.stockShareDesc}>
                "내 주식 사러 와!" 메시지로 친구들의 호기심을 자극하세요
              </Text>
              <View style={styles.stockPreview}>
                <Text style={styles.stockPrice}>{formatNumber(shareData.shareData?.currentPrice)} PO</Text>
                <Text style={[
                  styles.stockChange,
                  shareData.shareData?.priceChange >= 0 ? styles.priceUp : styles.priceDown
                ]}>
                  {shareData.shareData?.priceChange >= 0 ? '+' : ''}{shareData.shareData?.priceChange}%
                </Text>
              </View>
              <TouchableOpacity
                style={styles.stockShareButton}
                onPress={() => handleShare('stock')}
              >
                <Ionicons name="share-social" size={20} color="#fff" />
                <Text style={styles.stockShareButtonText}>내 주식 공유하기</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 통계 */}
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>내 초대 현황</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{referralData?.stats?.totalInvites || 0}</Text>
                <Text style={styles.statLabel}>총 초대</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{referralData?.stats?.completedInvites || 0}</Text>
                <Text style={styles.statLabel}>거래 완료</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatNumber(referralData?.stats?.totalEarned || 0)}</Text>
                <Text style={styles.statLabel}>총 보상 (PO)</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      ) : activeTab === 'list' ? (
        <FlatList
          data={myReferrals}
          renderItem={renderReferralItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>아직 초대한 친구가 없습니다</Text>
              <Text style={styles.emptySubtext}>친구를 초대하고 보상을 받아보세요!</Text>
            </View>
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* 주간 리더보드 */}
          <View style={styles.leaderboardHeader}>
            <Text style={styles.leaderboardTitle}>이번 주 초대왕</Text>
            <Text style={styles.leaderboardPeriod}>
              {leaderboard?.weekStart} ~ {leaderboard?.weekEnd}
            </Text>
          </View>

          {/* 상위 보상 안내 */}
          <View style={styles.prizeCard}>
            <View style={styles.prizeItem}>
              <Ionicons name="trophy" size={24} color="#D9A521" />
              <Text style={styles.prizeRank}>1위</Text>
              <Text style={styles.prizeAmount}>100,000 PO</Text>
            </View>
            <View style={styles.prizeItem}>
              <Ionicons name="medal" size={24} color="#9BA3AF" />
              <Text style={styles.prizeRank}>2위</Text>
              <Text style={styles.prizeAmount}>50,000 PO</Text>
            </View>
            <View style={styles.prizeItem}>
              <Ionicons name="medal" size={24} color="#B87333" />
              <Text style={styles.prizeRank}>3위</Text>
              <Text style={styles.prizeAmount}>30,000 PO</Text>
            </View>
          </View>

          {/* 내 순위 */}
          {leaderboard?.myRank && (
            <View style={styles.myRankCard}>
              <Text style={styles.myRankLabel}>내 순위</Text>
              <Text style={styles.myRankValue}>{leaderboard.myRank.rank}위</Text>
              <Text style={styles.myRankInvites}>{leaderboard.myRank.inviteCount}명 초대</Text>
            </View>
          )}

          {/* 리더보드 목록 */}
          {leaderboard?.leaderboard?.map((item, index) => (
            <View key={item.user?.id || index}>
              {renderLeaderboardItem({ item, index })}
            </View>
          ))}

          {(!leaderboard?.leaderboard || leaderboard.leaderboard.length === 0) && (
            <View style={styles.emptyContainer}>
              <Ionicons name="podium-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>아직 이번 주 초대 기록이 없습니다</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* 추천 코드 입력 모달 */}
      <Modal visible={applyModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>추천 코드 입력</Text>
            <Text style={styles.modalDesc}>
              친구의 추천 코드를 입력하면{'\n'}1,000 PO를 즉시 받을 수 있어요!
            </Text>

            <TextInput
              style={styles.codeInput}
              value={inputCode}
              onChangeText={setInputCode}
              placeholder="추천 코드 입력"
              autoCapitalize="characters"
              maxLength={10}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setApplyModalVisible(false);
                  setInputCode('');
                }}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleApplyCode}
              >
                <Text style={styles.confirmButtonText}>적용</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  applyCodeText: {
    fontSize: 14,
    color: t.colors.primary,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: t.colors.backgroundSecondary,
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
    color: '#999',
    fontWeight: '600',
  },
  activeTabText: {
    color: t.colors.primary,
  },
  content: {
    padding: 16,
  },
  listContent: {
    padding: 16,
  },
  rewardCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  rewardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  rewardGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardItem: {
    flex: 1,
    alignItems: 'center',
  },
  rewardDivider: {
    width: 1,
    height: 80,
    backgroundColor: '#eee',
    marginHorizontal: 16,
  },
  rewardLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    marginBottom: 8,
  },
  rewardValue: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  highlight: {
    fontWeight: '700',
    color: t.colors.primary,
  },
  vipReward: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.warningBackground,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  vipText: {
    fontSize: 13,
    color: '#A57C18',
    fontWeight: '600',
  },
  codeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.background,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  codeText: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 2,
  },
  copyButton: {
    padding: 8,
  },
  shareSection: {
    gap: 12,
    marginBottom: 16,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
  },
  smsButton: {
    backgroundColor: t.colors.success,
  },
  linkButton: {
    backgroundColor: t.colors.primary,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  stockShareCard: {
    backgroundColor: t.colors.primaryBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  stockShareTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: t.colors.primary,
    marginBottom: 8,
  },
  stockShareDesc: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  stockPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  stockPrice: {
    fontSize: 24,
    fontWeight: '700',
  },
  stockChange: {
    fontSize: 16,
    fontWeight: '600',
  },
  priceUp: {
    color: t.colors.error,
  },
  priceDown: {
    color: t.colors.primaryDark,
  },
  stockShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primary,
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  stockShareButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: t.colors.primary,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  referralItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  referralAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: t.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  referralAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  referralInfo: {
    flex: 1,
  },
  referralName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  referralDate: {
    fontSize: 13,
    color: '#999',
  },
  referralStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  commissionText: {
    fontSize: 14,
    fontWeight: '700',
    color: t.colors.primary,
  },
  leaderboardHeader: {
    marginBottom: 16,
  },
  leaderboardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  leaderboardPeriod: {
    fontSize: 13,
    color: '#666',
  },
  prizeCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  prizeItem: {
    flex: 1,
    alignItems: 'center',
  },
  prizeRank: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  prizeAmount: {
    fontSize: 13,
    color: t.colors.primary,
    fontWeight: '700',
  },
  myRankCard: {
    backgroundColor: t.colors.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  myRankLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  myRankValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  myRankInvites: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  myRankItem: {
    backgroundColor: t.colors.primaryBackground,
    borderWidth: 1,
    borderColor: t.colors.primary,
  },
  rankBadge: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  leaderboardCount: {
    fontSize: 13,
    color: '#666',
  },
  rewardBadge: {
    backgroundColor: t.colors.warningBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rewardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A57C18',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: t.colors.backgroundSecondary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: t.colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default InviteScreen;
