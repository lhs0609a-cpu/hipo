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
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../services/api';

const AdminDashboardScreen = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [pendingIPOs, setPendingIPOs] = useState([]);
  const [anomalyAlerts, setAnomalyAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Modals
  const [ipoReviewModalVisible, setIpoReviewModalVisible] = useState(false);
  const [announcementModalVisible, setAnnouncementModalVisible] = useState(false);
  const [selectedIPO, setSelectedIPO] = useState(null);

  // Form states
  const [ipoDecision, setIpoDecision] = useState(true);
  const [ipoReason, setIpoReason] = useState('');
  const [ipoInitialPrice, setIpoInitialPrice] = useState('');
  const [ipoLockupDays, setIpoLockupDays] = useState('30');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementType, setAnnouncementType] = useState('GENERAL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashboardRes, iposRes, alertsRes] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getPendingIPOs(),
        adminAPI.getAnomalyAlerts(),
      ]);
      setDashboard(dashboardRes.data);
      setPendingIPOs(iposRes.data.pendingIPOs || []);
      setAnomalyAlerts(alertsRes.data.alerts || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      if (error.response?.status === 403) {
        Alert.alert('권한 없음', '관리자 권한이 필요합니다');
        navigation.goBack();
      }
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
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleReviewIPO = (ipo) => {
    setSelectedIPO(ipo);
    setIpoDecision(true);
    setIpoReason('');
    setIpoInitialPrice(ipo.requestedPrice?.toString() || '10000');
    setIpoLockupDays('30');
    setIpoReviewModalVisible(true);
  };

  const submitIPOReview = async () => {
    try {
      await adminAPI.reviewIPO(
        selectedIPO.id,
        ipoDecision,
        ipoReason,
        parseInt(ipoInitialPrice),
        parseInt(ipoLockupDays)
      );
      Alert.alert('성공', ipoDecision ? 'IPO가 승인되었습니다' : 'IPO가 거절되었습니다');
      setIpoReviewModalVisible(false);
      fetchData();
    } catch (error) {
      Alert.alert('오류', error.response?.data?.message || 'IPO 심사에 실패했습니다');
    }
  };

  const submitAnnouncement = async () => {
    if (!announcementTitle || !announcementContent) {
      Alert.alert('오류', '제목과 내용을 입력해주세요');
      return;
    }

    try {
      await adminAPI.createAnnouncement(announcementTitle, announcementContent, announcementType);
      Alert.alert('성공', '공지사항이 등록되었습니다');
      setAnnouncementModalVisible(false);
      setAnnouncementTitle('');
      setAnnouncementContent('');
    } catch (error) {
      Alert.alert('오류', error.response?.data?.message || '공지사항 등록에 실패했습니다');
    }
  };

  const getAlertSeverityColor = (severity) => {
    switch (severity) {
      case 'HIGH': return '#F0344B';
      case 'MEDIUM': return '#F59B00';
      case 'LOW': return '#00B368';
      default: return '#999';
    }
  };

  const renderStatCard = (icon, label, value, color) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );

  const renderPendingIPO = ({ item }) => (
    <TouchableOpacity
      style={styles.ipoCard}
      onPress={() => handleReviewIPO(item)}
    >
      <View style={styles.ipoHeader}>
        <Text style={styles.ipoName}>{item.creator?.username}</Text>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>대기중</Text>
        </View>
      </View>
      <View style={styles.ipoInfo}>
        <View style={styles.ipoInfoItem}>
          <Text style={styles.ipoInfoLabel}>신청일</Text>
          <Text style={styles.ipoInfoValue}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.ipoInfoItem}>
          <Text style={styles.ipoInfoLabel}>희망 가격</Text>
          <Text style={styles.ipoInfoValue}>{formatNumber(item.requestedPrice)} PO</Text>
        </View>
        <View style={styles.ipoInfoItem}>
          <Text style={styles.ipoInfoLabel}>팔로워</Text>
          <Text style={styles.ipoInfoValue}>{formatNumber(item.creator?.followersCount)}</Text>
        </View>
      </View>
      <View style={styles.ipoActions}>
        <TouchableOpacity
          style={[styles.ipoActionButton, styles.approveButton]}
          onPress={() => {
            setSelectedIPO(item);
            setIpoDecision(true);
            setIpoReviewModalVisible(true);
          }}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={styles.ipoActionText}>승인</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ipoActionButton, styles.rejectButton]}
          onPress={() => {
            setSelectedIPO(item);
            setIpoDecision(false);
            setIpoReviewModalVisible(true);
          }}
        >
          <Ionicons name="close" size={20} color="#fff" />
          <Text style={styles.ipoActionText}>거절</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderAnomalyAlert = ({ item }) => (
    <View style={styles.alertCard}>
      <View style={[styles.alertSeverity, { backgroundColor: getAlertSeverityColor(item.severity) }]} />
      <View style={styles.alertContent}>
        <Text style={styles.alertTitle}>{item.title}</Text>
        <Text style={styles.alertDesc}>{item.description}</Text>
        <Text style={styles.alertTime}>{formatDate(item.createdAt)}</Text>
      </View>
      <TouchableOpacity style={styles.alertAction}>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    </View>
  );

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
        <Text style={styles.headerTitle}>관리자 대시보드</Text>
        <TouchableOpacity onPress={() => setAnnouncementModalVisible(true)}>
          <Ionicons name="megaphone-outline" size={24} color="#2B5FE3" />
        </TouchableOpacity>
      </View>

      {/* 탭 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            개요
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ipo' && styles.activeTab]}
          onPress={() => setActiveTab('ipo')}
        >
          <Text style={[styles.tabText, activeTab === 'ipo' && styles.activeTabText]}>
            IPO 심사
          </Text>
          {pendingIPOs.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{pendingIPOs.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'alerts' && styles.activeTab]}
          onPress={() => setActiveTab('alerts')}
        >
          <Text style={[styles.tabText, activeTab === 'alerts' && styles.activeTabText]}>
            이상탐지
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'overview' ? (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* 핵심 지표 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>핵심 지표</Text>
            <View style={styles.statsGrid}>
              {renderStatCard('people', '총 사용자', formatNumber(dashboard?.totalUsers), '#2B5FE3')}
              {renderStatCard('trending-up', '총 주식', formatNumber(dashboard?.totalStocks), '#00B368')}
              {renderStatCard('swap-horizontal', '오늘 거래량', formatNumber(dashboard?.todayVolume), '#F59B00')}
              {renderStatCard('wallet', '총 거래액', formatNumber(dashboard?.totalTradingValue), '#8B5CF6')}
            </View>
          </View>

          {/* 오늘의 활동 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>오늘의 활동</Text>
            <View style={styles.activityGrid}>
              <View style={styles.activityItem}>
                <Text style={styles.activityValue}>{formatNumber(dashboard?.todayNewUsers)}</Text>
                <Text style={styles.activityLabel}>신규 가입</Text>
              </View>
              <View style={styles.activityItem}>
                <Text style={styles.activityValue}>{formatNumber(dashboard?.todayTrades)}</Text>
                <Text style={styles.activityLabel}>거래 건수</Text>
              </View>
              <View style={styles.activityItem}>
                <Text style={styles.activityValue}>{formatNumber(dashboard?.todayIPOs)}</Text>
                <Text style={styles.activityLabel}>IPO 신청</Text>
              </View>
              <View style={styles.activityItem}>
                <Text style={styles.activityValue}>{formatNumber(dashboard?.todayReports)}</Text>
                <Text style={styles.activityLabel}>신고 접수</Text>
              </View>
            </View>
          </View>

          {/* 빠른 액션 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>관리 메뉴</Text>
            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: '#3182F620' }]}>
                <Ionicons name="people" size={24} color="#2B5FE3" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>사용자 관리</Text>
                <Text style={styles.menuDesc}>회원 조회, 제재 관리</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: '#00C47120' }]}>
                <Ionicons name="stats-chart" size={24} color="#00B368" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>주식 관리</Text>
                <Text style={styles.menuDesc}>상장 주식 모니터링, 상태 관리</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: '#FFB80020' }]}>
                <Ionicons name="shield-checkmark" size={24} color="#F59B00" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>시장 감시</Text>
                <Text style={styles.menuDesc}>이상거래 탐지, 서킷브레이커</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setAnnouncementModalVisible(true)}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#9B59B620' }]}>
                <Ionicons name="megaphone" size={24} color="#8B5CF6" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>공지사항 작성</Text>
                <Text style={styles.menuDesc}>새 공지사항 등록</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : activeTab === 'ipo' ? (
        <FlatList
          data={pendingIPOs}
          renderItem={renderPendingIPO}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>대기 중인 IPO가 없습니다</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={anomalyAlerts}
          renderItem={renderAnomalyAlert}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-checkmark-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>이상 탐지 알림이 없습니다</Text>
            </View>
          }
        />
      )}

      {/* IPO 심사 모달 */}
      <Modal visible={ipoReviewModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>IPO 심사</Text>
            <Text style={styles.modalDesc}>
              {selectedIPO?.creator?.username}님의 IPO 신청
            </Text>

            <View style={styles.decisionButtons}>
              <TouchableOpacity
                style={[
                  styles.decisionButton,
                  ipoDecision && styles.approveDecision,
                ]}
                onPress={() => setIpoDecision(true)}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={ipoDecision ? '#fff' : '#00B368'}
                />
                <Text style={[
                  styles.decisionText,
                  ipoDecision && styles.activeDecisionText,
                ]}>승인</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.decisionButton,
                  !ipoDecision && styles.rejectDecision,
                ]}
                onPress={() => setIpoDecision(false)}
              >
                <Ionicons
                  name="close-circle"
                  size={24}
                  color={!ipoDecision ? '#fff' : '#F0344B'}
                />
                <Text style={[
                  styles.decisionText,
                  !ipoDecision && styles.activeDecisionText,
                ]}>거절</Text>
              </TouchableOpacity>
            </View>

            {ipoDecision && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>공모가 (PO)</Text>
                  <TextInput
                    style={styles.input}
                    value={ipoInitialPrice}
                    onChangeText={setIpoInitialPrice}
                    placeholder="10000"
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>락업 기간 (일)</Text>
                  <TextInput
                    style={styles.input}
                    value={ipoLockupDays}
                    onChangeText={setIpoLockupDays}
                    placeholder="30"
                    keyboardType="number-pad"
                  />
                </View>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{ipoDecision ? '승인 사유 (선택)' : '거절 사유'}</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={ipoReason}
                onChangeText={setIpoReason}
                placeholder={ipoDecision ? '승인 사유를 입력하세요' : '거절 사유를 입력하세요'}
                multiline
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIpoReviewModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, !ipoDecision && { backgroundColor: '#F0344B' }]}
                onPress={submitIPOReview}
              >
                <Text style={styles.confirmButtonText}>
                  {ipoDecision ? '승인' : '거절'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 공지사항 모달 */}
      <Modal visible={announcementModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>공지사항 작성</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>공지 유형</Text>
              <View style={styles.typeButtons}>
                {['GENERAL', 'MAINTENANCE', 'EVENT', 'URGENT'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      announcementType === type && styles.activeTypeButton,
                    ]}
                    onPress={() => setAnnouncementType(type)}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      announcementType === type && styles.activeTypeText,
                    ]}>
                      {type === 'GENERAL' ? '일반' :
                       type === 'MAINTENANCE' ? '점검' :
                       type === 'EVENT' ? '이벤트' : '긴급'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>제목</Text>
              <TextInput
                style={styles.input}
                value={announcementTitle}
                onChangeText={setAnnouncementTitle}
                placeholder="공지 제목"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>내용</Text>
              <TextInput
                style={[styles.input, { height: 120 }]}
                value={announcementContent}
                onChangeText={setAnnouncementContent}
                placeholder="공지 내용을 입력하세요"
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setAnnouncementModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={submitAnnouncement}
              >
                <Text style={styles.confirmButtonText}>등록</Text>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.backgroundSecondary,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
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
  tabBadge: {
    backgroundColor: t.colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  listContent: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    gap: 12,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  activityGrid: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  activityItem: {
    flex: 1,
    alignItems: 'center',
  },
  activityValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  activityLabel: {
    fontSize: 12,
    color: '#666',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
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
  ipoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  ipoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ipoName: {
    fontSize: 18,
    fontWeight: '700',
  },
  pendingBadge: {
    backgroundColor: t.colors.warningBackground,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 12,
    color: t.colors.warning,
    fontWeight: '600',
  },
  ipoInfo: {
    flexDirection: 'row',
    backgroundColor: t.colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  ipoInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  ipoInfoLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  ipoInfoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  ipoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  ipoActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    backgroundColor: t.colors.success,
  },
  rejectButton: {
    backgroundColor: t.colors.error,
  },
  ipoActionText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  alertSeverity: {
    width: 4,
  },
  alertContent: {
    flex: 1,
    padding: 16,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  alertDesc: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  alertTime: {
    fontSize: 12,
    color: '#999',
  },
  alertAction: {
    justifyContent: 'center',
    paddingHorizontal: 12,
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
    maxHeight: '80%',
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
    marginBottom: 20,
  },
  decisionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  decisionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    backgroundColor: t.colors.background,
    gap: 8,
  },
  approveDecision: {
    backgroundColor: t.colors.success,
  },
  rejectDecision: {
    backgroundColor: t.colors.error,
  },
  decisionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeDecisionText: {
    color: '#fff',
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
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: t.colors.background,
    borderRadius: 6,
  },
  activeTypeButton: {
    backgroundColor: t.colors.primary,
  },
  typeButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  activeTypeText: {
    color: '#fff',
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

export default AdminDashboardScreen;
