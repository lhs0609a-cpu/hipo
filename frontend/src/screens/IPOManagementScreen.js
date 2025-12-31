import React, { useState, useEffect, useCallback } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ipoStatus, setIpoStatus] = useState(null);
  const [lockupStatus, setLockupStatus] = useState(null);
  const [tierCheck, setTierCheck] = useState(null);

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
      const [statusRes, lockupRes, tierRes] = await Promise.all([
        ipoAPI.getMyStatus(),
        ipoAPI.getLockupStatus(),
        ipoAPI.checkTierUpgrade(),
      ]);
      setIpoStatus(statusRes.data);
      setLockupStatus(lockupRes.data);
      setTierCheck(tierRes.data);
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
      BRONZE: '#CD7F32',
      SILVER: '#C0C0C0',
      GOLD: '#FFD700',
      PLATINUM: '#E5E4E2',
      DIAMOND: '#B9F2FF',
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3182F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
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
            <Ionicons name="lock-closed" size={24} color="#F04452" />
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
              <Ionicons name="add-circle" size={24} color="#3182F6" />
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
              <Ionicons name="arrow-down-circle" size={24} color="#00C471" />
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
              <Ionicons name="flame" size={24} color="#F04452" />
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
              <Ionicons name="close-circle" size={24} color="#FF0000" />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: '#FF0000' }]}>상장폐지 요청</Text>
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
                style={[styles.confirmButton, { backgroundColor: '#F04452' }]}
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
            <Text style={[styles.modalTitle, { color: '#FF0000' }]}>상장폐지 요청</Text>
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
                style={[styles.confirmButton, { backgroundColor: '#FF0000' }]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  tierCard: {
    backgroundColor: '#fff',
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
    fontWeight: '700',
    marginBottom: 4,
  },
  stockPrice: {
    fontSize: 14,
    color: '#666',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3182F6',
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  requirementsBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  requirementsTitle: {
    fontSize: 14,
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
    color: '#666',
  },
  requirementValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  lockupCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F5',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#F04452',
    marginBottom: 4,
  },
  lockupDesc: {
    fontSize: 14,
    color: '#666',
  },
  lockupAmount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
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
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuDesc: {
    fontSize: 13,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  estimatedAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3182F6',
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
    backgroundColor: '#f0f0f0',
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
    backgroundColor: '#3182F6',
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

export default IPOManagementScreen;
