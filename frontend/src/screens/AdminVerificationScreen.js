import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Linking,
} from 'react-native';
import { COLORS } from '../constants/colors';
import api from '../api/client';

export default function AdminVerificationScreen({ navigation }) {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [stats, setStats] = useState(null);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [verificationsRes, statsRes] = await Promise.all([
        api.get('/verification/admin/requests', { params: { status: selectedStatus } }),
        api.get('/verification/admin/stats')
      ]);

      if (verificationsRes.data.success) {
        setVerifications(verificationsRes.data.verifications);
      }

      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error);
      Alert.alert('오류', '데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleApprove = async (verificationId) => {
    const verification = verifications.find(v => v.id === verificationId);

    Alert.alert(
      '인증 승인',
      `${verification.realName}님의 인증을 승인하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '승인',
          onPress: async () => {
            try {
              const response = await api.post(`/verification/admin/approve/${verificationId}`);

              if (response.data.success) {
                Alert.alert('승인 완료', response.data.message);
                loadData();
              }
            } catch (error) {
              console.error('승인 오류:', error);
              Alert.alert('오류', error.response?.data?.error || '승인에 실패했습니다');
            }
          }
        }
      ]
    );
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('오류', '거부 사유를 입력해주세요');
      return;
    }

    try {
      const response = await api.post(`/verification/admin/reject/${selectedVerification.id}`, {
        rejectionReason
      });

      if (response.data.success) {
        Alert.alert('거부 완료', '인증 요청이 거부되었습니다');
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedVerification(null);
        loadData();
      }
    } catch (error) {
      console.error('거부 오류:', error);
      Alert.alert('오류', error.response?.data?.error || '거부에 실패했습니다');
    }
  };

  const renderVerificationItem = ({ item }) => {
    const typeLabels = {
      celebrity: '연예인',
      influencer: '인플루언서',
      athlete: '운동선수',
      professional: '전문가',
      business: '사업가',
      other: '기타'
    };

    const statusColors = {
      pending: COLORS.warning,
      approved: COLORS.success,
      rejected: COLORS.error
    };

    const statusLabels = {
      pending: '대기중',
      approved: '승인됨',
      rejected: '거부됨'
    };

    return (
      <TouchableOpacity
        style={styles.verificationCard}
        onPress={() => setSelectedVerification(item)}
      >
        <View style={styles.verificationHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.realName?.charAt(0)}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {item.realName} (@{item.user?.username})
              </Text>
              <Text style={styles.userOccupation}>
                {item.occupation} · {typeLabels[item.verificationType]}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + '20' }]}>
            <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
              {statusLabels[item.status]}
            </Text>
          </View>
        </View>

        <View style={styles.verificationInfo}>
          {item.autoVerificationScore !== null && item.autoVerificationScore !== undefined && (
            <View style={[
              styles.scoreContainer,
              item.autoVerificationScore >= 90 && styles.scoreHigh,
              item.autoVerificationScore >= 70 && item.autoVerificationScore < 90 && styles.scoreMedium,
              item.autoVerificationScore < 70 && styles.scoreLow
            ]}>
              <Text style={styles.scoreLabel}>자동 검증 점수:</Text>
              <Text style={styles.scoreValue}>{item.autoVerificationScore}/100</Text>
              <Text style={styles.scoreDecision}>
                {item.autoVerificationDecision === 'auto_approved' && '(자동 승인)'}
                {item.autoVerificationDecision === 'auto_rejected' && '(자동 거부)'}
                {item.autoVerificationDecision === 'review_required' && '(검토 필요)'}
              </Text>
            </View>
          )}
          {item.followerCount > 0 && (
            <Text style={styles.infoText}>
              👥 팔로워: {item.followerCount.toLocaleString()}
            </Text>
          )}
          <Text style={styles.infoText}>
            📅 제출: {new Date(item.submittedAt).toLocaleDateString('ko-KR')}
          </Text>
          {item.newsKeywords && (
            <Text style={styles.infoText}>
              🔍 검색어: {item.newsKeywords}
            </Text>
          )}
        </View>

        {item.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.approveButton}
              onPress={() => handleApprove(item.id)}
            >
              <Text style={styles.approveButtonText}>✓ 승인</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => {
                setSelectedVerification(item);
                setShowRejectModal(true);
              }}
            >
              <Text style={styles.rejectButtonText}>✕ 거부</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'rejected' && item.rejectionReason && (
          <View style={styles.rejectionBox}>
            <Text style={styles.rejectionLabel}>거부 사유:</Text>
            <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedVerification) return null;

    const socialLinks = selectedVerification.socialLinks || {};

    return (
      <Modal
        visible={!!selectedVerification && !showRejectModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedVerification(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>인증 요청 상세</Text>
            <TouchableOpacity onPress={() => setSelectedVerification(null)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>실명</Text>
              <Text style={styles.detailValue}>{selectedVerification.realName}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>사용자명</Text>
              <Text style={styles.detailValue}>@{selectedVerification.user?.username}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>직업/분야</Text>
              <Text style={styles.detailValue}>{selectedVerification.occupation}</Text>
            </View>

            {selectedVerification.category && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>카테고리</Text>
                <Text style={styles.detailValue}>{selectedVerification.category}</Text>
              </View>
            )}

            {selectedVerification.followerCount > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>팔로워 수</Text>
                <Text style={styles.detailValue}>
                  {selectedVerification.followerCount.toLocaleString()}
                </Text>
              </View>
            )}

            {selectedVerification.newsKeywords && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>뉴스 검색 키워드</Text>
                <Text style={styles.detailValue}>{selectedVerification.newsKeywords}</Text>
              </View>
            )}

            {selectedVerification.description && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>설명</Text>
                <Text style={styles.detailValue}>{selectedVerification.description}</Text>
              </View>
            )}

            {selectedVerification.autoVerificationScore !== null && selectedVerification.autoVerificationScore !== undefined && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>자동 검증 결과</Text>
                <View style={[
                  styles.scoreContainerModal,
                  selectedVerification.autoVerificationScore >= 90 && styles.scoreHigh,
                  selectedVerification.autoVerificationScore >= 70 && selectedVerification.autoVerificationScore < 90 && styles.scoreMedium,
                  selectedVerification.autoVerificationScore < 70 && styles.scoreLow
                ]}>
                  <Text style={styles.scoreValueLarge}>{selectedVerification.autoVerificationScore}/100</Text>
                  <Text style={styles.scoreDecisionText}>
                    {selectedVerification.autoVerificationDecision === 'auto_approved' && '✓ 자동 승인됨'}
                    {selectedVerification.autoVerificationDecision === 'auto_rejected' && '✕ 자동 거부됨'}
                    {selectedVerification.autoVerificationDecision === 'review_required' && '⚠ 관리자 검토 필요'}
                  </Text>
                </View>
                {selectedVerification.autoVerificationResult && (
                  <View style={styles.scoreBreakdown}>
                    <Text style={styles.breakdownTitle}>점수 상세:</Text>
                    <Text style={styles.breakdownText}>
                      • 소셜 미디어: {selectedVerification.autoVerificationResult.scores?.socialMedia || 0}/30
                      {'\n'}• 웹 존재성: {selectedVerification.autoVerificationResult.scores?.webPresence || 0}/25
                      {'\n'}• 활동성: {selectedVerification.autoVerificationResult.scores?.activity || 0}/20
                      {'\n'}• 일관성: {selectedVerification.autoVerificationResult.scores?.consistency || 0}/15
                      {'\n'}• 신뢰도: {selectedVerification.autoVerificationResult.scores?.credibility || 0}/10
                    </Text>
                  </View>
                )}
              </View>
            )}

            {Object.keys(socialLinks).some(key => socialLinks[key]) && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>소셜 미디어 링크</Text>
                {Object.entries(socialLinks).map(([platform, url]) => {
                  if (!url) return null;
                  return (
                    <TouchableOpacity
                      key={platform}
                      style={styles.linkButton}
                      onPress={() => Linking.openURL(url)}
                    >
                      <Text style={styles.linkText}>
                        {platform}: {url}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>사용자 정보</Text>
              <Text style={styles.detailValue}>
                신뢰도: {selectedVerification.user?.trustLevel}
                {'\n'}시가총액: {selectedVerification.user?.marketCap?.toLocaleString()} PO
                {'\n'}가입일: {new Date(selectedVerification.user?.createdAt).toLocaleDateString('ko-KR')}
              </Text>
            </View>

            {selectedVerification.status === 'pending' && (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.approveButton]}
                  onPress={() => {
                    setSelectedVerification(null);
                    handleApprove(selectedVerification.id);
                  }}
                >
                  <Text style={styles.approveButtonText}>✓ 승인</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.rejectButton]}
                  onPress={() => setShowRejectModal(true)}
                >
                  <Text style={styles.rejectButtonText}>✕ 거부</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>대기중</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.approved}</Text>
            <Text style={styles.statLabel}>승인됨</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalVerifiedUsers}</Text>
            <Text style={styles.statLabel}>인증 사용자</Text>
          </View>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScrollView}
        contentContainerStyle={styles.tabContainer}
      >
        <TouchableOpacity
          style={[styles.tab, selectedStatus === 'pending' && styles.tabActive]}
          onPress={() => setSelectedStatus('pending')}
        >
          <Text style={[styles.tabText, selectedStatus === 'pending' && styles.tabTextActive]}>
            대기중 ({stats?.pending || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedStatus === 'approved' && styles.tabActive]}
          onPress={() => setSelectedStatus('approved')}
        >
          <Text style={[styles.tabText, selectedStatus === 'approved' && styles.tabTextActive]}>
            승인됨 ({stats?.approved || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedStatus === 'rejected' && styles.tabActive]}
          onPress={() => setSelectedStatus('rejected')}
        >
          <Text style={[styles.tabText, selectedStatus === 'rejected' && styles.tabTextActive]}>
            거부됨 ({stats?.rejected || 0})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={verifications}
          renderItem={renderVerificationItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>
                {selectedStatus === 'pending' && '대기 중인 인증 요청이 없습니다'}
                {selectedStatus === 'approved' && '승인된 인증 요청이 없습니다'}
                {selectedStatus === 'rejected' && '거부된 인증 요청이 없습니다'}
              </Text>
            </View>
          }
        />
      )}

      {renderDetailModal()}

      <Modal
        visible={showRejectModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.rejectModalOverlay}>
          <View style={styles.rejectModalContent}>
            <Text style={styles.rejectModalTitle}>인증 거부</Text>
            <Text style={styles.rejectModalDescription}>
              거부 사유를 입력해주세요
            </Text>

            <TextInput
              style={styles.rejectInput}
              placeholder="예: 제출된 정보가 불충분합니다"
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />

            <View style={styles.rejectModalActions}>
              <TouchableOpacity
                style={styles.rejectModalCancelButton}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
              >
                <Text style={styles.rejectModalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectModalConfirmButton}
                onPress={handleReject}
              >
                <Text style={styles.rejectModalConfirmText}>거부</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tabScrollView: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  verificationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  verificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  userOccupation: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  verificationInfo: {
    gap: 6,
    marginBottom: 12,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  scoreHigh: {
    backgroundColor: COLORS.success + '20',
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  scoreMedium: {
    backgroundColor: COLORS.warning + '20',
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  scoreLow: {
    backgroundColor: COLORS.error + '20',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  scoreDecision: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  scoreContainerModal: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  scoreValueLarge: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  scoreDecisionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  scoreBreakdown: {
    marginTop: 16,
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  breakdownText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  approveButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: COLORS.error,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  rejectionBox: {
    backgroundColor: COLORS.error + '15',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  rejectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.error,
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 13,
    color: COLORS.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    fontSize: 24,
    color: COLORS.textSecondary,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  linkButton: {
    marginTop: 8,
  },
  linkText: {
    fontSize: 14,
    color: COLORS.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  rejectModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  rejectModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  rejectModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  rejectModalDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  rejectInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    height: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  rejectModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectModalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  rejectModalCancelText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  rejectModalConfirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.error,
    alignItems: 'center',
  },
  rejectModalConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
