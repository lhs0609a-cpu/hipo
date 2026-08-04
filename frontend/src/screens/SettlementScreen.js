import React, { useState, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { settlementAPI } from '../services/api';

const BANKS = [
  'KB국민은행', '신한은행', '하나은행', '우리은행', 'IBK기업은행',
  'NH농협은행', 'SC제일은행', '씨티은행', 'DGB대구은행', '부산은행',
  '경남은행', '광주은행', '전북은행', '제주은행', '카카오뱅크',
  '토스뱅크', '케이뱅크', '새마을금고', '신협', '우체국',
];

const STATUS_LABELS = {
  PENDING: { text: '대기', color: '#F59B00' },
  APPROVED: { text: '승인', color: '#2B5FE3' },
  PROCESSING: { text: '처리중', color: '#8B5CF6' },
  COMPLETED: { text: '완료', color: '#00B368' },
  REJECTED: { text: '거부', color: '#F0344B' },
};

function formatNumber(num) {
  if (!num && num !== 0) return '0';
  return Math.floor(num).toLocaleString();
}

export default function SettlementScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  // 정산 금액 입력
  const [settlementAmount, setSettlementAmount] = useState('');

  // 계좌 등록 모달
  const [showBankModal, setShowBankModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [registeringBank, setRegisteringBank] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await settlementAPI.getDashboard();
      if (res.data.success) {
        setDashboard(res.data);
      }
    } catch (error) {
      console.error('대시보드 조회 실패:', error);
    }
  }, []);

  const fetchHistory = useCallback(async (page = 1) => {
    try {
      const res = await settlementAPI.getHistory(page);
      if (res.data.success) {
        if (page === 1) {
          setHistory(res.data.settlements);
        } else {
          setHistory(prev => [...prev, ...res.data.settlements]);
        }
        setHistoryTotal(res.data.pagination.total);
        setHistoryPage(page);
      }
    } catch (error) {
      console.error('정산 내역 조회 실패:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchDashboard(), fetchHistory(1)]);
    setLoading(false);
  }, [fetchDashboard, fetchHistory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboard(), fetchHistory(1)]);
    setRefreshing(false);
  };

  // 정산 예상 금액 계산
  const amount = parseInt(settlementAmount) || 0;
  const fee = Math.floor(amount * 0.10);
  const taxBase = amount - fee;
  const tax = Math.floor(taxBase * 0.033);
  const netAmount = amount - fee - tax;

  const handleQuickAmount = (value) => {
    if (value === 'all') {
      setSettlementAmount(String(dashboard?.balance || 0));
    } else {
      setSettlementAmount(String(value));
    }
  };

  const handleRequestSettlement = async () => {
    if (!amount || amount < 10000) {
      showAlert('오류', '최소 정산 금액은 10,000 PO입니다.');
      return;
    }
    if (amount > (dashboard?.balance || 0)) {
      showAlert('오류', 'PO 잔액이 부족합니다.');
      return;
    }

    const confirmMsg = `${formatNumber(amount)} PO를 정산 신청합니다.\n\n수수료(10%): -${formatNumber(fee)} PO\n세금(3.3%): -${formatNumber(tax)}원\n실수령액: ${formatNumber(netAmount)}원\n\n진행하시겠습니까?`;

    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMsg)) return;
      await submitSettlement();
    } else {
      Alert.alert('정산 신청', confirmMsg, [
        { text: '취소', style: 'cancel' },
        { text: '확인', onPress: submitSettlement },
      ]);
    }
  };

  const submitSettlement = async () => {
    setSubmitting(true);
    try {
      const res = await settlementAPI.requestSettlement(amount);
      if (res.data.success) {
        showAlert('정산 신청 완료', `${formatNumber(amount)} PO 정산이 신청되었습니다.\n영업일 기준 3~5일 내 처리됩니다.`);
        setSettlementAmount('');
        await Promise.all([fetchDashboard(), fetchHistory(1)]);
      }
    } catch (error) {
      showAlert('오류', error.response?.data?.error || '정산 신청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSettlement = async (id) => {
    const doCancel = async () => {
      try {
        const res = await settlementAPI.cancelSettlement(id);
        if (res.data.success) {
          showAlert('취소 완료', '정산이 취소되었습니다.');
          await Promise.all([fetchDashboard(), fetchHistory(1)]);
        }
      } catch (error) {
        showAlert('오류', error.response?.data?.error || '정산 취소에 실패했습니다.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('정산을 취소하시겠습니까? PO가 환불됩니다.')) {
        await doCancel();
      }
    } else {
      Alert.alert('정산 취소', '정산을 취소하시겠습니까? PO가 환불됩니다.', [
        { text: '아니오', style: 'cancel' },
        { text: '예', style: 'destructive', onPress: doCancel },
      ]);
    }
  };

  const handleRegisterBank = async () => {
    if (!selectedBank) {
      showAlert('오류', '은행을 선택해주세요.');
      return;
    }
    if (!accountNumber || accountNumber.length < 10) {
      showAlert('오류', '유효한 계좌번호를 입력해주세요.');
      return;
    }
    if (!accountHolder) {
      showAlert('오류', '예금주명을 입력해주세요.');
      return;
    }

    setRegisteringBank(true);
    try {
      const res = await settlementAPI.registerBankAccount({
        bankName: selectedBank,
        accountNumber,
        accountHolder,
      });
      if (res.data.success) {
        showAlert('등록 완료', '계좌가 등록되었습니다.');
        setShowBankModal(false);
        setSelectedBank('');
        setAccountNumber('');
        setAccountHolder('');
        await fetchDashboard();
      }
    } catch (error) {
      showAlert('오류', error.response?.data?.error || '계좌 등록에 실패했습니다.');
    } finally {
      setRegisteringBank(false);
    }
  };

  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.colors.textPrimary }]}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>수익 정산</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  const bankInfo = dashboard?.bankInfo;

  return (
    <View style={[styles.container, { paddingTop: insets.top }, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.colors.textPrimary }]}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>수익 정산</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        {/* 잔액 카드 */}
        <View style={[styles.balanceCard, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.balanceLabel}>현재 PO 잔액</Text>
          <Text style={styles.balanceValue}>{formatNumber(dashboard?.balance)} PO</Text>
          <Text style={styles.balanceSubtext}>
            정산 가능: {formatNumber(dashboard?.balance >= 10000 ? dashboard?.balance : 0)} PO
          </Text>
        </View>

        {/* 정산 예상 금액 카드 */}
        {amount > 0 && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>정산 예상 금액</Text>
            <View style={styles.calcRow}>
              <Text style={[styles.calcLabel, { color: theme.colors.textSecondary }]}>정산 금액</Text>
              <Text style={[styles.calcValue, { color: theme.colors.textPrimary }]}>{formatNumber(amount)} PO</Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={[styles.calcLabel, { color: theme.colors.textSecondary }]}>수수료 (10%)</Text>
              <Text style={[styles.calcValue, { color: theme.colors.error }]}>-{formatNumber(fee)} PO</Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={[styles.calcLabel, { color: theme.colors.textSecondary }]}>세금 (3.3%)</Text>
              <Text style={[styles.calcValue, { color: theme.colors.error }]}>-{formatNumber(tax)}원</Text>
            </View>
            <View style={[styles.calcDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.calcRow}>
              <Text style={[styles.calcLabel, { color: theme.colors.textPrimary, fontWeight: '700' }]}>실수령액</Text>
              <Text style={[styles.calcNetAmount, { color: theme.colors.primary }]}>{formatNumber(netAmount)}원</Text>
            </View>
          </View>
        )}

        {/* 금액 입력 섹션 */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>정산 금액 입력</Text>
          <View style={[styles.inputContainer, { borderColor: theme.colors.border, backgroundColor: isDark ? theme.colors.background : '#F8F9FB' }]}>
            <TextInput
              style={[styles.amountInput, { color: theme.colors.textPrimary }]}
              value={settlementAmount}
              onChangeText={(text) => setSettlementAmount(text.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              placeholder="정산할 PO 금액 입력"
              placeholderTextColor={theme.colors.textTertiary}
            />
            <Text style={[styles.inputSuffix, { color: theme.colors.textSecondary }]}>PO</Text>
          </View>

          {/* 빠른 선택 */}
          <View style={styles.quickAmounts}>
            {[10000, 50000, 100000].map((val) => (
              <TouchableOpacity
                key={val}
                style={[styles.quickButton, { borderColor: theme.colors.border, backgroundColor: isDark ? theme.colors.background : '#FCFCFD' }]}
                onPress={() => handleQuickAmount(val)}
              >
                <Text style={[styles.quickButtonText, { color: theme.colors.textPrimary }]}>{formatNumber(val)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.quickButton, { borderColor: theme.colors.primary, backgroundColor: isDark ? 'rgba(33, 150, 243, 0.15)' : '#EEF4FF' }]}
              onPress={() => handleQuickAmount('all')}
            >
              <Text style={[styles.quickButtonText, { color: theme.colors.primary }]}>전액</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.minAmountText, { color: theme.colors.textTertiary }]}>
            * 최소 정산 금액: 10,000 PO
          </Text>
        </View>

        {/* 계좌 정보 섹션 */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>정산 계좌</Text>
          {bankInfo ? (
            <View>
              <View style={[styles.bankInfoBox, { backgroundColor: isDark ? theme.colors.background : '#F8F9FB', borderColor: theme.colors.border }]}>
                <Text style={[styles.bankName, { color: theme.colors.textPrimary }]}>{bankInfo.bankName}</Text>
                <Text style={[styles.bankAccount, { color: theme.colors.textSecondary }]}>
                  {bankInfo.accountNumber}
                </Text>
                <Text style={[styles.bankHolder, { color: theme.colors.textSecondary }]}>
                  예금주: {bankInfo.accountHolder}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.changeBankButton, { borderColor: theme.colors.border }]}
                onPress={() => setShowBankModal(true)}
              >
                <Text style={[styles.changeBankText, { color: theme.colors.textSecondary }]}>계좌 변경</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.registerBankButton, { backgroundColor: theme.colors.primaryBackground, borderColor: theme.colors.primary }]}
              onPress={() => setShowBankModal(true)}
            >
              <Text style={[styles.registerBankText, { color: theme.colors.primary }]}>계좌 등록하기</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 정산 신청 버튼 */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: (amount >= 10000 && dashboard?.canSettle)
                ? theme.colors.primary
                : theme.colors.border,
            },
          ]}
          disabled={amount < 10000 || !dashboard?.canSettle || submitting}
          onPress={handleRequestSettlement}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {!dashboard?.identityVerified
                ? '본인인증 필요'
                : !bankInfo
                ? '계좌 등록 필요'
                : dashboard?.hasPendingSettlement
                ? '진행중인 정산이 있습니다'
                : amount < 10000
                ? '최소 10,000 PO 이상 입력'
                : `${formatNumber(netAmount)}원 정산 신청`}
            </Text>
          )}
        </TouchableOpacity>

        {/* 안내 사항 */}
        <View style={[styles.card, { backgroundColor: isDark ? theme.colors.surfaceSecondary : '#FFF6E6' }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>안내 사항</Text>
          <View style={styles.infoList}>
            <Text style={[styles.infoItem, { color: theme.colors.textSecondary }]}>
              {'\u2022'} 플랫폼 수수료: 10%
            </Text>
            <Text style={[styles.infoItem, { color: theme.colors.textSecondary }]}>
              {'\u2022'} 기타소득세: 3.3% (소득세 3% + 지방소득세 0.3%)
            </Text>
            <Text style={[styles.infoItem, { color: theme.colors.textSecondary }]}>
              {'\u2022'} 정산 처리: 영업일 기준 3~5일
            </Text>
            <Text style={[styles.infoItem, { color: theme.colors.textSecondary }]}>
              {'\u2022'} 최소 정산 금액: 10,000 PO
            </Text>
            <Text style={[styles.infoItem, { color: theme.colors.textSecondary }]}>
              {'\u2022'} 본인인증 완료 필수
            </Text>
            <Text style={[styles.infoItem, { color: theme.colors.textSecondary }]}>
              {'\u2022'} 1 PO = 1 KRW
            </Text>
          </View>
        </View>

        {/* 정산 내역 */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
            정산 내역 ({historyTotal}건)
          </Text>
          {history.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>
              정산 내역이 없습니다.
            </Text>
          ) : (
            history.map((item) => {
              const statusInfo = STATUS_LABELS[item.status] || { text: item.status, color: '#999' };
              return (
                <View key={item.id} style={[styles.historyItem, { borderBottomColor: theme.colors.border }]}>
                  <View style={styles.historyLeft}>
                    <Text style={[styles.historyAmount, { color: theme.colors.textPrimary }]}>
                      {formatNumber(item.amount)} PO
                    </Text>
                    <Text style={[styles.historyNet, { color: theme.colors.textSecondary }]}>
                      실수령: {formatNumber(item.netAmount)}원
                    </Text>
                    <Text style={[styles.historyDate, { color: theme.colors.textTertiary }]}>
                      {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                    </Text>
                    {item.rejectionReason && (
                      <Text style={[styles.historyReason, { color: theme.colors.error }]}>
                        사유: {item.rejectionReason}
                      </Text>
                    )}
                  </View>
                  <View style={styles.historyRight}>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                      <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.text}</Text>
                    </View>
                    {item.status === 'PENDING' && (
                      <TouchableOpacity
                        style={[styles.cancelButton, { borderColor: theme.colors.error }]}
                        onPress={() => handleCancelSettlement(item.id)}
                      >
                        <Text style={[styles.cancelButtonText, { color: theme.colors.error }]}>취소</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
          {history.length < historyTotal && (
            <TouchableOpacity
              style={[styles.loadMoreButton, { borderColor: theme.colors.border }]}
              onPress={() => fetchHistory(historyPage + 1)}
            >
              <Text style={[styles.loadMoreText, { color: theme.colors.textSecondary }]}>더보기</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 계좌 등록 모달 */}
      <Modal
        visible={showBankModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBankModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>정산 계좌 등록</Text>
              <TouchableOpacity onPress={() => setShowBankModal(false)}>
                <Text style={[styles.modalClose, { color: theme.colors.textSecondary }]}>X</Text>
              </TouchableOpacity>
            </View>

            {/* 은행 선택 */}
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>은행 선택</Text>
            <TouchableOpacity
              style={[styles.bankSelector, { borderColor: theme.colors.border, backgroundColor: isDark ? theme.colors.background : '#F8F9FB' }]}
              onPress={() => setShowBankPicker(!showBankPicker)}
            >
              <Text style={[styles.bankSelectorText, { color: selectedBank ? theme.colors.textPrimary : theme.colors.textTertiary }]}>
                {selectedBank || '은행을 선택해주세요'}
              </Text>
              <Text style={{ color: theme.colors.textTertiary }}>{showBankPicker ? '^' : 'v'}</Text>
            </TouchableOpacity>

            {showBankPicker && (
              <ScrollView style={[styles.bankList, { borderColor: theme.colors.border, backgroundColor: isDark ? theme.colors.background : '#FCFCFD' }]} nestedScrollEnabled>
                {BANKS.map((bank) => (
                  <TouchableOpacity
                    key={bank}
                    style={[
                      styles.bankOption,
                      { borderBottomColor: theme.colors.border },
                      selectedBank === bank && { backgroundColor: theme.colors.primaryBackground },
                    ]}
                    onPress={() => {
                      setSelectedBank(bank);
                      setShowBankPicker(false);
                    }}
                  >
                    <Text style={[styles.bankOptionText, { color: selectedBank === bank ? theme.colors.primary : theme.colors.textPrimary }]}>
                      {bank}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* 계좌번호 */}
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>계좌번호</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: theme.colors.border, color: theme.colors.textPrimary, backgroundColor: isDark ? theme.colors.background : '#F8F9FB' }]}
              value={accountNumber}
              onChangeText={(text) => setAccountNumber(text.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              placeholder="계좌번호 입력 ('-' 없이)"
              placeholderTextColor={theme.colors.textTertiary}
              maxLength={16}
            />

            {/* 예금주명 */}
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>예금주명</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: theme.colors.border, color: theme.colors.textPrimary, backgroundColor: isDark ? theme.colors.background : '#F8F9FB' }]}
              value={accountHolder}
              onChangeText={setAccountHolder}
              placeholder="예금주명 입력"
              placeholderTextColor={theme.colors.textTertiary}
              maxLength={20}
            />

            <TouchableOpacity
              style={[styles.modalSubmitButton, { backgroundColor: (selectedBank && accountNumber && accountHolder) ? theme.colors.primary : theme.colors.border }]}
              disabled={!selectedBank || !accountNumber || !accountHolder || registeringBank}
              onPress={handleRegisterBank}
            >
              {registeringBank ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.modalSubmitText}>계좌 등록</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  backText: {
    fontSize: 24,
    fontFamily: t.fonts.regular,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },

  // 잔액 카드
  balanceCard: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  balanceValue: {
    color: t.colors.surface,
    fontSize: 28,
    fontFamily: t.fonts.extrabold,
    fontWeight: '800',
    marginTop: 8,
  },
  balanceSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: t.fonts.regular,
    marginTop: 8,
  },

  // 카드
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    marginBottom: 12,
  },

  // 계산
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  calcLabel: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
  },
  calcValue: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  calcDivider: {
    height: 1,
    marginVertical: 8,
  },
  calcNetAmount: {
    fontSize: 17,
    fontFamily: t.fonts.extrabold,
    fontWeight: '800',
  },

  // 금액 입력
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  amountInput: {
    flex: 1,
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    paddingVertical: 14,
  },
  inputSuffix: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    marginLeft: 8,
  },
  quickAmounts: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  minAmountText: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    marginTop: 8,
  },

  // 계좌 정보
  bankInfoBox: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  bankName: {
    fontSize: 15,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  bankAccount: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    marginTop: 4,
  },
  bankHolder: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    marginTop: 2,
  },
  changeBankButton: {
    marginTop: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  changeBankText: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  registerBankButton: {
    paddingVertical: 14,
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  registerBankText: {
    fontSize: 15,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },

  // 정산 신청 버튼
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonText: {
    color: t.colors.surface,
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },

  // 안내 사항
  infoList: {
    gap: 6,
  },
  infoItem: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    lineHeight: 20,
  },

  // 정산 내역
  emptyText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14,
    fontFamily: t.fonts.regular,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  historyLeft: {
    flex: 1,
  },
  historyAmount: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  historyNet: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    marginTop: 2,
  },
  historyDate: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    marginTop: 4,
  },
  historyReason: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  loadMoreButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },

  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  modalClose: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    padding: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  bankSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  bankSelectorText: {
    fontSize: 15,
    fontFamily: t.fonts.regular,
  },
  bankList: {
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
  },
  bankOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  bankOptionText: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: t.fonts.regular,
  },
  modalSubmitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  modalSubmitText: {
    color: t.colors.surface,
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
});
