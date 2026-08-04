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
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ipoAPI } from '../services/api';

const IPOManagementScreen = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ipoStatus, setIpoStatus] = useState(null);
  const [lockupStatus, setLockupStatus] = useState(null);
  const [tierCheck, setTierCheck] = useState(null);
  const [eligibility, setEligibility] = useState(null);

  // Modals
  const [secondaryModalVisible, setSecondaryModalVisible] = useState(false);
  const [buybackModalVisible, setBuybackModalVisible] = useState(false);
  const [burnModalVisible, setBurnModalVisible] = useState(false);
  const [delistingModalVisible, setDelistingModalVisible] = useState(false);

  // Form states
  const [secondaryShares, setSecondaryShares] = useState('');
  const [secondaryPrice, setSecondaryPrice] = useState('');
  const [buybackShares, setBuybackShares] = useState('');
  const [buybackMaxPrice, setBuybackMaxPrice] = useState('');
  const [burnShares, setBurnShares] = useState('');
  const [delistingReason, setDelistingReason] = useState('');
  const [buybackPrice, setBuybackPrice] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const statusRes = await ipoAPI.getMyStatus();
      setIpoStatus(statusRes.data);

      // 상장된 경우에만 추가 정보 조회
      if (statusRes.data.hasStock) {
        const [lockupRes, tierRes] = await Promise.all([
          ipoAPI.getLockupStatus(),
          ipoAPI.checkTierUpgrade(),
        ]);
        setLockupStatus(lockupRes.data);
        setTierCheck(tierRes.data);
      } else {
        // 상장되지 않은 경우 자격 확인
        const eligibilityRes = await ipoAPI.checkEligibility();
        setEligibility(eligibilityRes.data);
      }
    } catch (error) {
      console.error('Error fetching IPO data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const getTierColor = (tier) => {
    const colors = {
      BRONZE: '#B87333',
      SILVER: '#9BA3AF',
      GOLD: '#D9A521',
      PLATINUM: '#6E8CA0',
      DIAMOND: '#3FB6C9',
    };
    return colors[tier] || '#999';
  };

  const getTierIcon = (tier) => {
    const icons = {
      BRONZE: 'shield-outline',
      SILVER: 'shield',
      GOLD: 'trophy',
      PLATINUM: 'diamond-outline',
      DIAMOND: 'diamond',
    };
    return icons[tier] || 'shield-outline';
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    return num.toLocaleString();
  };

  const handleSecondaryOffering = async () => {
    if (!secondaryShares || !secondaryPrice) {
      Alert.alert('오류', '모든 필드를 입력해주세요');
      return;
    }

    try {
      await ipoAPI.secondaryOffering(parseInt(secondaryShares), parseInt(secondaryPrice));
      Alert.alert('성공', '유상증자가 신청되었습니다');
      setSecondaryModalVisible(false);
      setSecondaryShares('');
      setSecondaryPrice('');
      fetchData();
    } catch (error) {
      Alert.alert('오류', error.response?.data?.message || '유상증자 신청에 실패했습니다');
    }
  };

  const handleBuyback = async () => {
    if (!buybackShares || !buybackMaxPrice) {
      Alert.alert('오류', '모든 필드를 입력해주세요');
      return;
    }

    try {
      await ipoAPI.buyback(parseInt(buybackShares), parseInt(buybackMaxPrice));
      Alert.alert('성공', '자사주 매입이 진행되었습니다');
      setBuybackModalVisible(false);
      setBuybackShares('');
      setBuybackMaxPrice('');
      fetchData();
    } catch (error) {
      Alert.alert('오류', error.response?.data?.message || '자사주 매입에 실패했습니다');
    }
  };

  const handleBurnTreasury = async () => {
    if (!burnShares) {
      Alert.alert('오류', '소각할 주식 수를 입력해주세요');
      return;
    }

    Alert.alert(
      '자사주 소각 확인',
      `${formatNumber(parseInt(burnShares))}주를 소각하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '소각',
          style: 'destructive',
          onPress: async () => {
            try {
              await ipoAPI.burnTreasury(parseInt(burnShares));
              Alert.alert('성공', '자사주가 소각되었습니다');
              setBurnModalVisible(false);
              setBurnShares('');
              fetchData();
            } catch (error) {
              Alert.alert('오류', error.response?.data?.message || '자사주 소각에 실패했습니다');
            }
          },
        },
      ]
    );
  };

  const handleTierUpgrade = async () => {
    try {
      await ipoAPI.upgradeTier();
      Alert.alert('성공', '티어가 업그레이드되었습니다!');
      fetchData();
    } catch (error) {
      Alert.alert('오류', error.response?.data?.message || '티어 업그레이드에 실패했습니다');
    }
  };

  const handleRequestDelisting = async () => {
    if (!delistingReason || !buybackPrice) {
      Alert.alert('오류', '모든 필드를 입력해주세요');
      return;
    }

    Alert.alert(
      '상장폐지 요청',
      '정말로 상장폐지를 요청하시겠습니까?\n모든 주주에게 매입가를 지불해야 합니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '요청',
          style: 'destructive',
          onPress: async () => {
            try {
              await ipoAPI.requestDelisting(delistingReason, parseInt(buybackPrice));
              Alert.alert('성공', '상장폐지 요청이 제출되었습니다');
              setDelistingModalVisible(false);
              fetchData();
            } catch (error) {
              Alert.alert('오류', error.response?.data?.message || '상장폐지 요청에 실패했습니다');
            }
          },
        },
      ]
    );
  };

  const getProgressColor = (progress) => {
    if (progress >= 100) return '#00B368';
    if (progress >= 60) return '#F59B00';
    return '#F0344B';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2B5FE3" />
      </View>
    );
  }

  // 상장되지 않은 경우 자격 확인 화면으로 안내
  if (!ipoStatus?.hasStock) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>IPO 관리</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* 상장 안내 카드 */}
          <View style={styles.notListedCard}>
            <View style={styles.notListedIcon}>
              <Ionicons name="rocket-outline" size={48} color="#2B5FE3" />
            </View>
            <Text style={styles.notListedTitle}>아직 상장하지 않았습니다</Text>
            <Text style={styles.notListedDesc}>
              나만의 주식을 발행하고 투자를 받아보세요!{'\n'}
              팔로워와 함께 성장할 수 있습니다.
            </Text>

            {/* 자격 진행률 */}
            {eligibility && (
              <View style={styles.eligibilityPreview}>
                <View style={styles.eligibilityHeader}>
                  <Text style={styles.eligibilityLabel}>상장 자격</Text>
                  <Text style={[styles.eligibilityPercent, { color: getProgressColor(eligibility.overallProgress || 0) }]}>
                    {eligibility.overallProgress || 0}%
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${eligibility.overallProgress || 0}%`,
                        backgroundColor: getProgressColor(eligibility.overallProgress || 0),
                      },
                    ]}
                  />
                </View>
                {eligibility.isEligible ? (
                  <Text style={styles.eligibleText}>상장 자격을 충족했습니다!</Text>
                ) : (
                  <Text style={styles.notEligibleText}>
                    {5 - Math.floor((eligibility.overallProgress || 0) / 20)}개 요건을 더 충족해야 합니다
                  </Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.checkEligibilityButton}
              onPress={() => navigation.navigate('IPOEligibility')}
            >
              <Text style={styles.checkEligibilityButtonText}>상장 자격 확인하기</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* 상장 혜택 안내 */}
          <View style={styles.benefitsSection}>
            <Text style={styles.benefitsSectionTitle}>상장 혜택</Text>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: '#E7F8F0' }]}>
                <Ionicons name="cash-outline" size={24} color="#00B368" />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>투자 유치</Text>
                <Text style={styles.benefitDesc}>팬들의 투자를 받아 자금을 조달할 수 있습니다</Text>
              </View>
            </View>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: '#EEF4FF' }]}>
                <Ionicons name="trending-up-outline" size={24} color="#2B5FE3" />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>가치 상승</Text>
                <Text style={styles.benefitDesc}>활동에 따라 주가가 상승하고 모두가 이익을 얻습니다</Text>
              </View>
            </View>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: '#FFF6E6' }]}>
                <Ionicons name="people-outline" size={24} color="#F59B00" />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>커뮤니티</Text>
                <Text style={styles.benefitDesc}>주주 전용 커뮤니티에서 팬들과 소통할 수 있습니다</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>IPO 관리</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 티어 정보 */}
        {ipoStatus?.stock && (
          <View style={styles.tierCard}>
            <View style={styles.tierHeader}>
              <View style={[styles.tierBadge, { backgroundColor: getTierColor(ipoStatus.stock.tier) + '20' }]}>
                <Ionicons
                  name={getTierIcon(ipoStatus.stock.tier)}
                  size={32}
                  color={getTierColor(ipoStatus.stock.tier)}
                />
              </View>
              <View style={styles.tierInfo}>
                <Text style={styles.tierLabel}>{ipoStatus.stock.tier} 티어</Text>
                <Text style={styles.stockPrice}>
                  현재가: {formatNumber(ipoStatus.stock.currentPrice)} PO
                </Text>
              </View>
            </View>

            {tierCheck?.eligible && (
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={handleTierUpgrade}
              >
                <Ionicons name="arrow-up-circle" size={20} color="#fff" />
                <Text style={styles.upgradeButtonText}>
                  {tierCheck.nextTier} 티어로 업그레이드
                </Text>
              </TouchableOpacity>
            )}

            {tierCheck && !tierCheck.eligible && tierCheck.requirements && (
              <View style={styles.requirementsBox}>
                <Text style={styles.requirementsTitle}>
                  {tierCheck.nextTier} 티어 업그레이드 조건
                </Text>
                {Object.entries(tierCheck.requirements).map(([key, value]) => (
                  <View key={key} style={styles.requirementRow}>
                    <Text style={styles.requirementLabel}>{key}</Text>
                    <Text style={styles.requirementValue}>{value}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 락업 상태 */}
        {lockupStatus?.hasLockup && (
          <View style={styles.lockupCard}>
            <Ionicons name="lock-closed" size={24} color="#F0344B" />
            <View style={styles.lockupInfo}>
              <Text style={styles.lockupTitle}>락업 기간 중</Text>
              <Text style={styles.lockupDesc}>
                {lockupStatus.remainingDays}일 남음 ({lockupStatus.endsAt})
              </Text>
              <Text style={styles.lockupAmount}>
                락업 물량: {formatNumber(lockupStatus.lockedShares)}주
              </Text>
            </View>
          </View>
        )}

        {/* 주식 현황 */}
        {ipoStatus?.stock && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>주식 현황</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>발행 주식</Text>
                <Text style={styles.statValue}>
                  {formatNumber(ipoStatus.stock.totalShares)}주
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>유통 주식</Text>
                <Text style={styles.statValue}>
                  {formatNumber(ipoStatus.stock.availableShares)}주
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>자사주</Text>
                <Text style={styles.statValue}>
                  {formatNumber(ipoStatus.stock.treasuryShares || 0)}주
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>시가총액</Text>
                <Text style={styles.statValue}>
                  {formatNumber(ipoStatus.stock.marketCap)} PO
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 관리 메뉴 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>주식 관리</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setSecondaryModalVisible(true)}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#3182F620' }]}>
              <Ionicons name="add-circle" size={24} color="#2B5FE3" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>유상증자</Text>
              <Text style={styles.menuDesc}>새로운 주식을 발행하여 자금 조달</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setBuybackModalVisible(true)}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#00C47120' }]}>
              <Ionicons name="arrow-down-circle" size={24} color="#00B368" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>자사주 매입</Text>
              <Text style={styles.menuDesc}>시장에서 자사주 매입</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setBurnModalVisible(true)}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#F0445220' }]}>
              <Ionicons name="flame" size={24} color="#F0344B" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>자사주 소각</Text>
              <Text style={styles.menuDesc}>보유 자사주를 소각하여 주가 상승</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.dangerMenu]}
            onPress={() => setDelistingModalVisible(true)}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#FF000020' }]}>
              <Ionicons name="close-circle" size={24} color="#F0344B" />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: '#F0344B' }]}>상장폐지 요청</Text>
              <Text style={styles.menuDesc}>주식 상장을 취소합니다</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 유상증자 모달 */}
      <Modal visible={secondaryModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>유상증자</Text>
            <Text style={styles.modalDesc}>
              새로운 주식을 발행하여 자금을 조달합니다
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>발행 주식 수</Text>
              <TextInput
                style={styles.input}
                value={secondaryShares}
                onChangeText={setSecondaryShares}
                placeholder="예: 1000"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>주당 발행가 (PO)</Text>
              <TextInput
                style={styles.input}
                value={secondaryPrice}
                onChangeText={setSecondaryPrice}
                placeholder="예: 10000"
                keyboardType="number-pad"
              />
            </View>

            {secondaryShares && secondaryPrice && (
              <Text style={styles.estimatedAmount}>
                예상 조달 금액: {formatNumber(parseInt(secondaryShares) * parseInt(secondaryPrice))} PO
              </Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setSecondaryModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleSecondaryOffering}
              >
                <Text style={styles.confirmButtonText}>신청</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 자사주 매입 모달 */}
      <Modal visible={buybackModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>자사주 매입</Text>
            <Text style={styles.modalDesc}>
              시장에서 자사주를 매입합니다
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>매입 주식 수</Text>
              <TextInput
                style={styles.input}
                value={buybackShares}
                onChangeText={setBuybackShares}
                placeholder="예: 500"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>최대 매입가 (PO)</Text>
              <TextInput
                style={styles.input}
                value={buybackMaxPrice}
                onChangeText={setBuybackMaxPrice}
                placeholder="예: 11000"
                keyboardType="number-pad"
              />
            </View>

            {buybackShares && buybackMaxPrice && (
              <Text style={styles.estimatedAmount}>
                최대 비용: {formatNumber(parseInt(buybackShares) * parseInt(buybackMaxPrice))} PO
              </Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setBuybackModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleBuyback}
              >
                <Text style={styles.confirmButtonText}>매입</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 자사주 소각 모달 */}
      <Modal visible={burnModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>자사주 소각</Text>
            <Text style={styles.modalDesc}>
              보유 중인 자사주를 소각합니다.{'\n'}
              소각된 주식은 복구할 수 없습니다.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>소각 주식 수</Text>
              <TextInput
                style={styles.input}
                value={burnShares}
                onChangeText={setBurnShares}
                placeholder="예: 200"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setBurnModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: '#F0344B' }]}
                onPress={handleBurnTreasury}
              >
                <Text style={styles.confirmButtonText}>소각</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 상장폐지 모달 */}
      <Modal visible={delistingModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: '#F0344B' }]}>상장폐지 요청</Text>
            <Text style={styles.modalDesc}>
              상장폐지 시 모든 주주에게 매입가를 지불해야 합니다.{'\n'}
              이 작업은 되돌릴 수 없습니다.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>상장폐지 사유</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={delistingReason}
                onChangeText={setDelistingReason}
                placeholder="상장폐지 사유를 입력하세요"
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>주당 매입가 (PO)</Text>
              <TextInput
                style={styles.input}
                value={buybackPrice}
                onChangeText={setBuybackPrice}
                placeholder="주주에게 지불할 주당 가격"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setDelistingModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: '#F0344B' }]}
                onPress={handleRequestDelisting}
              >
                <Text style={styles.confirmButtonText}>요청</Text>
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
    backgroundColor: t.colors.surface,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  tierCard: {
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tierInfo: {
    flex: 1,
  },
  tierLabel: {
    fontSize: 20,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    marginBottom: 4,
  },
  stockPrice: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primary,
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  upgradeButtonText: {
    color: t.colors.surface,
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  requirementsBox: {
    backgroundColor: t.colors.background,
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    marginBottom: 12,
  },
  requirementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  requirementLabel: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  requirementValue: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  lockupCard: {
    flexDirection: 'row',
    backgroundColor: t.colors.errorBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    gap: 12,
  },
  lockupInfo: {
    flex: 1,
  },
  lockupTitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.error,
    marginBottom: 4,
  },
  lockupDesc: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  lockupAmount: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    marginTop: 4,
  },
  section: {
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    width: '47%',
    backgroundColor: t.colors.background,
    padding: 16,
    borderRadius: 12,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.backgroundSecondary,
  },
  dangerMenu: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuDesc: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 17,
    fontFamily: t.fonts.regular,
  },
  estimatedAmount: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: t.colors.backgroundSecondary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: t.colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    color: t.colors.surface,
    fontWeight: '600',
  },
  // 미상장 화면 스타일
  notListedCard: {
    backgroundColor: t.colors.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  notListedIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: t.colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  notListedTitle: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  notListedDesc: {
    fontSize: 15,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  eligibilityPreview: {
    width: '100%',
    backgroundColor: t.colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  eligibilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eligibilityLabel: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
  },
  eligibilityPercent: {
    fontSize: 20,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: t.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  eligibleText: {
    fontSize: 14,
    fontFamily: t.fonts.medium,
    color: t.colors.success,
    fontWeight: '500',
    textAlign: 'center',
  },
  notEligibleText: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    textAlign: 'center',
  },
  checkEligibilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  checkEligibilityButtonText: {
    color: t.colors.surface,
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  benefitsSection: {
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  benefitsSectionTitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.backgroundSecondary,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    lineHeight: 18,
  },
});

export default IPOManagementScreen;
