import React, { useState, useEffect, useCallback } from 'react';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { preIPOAPI, walletAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function PreIPODetailScreen({ route, navigation }) {
  const styles = useThemedStyles(makeStyles);
  const { roundId } = route.params;
  const { user } = useAuth();

  const [round, setRound] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [investing, setInvesting] = useState(false);

  // 투자 모달
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [investShares, setInvestShares] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [userBalance, setUserBalance] = useState(0);

  // 카운트다운
  const [timeRemaining, setTimeRemaining] = useState('');

  const fetchRoundDetail = useCallback(async () => {
    try {
      const response = await preIPOAPI.getRoundDetail(roundId);
      if (response.data.success) {
        setRound(response.data.round);
      }
    } catch (error) {
      console.error('라운드 상세 조회 오류:', error);
      Alert.alert('오류', '정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [roundId]);

  const checkEligibility = useCallback(async () => {
    if (!user) return;
    try {
      const response = await preIPOAPI.checkEligibility(roundId);
      if (response.data.success) {
        setEligibility(response.data);
      }
    } catch (error) {
      console.error('자격 확인 오류:', error);
    }
  }, [roundId, user]);

  const fetchBalance = useCallback(async () => {
    if (!user) return;
    try {
      const response = await walletAPI.getBalance();
      if (response.data) {
        setUserBalance(response.data.balance || 0);
      }
    } catch (error) {
      console.error('잔액 조회 오류:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchRoundDetail();
    checkEligibility();
    fetchBalance();
  }, [fetchRoundDetail, checkEligibility, fetchBalance]);

  // 카운트다운 타이머
  useEffect(() => {
    if (!round?.endAt) return;

    const updateTimer = () => {
      const now = new Date();
      const end = new Date(round.endAt);
      const diff = end - now;

      if (diff <= 0) {
        setTimeRemaining('마감');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeRemaining(`${days}일 ${hours}시간 ${minutes}분`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}시간 ${minutes}분 ${seconds}초`);
      } else {
        setTimeRemaining(`${minutes}분 ${seconds}초`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [round?.endAt]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRoundDetail();
    checkEligibility();
    fetchBalance();
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    return num.toLocaleString('ko-KR');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!round?.totalShares || round.totalShares === 0) return 0;
    return Math.round((round.soldShares / round.totalShares) * 100);
  };

  const getEligibilityBadge = (type) => {
    const badges = {
      public: { text: '전체 공개', color: '#00B368', icon: '🌍' },
      followers_only: { text: '팔로워 전용', color: '#2B5FE3', icon: '👥' },
      vip_only: { text: 'VIP 전용', color: '#8B5CF6', icon: '💎' },
      invited_only: { text: '초대 전용', color: '#F59B00', icon: '🎟️' },
    };
    return badges[type] || { text: type, color: '#666', icon: '📌' };
  };

  const calculateInvestment = () => {
    const shares = parseInt(investShares) || 0;
    const pricePerShare = round?.pricePerShare || 0;
    const totalAmount = shares * pricePerShare;

    // 얼리버드 할인 계산
    let discount = 0;
    let isEarlyBird = false;
    if (round?.earlyBirdBonus > 0 && round?.earlyBirdLimit > round?.currentInvestors) {
      isEarlyBird = true;
      discount = totalAmount * (round.earlyBirdBonus / 100);
    }

    return {
      shares,
      pricePerShare,
      totalAmount,
      discount,
      isEarlyBird,
      finalAmount: totalAmount - discount,
    };
  };

  const handleInvest = async () => {
    if (!user) {
      Alert.alert('로그인 필요', '투자하려면 로그인이 필요합니다.');
      navigation.navigate('Login');
      return;
    }

    const shares = parseInt(investShares);
    if (!shares || shares <= 0) {
      Alert.alert('오류', '투자 수량을 입력해주세요.');
      return;
    }

    if (shares < (round?.minInvestmentShares || 1)) {
      Alert.alert('오류', `최소 ${round.minInvestmentShares}주 이상 투자해야 합니다.`);
      return;
    }

    if (round?.maxInvestmentShares && shares > round.maxInvestmentShares) {
      Alert.alert('오류', `최대 ${round.maxInvestmentShares}주까지 투자할 수 있습니다.`);
      return;
    }

    const investment = calculateInvestment();
    if (investment.finalAmount > userBalance) {
      Alert.alert('잔액 부족', '투자금이 부족합니다. 충전 후 다시 시도해주세요.');
      return;
    }

    setInvesting(true);
    try {
      const response = await preIPOAPI.invest(roundId, shares, inviteCode || undefined);

      if (response.data.success) {
        Alert.alert(
          '투자 완료',
          `${formatNumber(shares)}주 투자가 완료되었습니다.\n${response.data.isEarlyBird ? '🎉 얼리버드 혜택이 적용되었습니다!' : ''}`,
          [
            {
              text: '확인',
              onPress: () => {
                setShowInvestModal(false);
                setInvestShares('');
                setInviteCode('');
                handleRefresh();
              },
            },
          ]
        );
      } else {
        Alert.alert('투자 실패', response.data.message || '투자에 실패했습니다.');
      }
    } catch (error) {
      console.error('투자 오류:', error);
      Alert.alert('오류', error.response?.data?.message || '투자 처리 중 오류가 발생했습니다.');
    } finally {
      setInvesting(false);
    }
  };

  const canInvest = () => {
    if (!round) return false;
    if (round.status !== 'active') return false;
    if (round.remainingShares <= 0) return false;
    if (!eligibility?.isEligible) return false;
    if (eligibility?.alreadyInvested) return false;
    return true;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00B368" />
        </View>
      </SafeAreaView>
    );
  }

  if (!round) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>라운드 정보를 찾을 수 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progress = getProgressPercentage();
  const badge = getEligibilityBadge(round.eligibilityType);
  const investment = calculateInvestment();

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pre-IPO 상세</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00B368" />
        }
      >
        {/* 크리에이터 정보 */}
        <View style={styles.issuerSection}>
          <Image
            source={{ uri: round.issuer?.profileImage || 'https://via.placeholder.com/80' }}
            style={styles.issuerAvatar}
          />
          <View style={styles.issuerInfo}>
            <Text style={styles.issuerName}>{round.issuer?.displayName || '알 수 없음'}</Text>
            <Text style={styles.roundName}>{round.roundName}</Text>
            <View style={[styles.eligibilityBadge, { backgroundColor: badge.color + '20' }]}>
              <Text style={styles.eligibilityIcon}>{badge.icon}</Text>
              <Text style={[styles.eligibilityText, { color: badge.color }]}>{badge.text}</Text>
            </View>
          </View>
        </View>

        {/* 카운트다운 */}
        <LinearGradient
          colors={round.status === 'active' ? ['#182F68', '#183580'] : ['#454E5E', '#5D6779']}
          style={styles.countdownBanner}
        >
          <Text style={styles.countdownLabel}>
            {round.status === 'active' ? '투자 마감까지' : round.status === 'approved' ? '투자 시작까지' : '마감됨'}
          </Text>
          <Text style={styles.countdownTime}>{timeRemaining}</Text>
        </LinearGradient>

        {/* 설명 */}
        {round.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>소개</Text>
            <Text style={styles.description}>{round.description}</Text>
          </View>
        )}

        {/* 가격 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>투자 조건</Text>
          <View style={styles.priceGrid}>
            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>Pre-IPO 가격</Text>
              <Text style={styles.priceValue}>{formatNumber(round.pricePerShare)}원</Text>
            </View>
            {round.expectedIPOPrice && (
              <View style={styles.priceCard}>
                <Text style={styles.priceLabel}>예상 공모가</Text>
                <Text style={styles.expectedPrice}>{formatNumber(round.expectedIPOPrice)}원</Text>
                {round.discountRate && (
                  <Text style={styles.discountBadge}>-{round.discountRate}% 할인</Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.conditionRow}>
            <Text style={styles.conditionLabel}>최소 투자</Text>
            <Text style={styles.conditionValue}>{round.minInvestmentShares}주</Text>
          </View>
          {round.maxInvestmentShares && (
            <View style={styles.conditionRow}>
              <Text style={styles.conditionLabel}>최대 투자</Text>
              <Text style={styles.conditionValue}>{formatNumber(round.maxInvestmentShares)}주</Text>
            </View>
          )}
          <View style={styles.conditionRow}>
            <Text style={styles.conditionLabel}>락업 기간</Text>
            <Text style={styles.conditionValue}>{round.lockupDays}일</Text>
          </View>
        </View>

        {/* 진행 현황 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>진행 현황</Text>
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>
                {formatNumber(round.soldShares)} / {formatNumber(round.totalShares)}주
              </Text>
              <Text style={styles.progressPercent}>{progress}%</Text>
            </View>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={['#00B368', '#00B368']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]}
              />
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{round.currentInvestors || 0}</Text>
              <Text style={styles.statLabel}>투자자</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatNumber(round.totalRaised)}원</Text>
              <Text style={styles.statLabel}>모금액</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatNumber(round.remainingShares)}</Text>
              <Text style={styles.statLabel}>남은 주수</Text>
            </View>
          </View>
        </View>

        {/* 얼리버드 혜택 */}
        {round.earlyBirdBonus > 0 && (
          <View style={styles.section}>
            <LinearGradient
              colors={['#F59B00', '#B26F00']}
              style={styles.earlyBirdCard}
            >
              <Text style={styles.earlyBirdTitle}>🎁 얼리버드 혜택</Text>
              <Text style={styles.earlyBirdDesc}>
                선착순 {round.earlyBirdLimit}명에게 +{round.earlyBirdBonus}% 추가 할인!
              </Text>
              <Text style={styles.earlyBirdRemaining}>
                {round.earlyBirdLimit > round.currentInvestors
                  ? `${round.earlyBirdLimit - round.currentInvestors}자리 남음`
                  : '마감됨'}
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* 일정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>일정</Text>
          <View style={styles.scheduleRow}>
            <Text style={styles.scheduleLabel}>투자 시작</Text>
            <Text style={styles.scheduleValue}>{formatDate(round.startAt)}</Text>
          </View>
          <View style={styles.scheduleRow}>
            <Text style={styles.scheduleLabel}>투자 마감</Text>
            <Text style={styles.scheduleValue}>{formatDate(round.endAt)}</Text>
          </View>
        </View>

        {/* 자격 확인 */}
        {user && eligibility && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>투자 자격</Text>
            {eligibility.isEligible ? (
              <View style={styles.eligibleCard}>
                <Text style={styles.eligibleIcon}>✓</Text>
                <Text style={styles.eligibleText}>투자 자격이 확인되었습니다</Text>
              </View>
            ) : (
              <View style={styles.ineligibleCard}>
                <Text style={styles.ineligibleIcon}>✕</Text>
                <Text style={styles.ineligibleText}>{eligibility.reason || '투자 자격이 없습니다'}</Text>
              </View>
            )}
            {eligibility.alreadyInvested && (
              <View style={styles.alreadyInvestedCard}>
                <Text style={styles.alreadyInvestedText}>
                  이미 {formatNumber(eligibility.investedShares)}주 투자하셨습니다
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 투자 버튼 */}
      <View style={styles.bottomBar}>
        <View style={styles.balanceInfo}>
          <Text style={styles.balanceLabel}>보유 잔액</Text>
          <Text style={styles.balanceValue}>{formatNumber(userBalance)}원</Text>
        </View>
        <TouchableOpacity
          style={[styles.investButton, !canInvest() && styles.investButtonDisabled]}
          onPress={() => setShowInvestModal(true)}
          disabled={!canInvest()}
        >
          <Text style={styles.investButtonText}>
            {!user
              ? '로그인 필요'
              : eligibility?.alreadyInvested
              ? '투자 완료'
              : !eligibility?.isEligible
              ? '자격 미달'
              : round.status !== 'active'
              ? '진행 중 아님'
              : '투자하기'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 투자 모달 */}
      <Modal visible={showInvestModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pre-IPO 투자</Text>

            <View style={styles.modalInfo}>
              <Text style={styles.modalInfoLabel}>주당 가격</Text>
              <Text style={styles.modalInfoValue}>{formatNumber(round.pricePerShare)}원</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>투자 수량</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={investShares}
                  onChangeText={setInvestShares}
                  placeholder={`최소 ${round.minInvestmentShares}주`}
                  placeholderTextColor="#666"
                  keyboardType="number-pad"
                />
                <Text style={styles.inputSuffix}>주</Text>
              </View>
              <View style={styles.quickButtons}>
                {[10, 50, 100, 500].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.quickButton}
                    onPress={() => setInvestShares(String(amount))}
                  >
                    <Text style={styles.quickButtonText}>{amount}주</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {round.eligibilityType === 'invited_only' && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>초대 코드 (선택)</Text>
                <TextInput
                  style={styles.input}
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  placeholder="초대 코드 입력"
                  placeholderTextColor="#666"
                />
              </View>
            )}

            {/* 투자 금액 계산 */}
            <View style={styles.calculation}>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>투자 금액</Text>
                <Text style={styles.calcValue}>{formatNumber(investment.totalAmount)}원</Text>
              </View>
              {investment.isEarlyBird && investment.discount > 0 && (
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabelDiscount}>얼리버드 할인</Text>
                  <Text style={styles.calcValueDiscount}>-{formatNumber(investment.discount)}원</Text>
                </View>
              )}
              <View style={[styles.calcRow, styles.calcTotal]}>
                <Text style={styles.calcLabelTotal}>최종 결제 금액</Text>
                <Text style={styles.calcValueTotal}>{formatNumber(investment.finalAmount)}원</Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowInvestModal(false);
                  setInvestShares('');
                  setInviteCode('');
                }}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, investing && styles.confirmButtonDisabled]}
                onPress={handleInvest}
                disabled={investing}
              >
                {investing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>투자하기</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.backgroundPure,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#888',
    fontSize: 16,
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
  content: {
    flex: 1,
  },
  issuerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: t.colors.textPrimary,
  },
  issuerAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 16,
    backgroundColor: '#333',
  },
  issuerInfo: {
    flex: 1,
  },
  issuerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  roundName: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  eligibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eligibilityIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  eligibilityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  countdownBanner: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  countdownLabel: {
    fontSize: 14,
    color: '#91B8FB',
    marginBottom: 4,
  },
  countdownTime: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    backgroundColor: t.colors.textPrimary,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 22,
  },
  priceGrid: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  priceCard: {
    flex: 1,
    backgroundColor: t.colors.surfaceRaised,
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: t.colors.success,
  },
  expectedPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#888',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    fontSize: 12,
    color: t.colors.error,
    marginTop: 4,
  },
  conditionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  conditionLabel: {
    fontSize: 14,
    color: '#888',
  },
  conditionValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#888',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: 'bold',
    color: t.colors.success,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#333',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  earlyBirdCard: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  earlyBirdTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  earlyBirdDesc: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  earlyBirdRemaining: {
    fontSize: 13,
    color: '#fff',
    marginTop: 8,
    fontWeight: '600',
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  scheduleLabel: {
    fontSize: 14,
    color: '#888',
  },
  scheduleValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  eligibleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF5020',
    padding: 12,
    borderRadius: 8,
  },
  eligibleIcon: {
    fontSize: 20,
    color: t.colors.success,
    marginRight: 8,
  },
  eligibleText: {
    fontSize: 14,
    color: t.colors.success,
  },
  ineligibleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4433620',
    padding: 12,
    borderRadius: 8,
  },
  ineligibleIcon: {
    fontSize: 20,
    color: t.colors.error,
    marginRight: 8,
  },
  ineligibleText: {
    fontSize: 14,
    color: t.colors.error,
  },
  alreadyInvestedCard: {
    backgroundColor: '#2196F320',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  alreadyInvestedText: {
    fontSize: 14,
    color: t.colors.primary,
    textAlign: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: t.colors.textPrimary,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#888',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  investButton: {
    backgroundColor: t.colors.success,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  investButtonDisabled: {
    backgroundColor: '#444',
  },
  investButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: t.colors.textPrimary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 16,
  },
  modalInfoLabel: {
    fontSize: 14,
    color: '#888',
  },
  modalInfoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: t.colors.success,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: t.colors.surfaceRaised,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#fff',
  },
  inputSuffix: {
    fontSize: 16,
    color: '#888',
    marginLeft: 8,
  },
  quickButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  quickButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  quickButtonText: {
    fontSize: 13,
    color: '#fff',
  },
  calculation: {
    backgroundColor: t.colors.surfaceRaised,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calcLabel: {
    fontSize: 14,
    color: '#888',
  },
  calcValue: {
    fontSize: 14,
    color: '#fff',
  },
  calcLabelDiscount: {
    fontSize: 14,
    color: t.colors.warning,
  },
  calcValueDiscount: {
    fontSize: 14,
    color: t.colors.warning,
  },
  calcTotal: {
    borderTopWidth: 1,
    borderTopColor: '#444',
    paddingTop: 8,
    marginTop: 8,
    marginBottom: 0,
  },
  calcLabelTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  calcValueTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: t.colors.success,
  },
  modalButtons: {
    flexDirection: 'row',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 14,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: t.colors.success,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#444',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
