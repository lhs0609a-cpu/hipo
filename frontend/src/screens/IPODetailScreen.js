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
  Image,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ipoOfferingAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const IPODetailScreen = ({ navigation, route }) => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { offeringId } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offering, setOffering] = useState(null);
  const [subscribeModalVisible, setSubscribeModalVisible] = useState(false);
  const [shares, setShares] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    fetchOfferingDetail();
  }, [offeringId]);

  useEffect(() => {
    if (offering?.phase === 'subscription' && offering?.timeRemaining > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1000) {
            clearInterval(timer);
            fetchOfferingDetail();
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
      setCountdown(offering.timeRemaining);
      return () => clearInterval(timer);
    }
  }, [offering?.phase, offering?.timeRemaining]);

  const fetchOfferingDetail = async () => {
    try {
      const response = await ipoOfferingAPI.getOfferingDetail(offeringId);
      setOffering(response.data);
    } catch (error) {
      console.error('Error fetching offering:', error);
      Alert.alert('오류', '공모 정보를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOfferingDetail();
  }, []);

  const handleSubscribe = async () => {
    if (!shares || parseInt(shares) < 1) {
      Alert.alert('오류', '청약 수량을 입력해주세요');
      return;
    }

    const shareCount = parseInt(shares);
    if (shareCount < offering.minSubscriptionShares) {
      Alert.alert('오류', `최소 ${offering.minSubscriptionShares}주 이상 청약해야 합니다`);
      return;
    }
    if (shareCount > offering.maxSubscriptionShares) {
      Alert.alert('오류', `최대 ${offering.maxSubscriptionShares}주까지 청약 가능합니다`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await ipoOfferingAPI.subscribe(offeringId, shareCount);
      Alert.alert('청약 완료', response.data.message, [
        { text: '확인', onPress: () => {
          setSubscribeModalVisible(false);
          fetchOfferingDetail();
        }}
      ]);
    } catch (error) {
      Alert.alert('오류', error.response?.data?.error || '청약에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      '청약 취소',
      '청약을 취소하시겠습니까? 증거금이 환불됩니다.',
      [
        { text: '아니오', style: 'cancel' },
        {
          text: '취소하기',
          style: 'destructive',
          onPress: async () => {
            try {
              await ipoOfferingAPI.cancelSubscription(offering.mySubscription.id);
              Alert.alert('완료', '청약이 취소되었습니다');
              fetchOfferingDetail();
            } catch (error) {
              Alert.alert('오류', error.response?.data?.error || '청약 취소에 실패했습니다');
            }
          }
        }
      ]
    );
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    return num.toLocaleString();
  };

  const formatCountdown = (ms) => {
    if (!ms || ms <= 0) return '마감';
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (days > 0) return `${days}일 ${hours}시간`;
    if (hours > 0) return `${hours}시간 ${minutes}분`;
    return `${minutes}분 ${seconds}초`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getCompetitionColor = (rate) => {
    if (rate >= 300) return '#F0344B';
    if (rate >= 100) return '#F59B00';
    return '#00B368';
  };

  const getPhaseInfo = (phase) => {
    switch (phase) {
      case 'upcoming': return { label: '청약 예정', color: '#2B5FE3' };
      case 'subscription': return { label: '청약 진행중', color: '#00B368' };
      case 'allocation': return { label: '배정 중', color: '#F59B00' };
      case 'listing': return { label: '상장 예정', color: '#8B5CF6' };
      case 'listed': return { label: '상장 완료', color: '#666' };
      default: return { label: '대기', color: '#999' };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2B5FE3" />
      </View>
    );
  }

  if (!offering) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
        <Text style={styles.errorText}>공모 정보를 찾을 수 없습니다</Text>
      </View>
    );
  }

  const phaseInfo = getPhaseInfo(offering.phase);
  const canSubscribe = offering.phase === 'subscription' && !offering.mySubscription;
  const depositAmount = shares ? parseInt(shares) * offering.offeringPrice : 0;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>공모 상세</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 발행자 정보 */}
        <View style={styles.issuerCard}>
          <Image
            source={{ uri: offering.issuer?.profileImage || 'https://via.placeholder.com/80' }}
            style={styles.issuerImage}
          />
          <Text style={styles.issuerName}>{offering.issuer?.displayName || offering.issuer?.username}</Text>
          <Text style={styles.issuerBio}>{offering.issuer?.bio || '소개가 없습니다'}</Text>
          <View style={[styles.phaseBadge, { backgroundColor: phaseInfo.color + '20' }]}>
            <Text style={[styles.phaseText, { color: phaseInfo.color }]}>{phaseInfo.label}</Text>
          </View>
        </View>

        {/* 카운트다운 */}
        {offering.phase === 'subscription' && (
          <View style={styles.countdownCard}>
            <Text style={styles.countdownLabel}>청약 마감까지</Text>
            <Text style={styles.countdownValue}>{formatCountdown(countdown)}</Text>
          </View>
        )}

        {/* 경쟁률 */}
        <View style={styles.competitionCard}>
          <View style={styles.competitionHeader}>
            <Text style={styles.competitionLabel}>현재 경쟁률</Text>
            <Text style={[styles.competitionRate, { color: getCompetitionColor(offering.competitionRate) }]}>
              {offering.competitionRate?.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(100, offering.competitionRate)}%`,
                  backgroundColor: getCompetitionColor(offering.competitionRate)
                }
              ]}
            />
          </View>
          <View style={styles.competitionStats}>
            <Text style={styles.competitionStat}>
              청약 신청: {formatNumber(offering.subscribedShares)}주 / {formatNumber(offering.totalShares)}주
            </Text>
            <Text style={styles.competitionStat}>
              청약 인원: {formatNumber(offering.subscriberCount)}명
            </Text>
          </View>
        </View>

        {/* 공모 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>공모 정보</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>공모가</Text>
              <Text style={styles.infoValue}>{formatNumber(offering.offeringPrice)} PO</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>공모 수량</Text>
              <Text style={styles.infoValue}>{formatNumber(offering.totalShares)}주</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>예상 시가총액</Text>
              <Text style={styles.infoValue}>{formatNumber(offering.offeringPrice * offering.totalShares)} PO</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>1인 최대</Text>
              <Text style={styles.infoValue}>{formatNumber(offering.maxSubscriptionShares)}주</Text>
            </View>
          </View>
        </View>

        {/* 일정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>일정</Text>
          <View style={styles.scheduleItem}>
            <View style={[styles.scheduleDot, { backgroundColor: '#2B5FE3' }]} />
            <View style={styles.scheduleContent}>
              <Text style={styles.scheduleLabel}>청약 시작</Text>
              <Text style={styles.scheduleDate}>{formatDate(offering.subscriptionStartAt)}</Text>
            </View>
          </View>
          <View style={styles.scheduleItem}>
            <View style={[styles.scheduleDot, { backgroundColor: '#F59B00' }]} />
            <View style={styles.scheduleContent}>
              <Text style={styles.scheduleLabel}>청약 마감</Text>
              <Text style={styles.scheduleDate}>{formatDate(offering.subscriptionEndAt)}</Text>
            </View>
          </View>
          <View style={styles.scheduleItem}>
            <View style={[styles.scheduleDot, { backgroundColor: '#8B5CF6' }]} />
            <View style={styles.scheduleContent}>
              <Text style={styles.scheduleLabel}>배정 발표</Text>
              <Text style={styles.scheduleDate}>{formatDate(offering.allocationAt)}</Text>
            </View>
          </View>
          <View style={styles.scheduleItem}>
            <View style={[styles.scheduleDot, { backgroundColor: '#00B368' }]} />
            <View style={styles.scheduleContent}>
              <Text style={styles.scheduleLabel}>상장 예정</Text>
              <Text style={styles.scheduleDate}>{formatDate(offering.listingAt)}</Text>
            </View>
          </View>
        </View>

        {/* 소개 */}
        {offering.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>소개</Text>
            <Text style={styles.descriptionText}>{offering.description}</Text>
          </View>
        )}

        {/* 내 청약 현황 */}
        {offering.mySubscription && (
          <View style={styles.mySubscriptionCard}>
            <Text style={styles.mySubscriptionTitle}>내 청약 현황</Text>
            <View style={styles.mySubscriptionInfo}>
              <View style={styles.mySubscriptionRow}>
                <Text style={styles.mySubscriptionLabel}>청약 수량</Text>
                <Text style={styles.mySubscriptionValue}>{formatNumber(offering.mySubscription.requestedShares)}주</Text>
              </View>
              <View style={styles.mySubscriptionRow}>
                <Text style={styles.mySubscriptionLabel}>증거금</Text>
                <Text style={styles.mySubscriptionValue}>{formatNumber(offering.mySubscription.depositAmount)} PO</Text>
              </View>
              <View style={styles.mySubscriptionRow}>
                <Text style={styles.mySubscriptionLabel}>상태</Text>
                <Text style={[styles.mySubscriptionValue, { color: '#00B368' }]}>
                  {offering.mySubscription.status === 'confirmed' ? '청약 완료' :
                   offering.mySubscription.status === 'allocated' ? '배정 완료' : offering.mySubscription.status}
                </Text>
              </View>
              {offering.mySubscription.allocatedShares > 0 && (
                <View style={styles.mySubscriptionRow}>
                  <Text style={styles.mySubscriptionLabel}>배정 수량</Text>
                  <Text style={[styles.mySubscriptionValue, { color: '#2B5FE3' }]}>
                    {formatNumber(offering.mySubscription.allocatedShares)}주
                  </Text>
                </View>
              )}
            </View>
            {offering.phase === 'subscription' && offering.mySubscription.status === 'confirmed' && (
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelSubscription}>
                <Text style={styles.cancelButtonText}>청약 취소</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* 청약 버튼 */}
      {canSubscribe && (
        <View style={styles.bottomButton}>
          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={() => setSubscribeModalVisible(true)}
          >
            <Text style={styles.subscribeButtonText}>청약 신청하기</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 청약 모달 */}
      <Modal visible={subscribeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>청약 신청</Text>

            <View style={styles.modalInfo}>
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>공모가</Text>
                <Text style={styles.modalInfoValue}>{formatNumber(offering.offeringPrice)} PO</Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>청약 가능 수량</Text>
                <Text style={styles.modalInfoValue}>{offering.minSubscriptionShares} ~ {formatNumber(offering.maxSubscriptionShares)}주</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>청약 수량</Text>
              <TextInput
                style={styles.input}
                value={shares}
                onChangeText={setShares}
                placeholder="청약할 수량 입력"
                keyboardType="number-pad"
              />
            </View>

            {shares && parseInt(shares) > 0 && (
              <View style={styles.depositBox}>
                <Text style={styles.depositLabel}>필요 증거금</Text>
                <Text style={styles.depositValue}>{formatNumber(depositAmount)} PO</Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setSubscribeModalVisible(false);
                  setShares('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, submitting && { opacity: 0.7 }]}
                onPress={handleSubscribe}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>청약하기</Text>
                )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
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
    paddingBottom: 100,
  },
  issuerCard: {
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  issuerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    backgroundColor: t.colors.backgroundSecondary,
  },
  issuerName: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    marginBottom: 8,
  },
  issuerBio: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  phaseBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  phaseText: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  countdownCard: {
    backgroundColor: t.colors.primary,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  countdownLabel: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  countdownValue: {
    fontSize: 28,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.surface,
  },
  competitionCard: {
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  competitionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  competitionLabel: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  competitionRate: {
    fontSize: 34,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  progressContainer: {
    height: 8,
    backgroundColor: t.colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  competitionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  competitionStat: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  section: {
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    width: '47%',
    backgroundColor: t.colors.background,
    padding: 14,
    borderRadius: 10,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.backgroundSecondary,
  },
  scheduleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 14,
  },
  scheduleContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scheduleLabel: {
    fontSize: 15,
    fontFamily: t.fonts.regular,
    color: t.colors.textPrimary,
  },
  scheduleDate: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  descriptionText: {
    fontSize: 15,
    fontFamily: t.fonts.regular,
    color: t.colors.textPrimary,
    lineHeight: 24,
  },
  mySubscriptionCard: {
    backgroundColor: t.colors.successBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  mySubscriptionTitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.success,
    marginBottom: 16,
  },
  mySubscriptionInfo: {
    backgroundColor: t.colors.surface,
    borderRadius: 10,
    padding: 14,
  },
  mySubscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  mySubscriptionLabel: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  mySubscriptionValue: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: t.colors.surface,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: t.fonts.medium,
    color: t.colors.error,
    fontWeight: '500',
  },
  bottomButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.backgroundSecondary,
  },
  subscribeButton: {
    backgroundColor: t.colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    color: t.colors.surface,
    fontWeight: '600',
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
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInfo: {
    backgroundColor: t.colors.background,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  modalInfoLabel: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  modalInfoValue: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
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
    borderRadius: 10,
    padding: 14,
    fontSize: 17,
    fontFamily: t.fonts.regular,
    textAlign: 'center',
  },
  depositBox: {
    backgroundColor: t.colors.primaryBackground,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  depositLabel: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    marginBottom: 4,
  },
  depositValue: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: t.colors.backgroundSecondary,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: t.colors.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    color: t.colors.surface,
    fontWeight: '600',
  },
});

export default IPODetailScreen;
