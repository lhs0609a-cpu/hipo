import React, { useState, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { virtualCelebrityAPI } from '../services/api';

const STATUS_TABS = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기' },
  { key: 'under_review', label: '검토중' },
  { key: 'approved', label: '승인' },
  { key: 'rejected', label: '거부' },
];

const STATUS_CONFIG = {
  pending: { label: '대기', color: COLORS.warning, bg: COLORS.warningBackground },
  under_review: { label: '검토중', color: '#8B5CF6', bg: '#F2EEFE' },
  approved: { label: '승인', color: COLORS.success, bg: COLORS.successBackground },
  rejected: { label: '거부', color: COLORS.danger, bg: COLORS.errorBackground },
};

const VERIFICATION_METHOD_LABELS = {
  social_media: 'SNS 인증',
  id_document: '신분증 인증',
  video_call: '영상통화 인증',
  agency_letter: '소속사 확인서',
  other: '기타',
};

function showAlert(title, message, buttons) {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed) {
        const confirmButton = buttons.find(
          (b) => b.style !== 'cancel'
        );
        if (confirmButton?.onPress) confirmButton.onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
}

export default function AdminClaimReviewScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectClaimId, setRejectClaimId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const fetchClaims = useCallback(async () => {
    try {
      const params = {};
      if (activeFilter !== 'all') {
        params.status = activeFilter;
      }
      const res = await virtualCelebrityAPI.adminListClaims(params);
      if (res.data?.success !== false) {
        setClaims(res.data?.claims || res.data?.data || res.data || []);
      }
    } catch (error) {
      console.error('인수 요청 목록 조회 실패:', error);
      showAlert('오류', '인수 요청 목록을 불러오는데 실패했습니다.');
    }
  }, [activeFilter]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await fetchClaims();
    setLoading(false);
  }, [fetchClaims]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClaims();
    setRefreshing(false);
  };

  const handleApprove = (claimId) => {
    showAlert(
      '인수 승인',
      '이 인수 요청을 승인하시겠습니까?\n승인 후 해당 셀럽 주식이 실명으로 전환됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '승인',
          onPress: () => executeApprove(claimId),
        },
      ]
    );
  };

  const executeApprove = async (claimId) => {
    setActionLoading(claimId);
    try {
      const res = await virtualCelebrityAPI.approveClaim(claimId, {});
      if (res.data?.success !== false) {
        showAlert('승인 완료', '인수 요청이 승인되었습니다.');
        await fetchClaims();
      }
    } catch (error) {
      showAlert(
        '오류',
        error.response?.data?.error || '승인 처리에 실패했습니다.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = (claimId) => {
    setRejectClaimId(claimId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const executeReject = async () => {
    if (!rejectReason.trim()) {
      showAlert('오류', '거부 사유를 입력해주세요.');
      return;
    }

    showAlert(
      '인수 거부',
      '이 인수 요청을 거부하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '거부',
          style: 'destructive',
          onPress: async () => {
            setRejectSubmitting(true);
            try {
              const res = await virtualCelebrityAPI.rejectClaim(rejectClaimId, {
                reason: rejectReason.trim(),
              });
              if (res.data?.success !== false) {
                showAlert('거부 완료', '인수 요청이 거부되었습니다.');
                setShowRejectModal(false);
                setRejectClaimId(null);
                setRejectReason('');
                await fetchClaims();
              }
            } catch (error) {
              showAlert(
                '오류',
                error.response?.data?.error || '거부 처리에 실패했습니다.'
              );
            } finally {
              setRejectSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || {
      label: status,
      color: theme.colors.gray500,
      bg: theme.colors.gray100,
    };
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
        <Text style={[styles.statusBadgeText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  const renderSocialLinks = (socialLinks) => {
    if (!socialLinks || Object.keys(socialLinks).length === 0) return null;

    const links = [];
    if (socialLinks.youtube) links.push({ label: 'YouTube', url: socialLinks.youtube });
    if (socialLinks.instagram) links.push({ label: 'Instagram', url: socialLinks.instagram });
    if (socialLinks.twitter) links.push({ label: 'Twitter/X', url: socialLinks.twitter });
    if (socialLinks.tiktok) links.push({ label: 'TikTok', url: socialLinks.tiktok });
    if (socialLinks.website) links.push({ label: '웹사이트', url: socialLinks.website });

    if (links.length === 0) return null;

    return (
      <View style={styles.socialLinksContainer}>
        <Text style={styles.sectionLabel}>소셜 링크</Text>
        {links.map((link, index) => (
          <TouchableOpacity
            key={index}
            style={styles.socialLinkItem}
            onPress={() => {
              if (link.url) {
                Linking.openURL(link.url).catch(() => {});
              }
            }}
          >
            <Text style={styles.socialLinkLabel}>{link.label}</Text>
            <Text style={styles.socialLinkUrl} numberOfLines={1}>
              {link.url}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderDocuments = (documents) => {
    if (!documents || documents.length === 0) return null;

    return (
      <View style={styles.documentsContainer}>
        <Text style={styles.sectionLabel}>인증 서류</Text>
        {documents.map((doc, index) => (
          <TouchableOpacity
            key={index}
            style={styles.documentItem}
            onPress={() => {
              if (doc.url || doc) {
                Linking.openURL(doc.url || doc).catch(() => {});
              }
            }}
          >
            <Text style={styles.documentIcon}>{'[' + (index + 1) + ']'}</Text>
            <Text style={styles.documentName} numberOfLines={1}>
              {doc.name || doc.filename || `서류 ${index + 1}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderClaimCard = ({ item: claim }) => {
    const virtualCeleb = claim.virtualUser || claim.virtualCelebrity || {};
    const claimant = claim.claimant || claim.user || {};
    const isPendingOrReview =
      claim.status === 'pending' || claim.status === 'under_review';
    const isActionLoading = actionLoading === claim._id || actionLoading === claim.id;

    return (
      <View style={styles.claimCard}>
        {/* Header: Status Badge */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderTitle}>인수 요청</Text>
          {getStatusBadge(claim.status)}
        </View>

        {/* Virtual Celeb Info */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>셀럽 정보</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>이름</Text>
            <Text style={styles.infoValue}>
              {virtualCeleb.displayName || virtualCeleb.name || '-'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>카테고리</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {virtualCeleb.category || '-'}
              </Text>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.cardDivider} />

        {/* Claimant Info */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>신청자 정보</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>사용자명</Text>
            <Text style={styles.infoValue}>
              {claimant.username || claimant.displayName || '-'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>이메일</Text>
            <Text style={styles.infoValue}>
              {claimant.email || '-'}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.cardDivider} />

        {/* Verification Method */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>인증 방법</Text>
          <View style={styles.verificationMethodBadge}>
            <Text style={styles.verificationMethodText}>
              {VERIFICATION_METHOD_LABELS[claim.verificationMethod] ||
                claim.verificationMethod ||
                '-'}
            </Text>
          </View>
        </View>

        {/* Verification Code */}
        {claim.verificationCode && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionLabel}>인증 코드</Text>
            <View style={styles.codeContainer}>
              <Text style={styles.codeText}>{claim.verificationCode}</Text>
            </View>
          </View>
        )}

        {/* Verification Documents */}
        {renderDocuments(claim.documents || claim.verificationDocuments)}

        {/* Social Links */}
        {renderSocialLinks(claim.socialLinks)}

        {/* Claim Message / Note */}
        {claim.message && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionLabel}>신청 메시지</Text>
            <Text style={styles.messageText}>{claim.message}</Text>
          </View>
        )}

        {/* Rejection Reason (if rejected) */}
        {claim.status === 'rejected' && claim.rejectionReason && (
          <View style={styles.rejectionSection}>
            <Text style={styles.rejectionLabel}>거부 사유</Text>
            <Text style={styles.rejectionText}>{claim.rejectionReason}</Text>
          </View>
        )}

        {/* Timestamps */}
        <View style={styles.timestampSection}>
          <Text style={styles.timestampText}>
            신청일: {claim.createdAt ? new Date(claim.createdAt).toLocaleDateString('ko-KR') : '-'}
          </Text>
          {claim.updatedAt && claim.updatedAt !== claim.createdAt && (
            <Text style={styles.timestampText}>
              수정일: {new Date(claim.updatedAt).toLocaleDateString('ko-KR')}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        {isPendingOrReview && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApprove(claim._id || claim.id)}
              disabled={isActionLoading}
            >
              {isActionLoading ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <Text style={styles.approveButtonText}>승인</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(claim._id || claim.id)}
              disabled={isActionLoading}
            >
              <Text style={styles.rejectButtonText}>거부</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const filteredClaims = claims;

  return (
    <View style={[styles.container, { paddingTop: insets.top }, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>인수 요청 관리</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {STATUS_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterTab,
                  isActive && styles.filterTabActive,
                ]}
                onPress={() => setActiveFilter(tab.key)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    isActive && styles.filterTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>인수 요청 목록을 불러오는 중...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredClaims}
          renderItem={renderClaimCard}
          keyExtractor={(item) => String(item._id || item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>{'( )'}</Text>
              <Text style={styles.emptyTitle}>인수 요청이 없습니다</Text>
              <Text style={styles.emptyDescription}>
                {activeFilter === 'all'
                  ? '아직 접수된 인수 요청이 없습니다.'
                  : `"${STATUS_TABS.find((t) => t.key === activeFilter)?.label}" 상태의 요청이 없습니다.`}
              </Text>
            </View>
          }
        />
      )}

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowRejectModal(false);
          setRejectClaimId(null);
          setRejectReason('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>인수 거부</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectClaimId(null);
                  setRejectReason('');
                }}
              >
                <Text style={styles.modalClose}>X</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              거부 사유를 입력해주세요. 신청자에게 전달됩니다.
            </Text>

            <TextInput
              style={styles.rejectReasonInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="거부 사유를 입력해주세요..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />

            <Text style={styles.charCount}>
              {rejectReason.length} / 500
            </Text>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectClaimId(null);
                  setRejectReason('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalRejectButton,
                  !rejectReason.trim() && styles.modalRejectButtonDisabled,
                ]}
                onPress={executeReject}
                disabled={!rejectReason.trim() || rejectSubmitting}
              >
                {rejectSubmitting ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Text style={styles.modalRejectButtonText}>거부 확인</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  backText: {
    fontSize: 24,
    fontFamily: t.fonts.regular,
    fontWeight: '300',
    color: t.colors.textPrimary,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.textPrimary,
  },
  headerRight: {
    width: 40,
  },

  // Filter Tabs
  filterContainer: {
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: t.colors.gray100,
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: t.colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textSecondary,
  },
  filterTabTextActive: {
    color: t.colors.white,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },

  // List
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Claim Card
  claimCard: {
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: t.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.textPrimary,
  },

  // Status Badge
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },

  // Info Section
  infoSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '60%',
  },

  // Category Badge
  categoryBadge: {
    backgroundColor: t.colors.primaryBackground,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.primary,
  },

  // Card Divider
  cardDivider: {
    height: 1,
    backgroundColor: t.colors.divider,
    marginVertical: 12,
  },

  // Verification Method
  verificationMethodBadge: {
    backgroundColor: t.colors.gray100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  verificationMethodText: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.gray700,
  },

  // Verification Code
  codeContainer: {
    backgroundColor: t.colors.gray50,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  codeText: {
    fontSize: 16,
    fontWeight: '700',
    color: t.colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 2,
  },

  // Social Links
  socialLinksContainer: {
    marginBottom: 12,
  },
  socialLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: t.colors.gray50,
    borderRadius: 8,
    marginBottom: 6,
  },
  socialLinkLabel: {
    fontSize: 12,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.textSecondary,
    width: 80,
  },
  socialLinkUrl: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.primary,
    flex: 1,
  },

  // Documents
  documentsContainer: {
    marginBottom: 12,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: t.colors.gray50,
    borderRadius: 8,
    marginBottom: 6,
  },
  documentIcon: {
    fontSize: 12,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.primary,
    marginRight: 8,
  },
  documentName: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.primary,
    flex: 1,
    textDecorationLine: 'underline',
  },

  // Message
  messageText: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textPrimary,
    lineHeight: 20,
    backgroundColor: t.colors.gray50,
    padding: 12,
    borderRadius: 8,
  },

  // Rejection
  rejectionSection: {
    backgroundColor: t.colors.errorBackground,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  rejectionLabel: {
    fontSize: 12,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.danger,
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.danger,
    lineHeight: 18,
  },

  // Timestamp
  timestampSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: t.colors.divider,
    marginBottom: 12,
  },
  timestampText: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    marginTop: 4,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButton: {
    backgroundColor: t.colors.success,
  },
  approveButtonText: {
    color: t.colors.white,
    fontSize: 15,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  rejectButton: {
    backgroundColor: t.colors.white,
    borderWidth: 1.5,
    borderColor: t.colors.danger,
  },
  rejectButtonText: {
    color: t.colors.danger,
    fontSize: 15,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    fontFamily: t.fonts.regular,
    color: t.colors.gray300,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.textPrimary,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.textPrimary,
  },
  modalClose: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    padding: 4,
    color: t.colors.textSecondary,
  },
  modalDescription: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  rejectReasonInput: {
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: t.fonts.regular,
    color: t.colors.textPrimary,
    backgroundColor: t.colors.gray50,
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 16,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: t.colors.gray100,
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.textSecondary,
  },
  modalRejectButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: t.colors.danger,
  },
  modalRejectButtonDisabled: {
    backgroundColor: t.colors.gray300,
  },
  modalRejectButtonText: {
    fontSize: 15,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.white,
  },
});
