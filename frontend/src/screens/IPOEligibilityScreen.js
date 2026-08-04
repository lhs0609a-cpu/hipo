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
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ipoAPI } from '../services/api';

const IPOEligibilityScreen = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [applying, setApplying] = useState(false);

  // IPO 신청 폼
  const [initialPrice, setInitialPrice] = useState('1000');
  const [initialShares, setInitialShares] = useState('10000');
  const [category, setCategory] = useState('creator');

  const categories = [
    { value: 'entertainment', label: '연예인' },
    { value: 'sports', label: '스포츠' },
    { value: 'influencer', label: '인플루언서' },
    { value: 'business', label: '비즈니스' },
    { value: 'creator', label: '크리에이터' },
    { value: 'other', label: '기타' },
  ];

  useEffect(() => {
    fetchEligibility();
  }, []);

  const fetchEligibility = async () => {
    try {
      const response = await ipoAPI.checkEligibility();
      setEligibility(response.data);
    } catch (error) {
      console.error('Error fetching eligibility:', error);
      Alert.alert('오류', '자격 정보를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEligibility();
  }, []);

  const handleApplyIPO = async () => {
    if (!initialPrice || !initialShares) {
      Alert.alert('오류', '모든 필드를 입력해주세요');
      return;
    }

    setApplying(true);
    try {
      const response = await ipoAPI.apply({
        initialPrice: parseInt(initialPrice),
        initialShares: parseInt(initialShares),
        category,
      });

      Alert.alert(
        '상장 신청 완료',
        response.data.message,
        [
          {
            text: '확인',
            onPress: () => {
              setApplyModalVisible(false);
              navigation.navigate('IPOManagement');
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('오류', error.response?.data?.error || '상장 신청에 실패했습니다');
    } finally {
      setApplying(false);
    }
  };

  const getRequirementIcon = (met) => {
    return met ? 'checkmark-circle' : 'close-circle';
  };

  const getRequirementColor = (met) => {
    return met ? '#00B368' : '#F0344B';
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    return num.toLocaleString();
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

  if (eligibility?.alreadyListed) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>상장 자격 확인</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.alreadyListedContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#00B368" />
          <Text style={styles.alreadyListedTitle}>이미 상장되었습니다</Text>
          <Text style={styles.alreadyListedDesc}>
            IPO 관리 화면에서 주식을 관리하세요
          </Text>
          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => navigation.navigate('IPOManagement')}
          >
            <Text style={styles.manageButtonText}>IPO 관리로 이동</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>상장 자격 확인</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 전체 진행률 */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>상장 자격 진행률</Text>
            <Text style={[styles.progressPercent, { color: getProgressColor(eligibility?.overallProgress || 0) }]}>
              {eligibility?.overallProgress || 0}%
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${eligibility?.overallProgress || 0}%`,
                  backgroundColor: getProgressColor(eligibility?.overallProgress || 0),
                },
              ]}
            />
          </View>
          {eligibility?.isEligible ? (
            <View style={styles.eligibleBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#00B368" />
              <Text style={styles.eligibleText}>상장 자격 충족!</Text>
            </View>
          ) : (
            <Text style={styles.notEligibleText}>
              아래 요건을 모두 충족하면 상장을 신청할 수 있습니다
            </Text>
          )}
        </View>

        {/* 자격 요건 목록 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>자격 요건</Text>

          {/* 팔로워 수 */}
          <View style={styles.requirementItem}>
            <View style={styles.requirementHeader}>
              <Ionicons
                name={getRequirementIcon(eligibility?.requirements?.followers?.met)}
                size={24}
                color={getRequirementColor(eligibility?.requirements?.followers?.met)}
              />
              <Text style={styles.requirementTitle}>팔로워 수</Text>
            </View>
            <View style={styles.requirementBody}>
              <Text style={styles.requirementCurrent}>
                {formatNumber(eligibility?.requirements?.followers?.current)}명
              </Text>
              <Text style={styles.requirementDivider}>/</Text>
              <Text style={styles.requirementRequired}>
                {formatNumber(eligibility?.requirements?.followers?.required)}명
              </Text>
            </View>
            {!eligibility?.requirements?.followers?.met && (
              <View style={styles.requirementProgress}>
                <View style={styles.progressBarSmallContainer}>
                  <View
                    style={[
                      styles.progressBarSmall,
                      {
                        width: `${Math.min(100, (eligibility?.requirements?.followers?.current / eligibility?.requirements?.followers?.required) * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.remainingText}>
                  {formatNumber(eligibility?.requirements?.followers?.remaining)}명 더 필요
                </Text>
              </View>
            )}
          </View>

          {/* 활동 기간 */}
          <View style={styles.requirementItem}>
            <View style={styles.requirementHeader}>
              <Ionicons
                name={getRequirementIcon(eligibility?.requirements?.activityPeriod?.met)}
                size={24}
                color={getRequirementColor(eligibility?.requirements?.activityPeriod?.met)}
              />
              <Text style={styles.requirementTitle}>활동 기간</Text>
            </View>
            <View style={styles.requirementBody}>
              <Text style={styles.requirementCurrent}>
                {eligibility?.requirements?.activityPeriod?.current}일
              </Text>
              <Text style={styles.requirementDivider}>/</Text>
              <Text style={styles.requirementRequired}>
                {eligibility?.requirements?.activityPeriod?.required}일
              </Text>
            </View>
            {!eligibility?.requirements?.activityPeriod?.met && (
              <View style={styles.requirementProgress}>
                <View style={styles.progressBarSmallContainer}>
                  <View
                    style={[
                      styles.progressBarSmall,
                      {
                        width: `${Math.min(100, (eligibility?.requirements?.activityPeriod?.current / eligibility?.requirements?.activityPeriod?.required) * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.remainingText}>
                  {eligibility?.requirements?.activityPeriod?.remaining}일 남음
                </Text>
              </View>
            )}
          </View>

          {/* 본인 인증 */}
          <View style={styles.requirementItem}>
            <View style={styles.requirementHeader}>
              <Ionicons
                name={getRequirementIcon(eligibility?.requirements?.identityVerification?.met)}
                size={24}
                color={getRequirementColor(eligibility?.requirements?.identityVerification?.met)}
              />
              <Text style={styles.requirementTitle}>본인 인증</Text>
            </View>
            <View style={styles.requirementBody}>
              <Text
                style={[
                  styles.requirementStatus,
                  { color: eligibility?.requirements?.identityVerification?.met ? '#00B368' : '#F0344B' },
                ]}
              >
                {eligibility?.requirements?.identityVerification?.verified ? '완료' : '미완료'}
              </Text>
            </View>
            {!eligibility?.requirements?.identityVerification?.met && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('SecuritySettings')}
              >
                <Text style={styles.actionButtonText}>본인인증 하러가기</Text>
                <Ionicons name="chevron-forward" size={16} color="#2B5FE3" />
              </TouchableOpacity>
            )}
          </View>

          {/* 콘텐츠 점수 */}
          <View style={styles.requirementItem}>
            <View style={styles.requirementHeader}>
              <Ionicons
                name={getRequirementIcon(eligibility?.requirements?.contentScore?.met)}
                size={24}
                color={getRequirementColor(eligibility?.requirements?.contentScore?.met)}
              />
              <Text style={styles.requirementTitle}>콘텐츠 점수</Text>
            </View>
            <View style={styles.requirementBody}>
              <Text style={styles.requirementCurrent}>
                {eligibility?.requirements?.contentScore?.current?.toFixed(1)}점
              </Text>
              <Text style={styles.requirementDivider}>/</Text>
              <Text style={styles.requirementRequired}>
                {eligibility?.requirements?.contentScore?.required}점
              </Text>
            </View>
            {!eligibility?.requirements?.contentScore?.met && (
              <View style={styles.requirementProgress}>
                <View style={styles.progressBarSmallContainer}>
                  <View
                    style={[
                      styles.progressBarSmall,
                      {
                        width: `${Math.min(100, (eligibility?.requirements?.contentScore?.current / eligibility?.requirements?.contentScore?.required) * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.remainingText}>
                  {eligibility?.requirements?.contentScore?.remaining?.toFixed(1)}점 더 필요
                </Text>
              </View>
            )}
          </View>

          {/* 프로필 완성도 */}
          <View style={styles.requirementItem}>
            <View style={styles.requirementHeader}>
              <Ionicons
                name={getRequirementIcon(eligibility?.requirements?.profileCompleteness?.met)}
                size={24}
                color={getRequirementColor(eligibility?.requirements?.profileCompleteness?.met)}
              />
              <Text style={styles.requirementTitle}>프로필 완성도</Text>
            </View>
            <View style={styles.requirementBody}>
              <Text style={styles.requirementCurrent}>
                {eligibility?.requirements?.profileCompleteness?.current}%
              </Text>
              <Text style={styles.requirementDivider}>/</Text>
              <Text style={styles.requirementRequired}>
                {eligibility?.requirements?.profileCompleteness?.required}%
              </Text>
            </View>
            {!eligibility?.requirements?.profileCompleteness?.met && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('EditProfile')}
              >
                <Text style={styles.actionButtonText}>프로필 수정하기</Text>
                <Ionicons name="chevron-forward" size={16} color="#2B5FE3" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 팁 섹션 */}
        {eligibility?.tips && eligibility.tips.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>개선 팁</Text>
            {eligibility.tips.map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <Ionicons
                  name="bulb"
                  size={20}
                  color={tip.priority === 'high' ? '#F59B00' : '#999'}
                />
                <Text style={styles.tipText}>{tip.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 상장 신청 버튼 */}
        {eligibility?.isEligible && (
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => setApplyModalVisible(true)}
          >
            <Ionicons name="rocket" size={24} color="#fff" />
            <Text style={styles.applyButtonText}>상장 신청하기</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* 상장 신청 모달 */}
      <Modal visible={applyModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>상장 신청</Text>
            <Text style={styles.modalDesc}>
              상장 정보를 입력해주세요.{'\n'}
              상장 후 30일간 락업 기간이 적용됩니다.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>카테고리</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryContainer}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryChip,
                        category === cat.value && styles.categoryChipActive,
                      ]}
                      onPress={() => setCategory(cat.value)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          category === cat.value && styles.categoryChipTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>초기 주가 (PO)</Text>
              <TextInput
                style={styles.input}
                value={initialPrice}
                onChangeText={setInitialPrice}
                placeholder="예: 1000"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>초기 발행량 (주)</Text>
              <TextInput
                style={styles.input}
                value={initialShares}
                onChangeText={setInitialShares}
                placeholder="예: 10000"
                keyboardType="number-pad"
              />
            </View>

            {initialPrice && initialShares && (
              <View style={styles.estimateBox}>
                <Text style={styles.estimateLabel}>예상 시가총액</Text>
                <Text style={styles.estimateValue}>
                  {formatNumber(parseInt(initialPrice) * parseInt(initialShares))} PO
                </Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setApplyModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, applying && styles.confirmButtonDisabled]}
                onPress={handleApplyIPO}
                disabled={applying}
              >
                {applying ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>신청하기</Text>
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
  alreadyListedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  alreadyListedTitle: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
  },
  alreadyListedDesc: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  manageButton: {
    backgroundColor: t.colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  manageButtonText: {
    color: t.colors.surface,
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  progressCard: {
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 28,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: t.colors.backgroundSecondary,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  eligibleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.successBackground,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  eligibleText: {
    color: t.colors.success,
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  notEligibleText: {
    color: t.colors.textSecondary,
    fontSize: 14,
    fontFamily: t.fonts.regular,
    textAlign: 'center',
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
  requirementItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.backgroundSecondary,
  },
  requirementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  requirementTitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  requirementBody: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 36,
  },
  requirementCurrent: {
    fontSize: 20,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.primary,
  },
  requirementDivider: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    marginHorizontal: 8,
  },
  requirementRequired: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  requirementStatus: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  requirementProgress: {
    marginLeft: 36,
    marginTop: 12,
  },
  progressBarSmallContainer: {
    height: 6,
    backgroundColor: t.colors.backgroundSecondary,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarSmall: {
    height: '100%',
    backgroundColor: t.colors.primary,
    borderRadius: 3,
  },
  remainingText: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 36,
    marginTop: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: t.fonts.medium,
    color: t.colors.primary,
    fontWeight: '500',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.backgroundSecondary,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textPrimary,
    lineHeight: 20,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primary,
    padding: 18,
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
  },
  applyButtonText: {
    color: t.colors.surface,
    fontSize: 17,
    fontFamily: t.fonts.semibold,
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
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
    color: t.colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 17,
    fontFamily: t.fonts.regular,
    backgroundColor: t.colors.surface,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  categoryChipActive: {
    backgroundColor: t.colors.primary,
    borderColor: t.colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  categoryChipTextActive: {
    color: t.colors.surface,
    fontWeight: '600',
  },
  estimateBox: {
    backgroundColor: t.colors.primaryBackground,
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  estimateLabel: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    marginBottom: 4,
  },
  estimateValue: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: t.colors.backgroundSecondary,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 17,
    fontFamily: t.fonts.medium,
    color: t.colors.textSecondary,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: t.colors.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    color: t.colors.surface,
    fontWeight: '600',
  },
});

export default IPOEligibilityScreen;
