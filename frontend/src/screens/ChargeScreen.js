import React, { useState, useEffect } from 'react';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import api from '../services/api';
import { API_URL } from '../config';

const ChargeScreen = ({ navigation, route }) => {
  const styles = useThemedStyles(makeStyles);
  const [balance, setBalance] = useState(0);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState(null);

  // 충전 옵션 (원화 금액 → PO 변환)
  const chargeOptions = [
    { amount: 1000, bonus: 0, label: '1,000원', poAmount: 1000 },
    { amount: 5000, bonus: 5, label: '5,000원', badgeText: '+5%', poAmount: 5250 },
    { amount: 10000, bonus: 10, label: '10,000원', badgeText: '+10%', poAmount: 11000 },
    { amount: 30000, bonus: 15, label: '30,000원', badgeText: '+15%', poAmount: 34500 },
    { amount: 50000, bonus: 20, label: '50,000원', badgeText: '+20%', poAmount: 60000 },
  ];

  useEffect(() => {
    fetchBalance();

    // 결제 완료 후 딥링크로 돌아왔을 때 처리
    const handleDeepLink = async (event) => {
      const url = event.url;
      if (url.includes('payment/success') || url.includes('mobile-success')) {
        const orderId = extractOrderId(url);
        const paymentKey = extractPaymentKey(url);
        const amount = extractAmount(url);
        if (orderId) {
          await handlePaymentComplete(orderId, paymentKey, amount);
        }
      } else if (url.includes('payment/fail') || url.includes('mobile-fail')) {
        Alert.alert('결제 실패', '결제가 실패했습니다. 다시 시도해주세요.');
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // route.params로 결제 결과 확인 (웹에서 리다이렉트된 경우)
    if (route?.params?.paymentSuccess && route?.params?.orderId) {
      handlePaymentComplete(route.params.orderId, route.params.paymentKey, route.params.amount);
    }

    return () => {
      subscription?.remove();
    };
  }, [route?.params]);

  const extractOrderId = (url) => {
    const match = url.match(/orderId=([^&]+)/);
    return match ? match[1] : null;
  };

  const extractPaymentKey = (url) => {
    const match = url.match(/paymentKey=([^&]+)/);
    return match ? match[1] : null;
  };

  const extractAmount = (url) => {
    const match = url.match(/amount=([^&]+)/);
    return match ? parseInt(match[1]) : null;
  };

  const fetchBalance = async () => {
    try {
      setLoadingBalance(true);
      const response = await api.get('/payment/my-balance');
      if (response.data.success) {
        setBalance(response.data.balance);
      }
    } catch (error) {
      console.error('잔액 조회 실패:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const calculateBonus = (amount) => {
    let bonusRate = 0;
    if (amount >= 50000) bonusRate = 0.20;
    else if (amount >= 30000) bonusRate = 0.15;
    else if (amount >= 10000) bonusRate = 0.10;
    else if (amount >= 5000) bonusRate = 0.05;

    const bonusAmount = Math.floor(amount * bonusRate);
    const totalPO = amount + bonusAmount;

    return { bonusAmount, totalPO, bonusRate: bonusRate * 100 };
  };

  const handleAmountSelect = (amount) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (text) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    setCustomAmount(numericValue);
    setSelectedAmount(null);
  };

  const getSelectedAmount = () => {
    if (customAmount && parseInt(customAmount) > 0) {
      return parseInt(customAmount);
    }
    return selectedAmount;
  };

  const handlePaymentComplete = async (orderId, paymentKey, amount) => {
    try {
      setLoading(true);
      // 서버에서 결제 상태 확인
      const response = await api.get(`/payment/charge/status/${orderId}`);

      if (response.data.success && response.data.status === 'COMPLETED') {
        Alert.alert(
          '충전 완료',
          `${response.data.totalAmount?.toLocaleString()} PO가 충전되었습니다!`,
          [{ text: '확인', onPress: () => fetchBalance() }]
        );
      } else if (response.data.status === 'PENDING') {
        // 아직 처리 중인 경우 결제 승인 시도
        await confirmPayment(orderId, paymentKey, amount || response.data.amount);
      }
    } catch (error) {
      console.error('결제 상태 확인 실패:', error);
    } finally {
      setLoading(false);
      setPendingOrderId(null);
    }
  };

  const confirmPayment = async (orderId, paymentKey, amount) => {
    try {
      if (!paymentKey) {
        console.error('paymentKey가 없습니다. 결제 상태를 확인하세요.');
        return;
      }

      const response = await api.post('/payment/charge/confirm', {
        paymentKey,
        orderId,
        amount,
      });

      if (response.data.success) {
        Alert.alert(
          '충전 완료',
          `${response.data.payment?.totalAmount?.toLocaleString() || ''} PO가 충전되었습니다!`,
          [{ text: '확인', onPress: () => fetchBalance() }]
        );
      }
    } catch (error) {
      console.error('결제 승인 실패:', error);
      Alert.alert('오류', '결제 승인 중 오류가 발생했습니다.');
    }
  };

  const handleCharge = async () => {
    const amount = getSelectedAmount();

    if (!amount || amount < 1000) {
      Alert.alert('알림', '최소 충전 금액은 1,000원입니다.');
      return;
    }

    if (amount > 1000000) {
      Alert.alert('알림', '최대 충전 금액은 1,000,000원입니다.');
      return;
    }

    setPaymentModalVisible(true);
  };

  const processPayment = async (paymentMethod) => {
    const amount = getSelectedAmount();
    setPaymentModalVisible(false);
    setLoading(true);

    try {
      // 1. 충전 요청 (주문 생성)
      const requestResponse = await api.post('/payment/charge/request', { amount });

      if (!requestResponse.data.success) {
        Alert.alert('오류', requestResponse.data.error || '충전 요청 실패');
        setLoading(false);
        return;
      }

      const { orderId, totalAmount, bonusAmount } = requestResponse.data;
      setPendingOrderId(orderId);

      // 2. 토스페이먼츠 클라이언트 키 가져오기
      const keyResponse = await api.get('/payment/toss-client-key');
      const clientKey = keyResponse.data.clientKey;

      // 3. 사용자 정보
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : { username: '사용자' };

      // 4. 결제 URL 생성 (백엔드에서 처리하거나 프론트에서 직접 구성)
      const baseUrl = API_URL.replace('/api', '');
      const successUrl = encodeURIComponent(`${baseUrl}/payment/mobile-success`);
      const failUrl = encodeURIComponent(`${baseUrl}/payment/mobile-fail`);

      // 토스페이먼츠 결제 위젯 URL
      const paymentUrl = `${baseUrl}/payment/checkout?` +
        `orderId=${orderId}` +
        `&amount=${amount}` +
        `&orderName=${encodeURIComponent(`PO 충전 (${amount.toLocaleString()}원 → ${totalAmount.toLocaleString()} PO)`)}` +
        `&customerName=${encodeURIComponent(user.username)}` +
        `&method=${paymentMethod}`;

      // 5. 결제 페이지 열기
      if (Platform.OS === 'web') {
        // 웹에서는 새 창으로 열기
        window.open(paymentUrl, '_blank');
      } else {
        // 모바일에서는 인앱 브라우저 사용
        const result = await WebBrowser.openBrowserAsync(paymentUrl, {
          dismissButtonStyle: 'cancel',
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          controlsColor: '#2B5FE3',
        });

        // 브라우저가 닫혔을 때 결제 상태 확인
        if (result.type === 'cancel' || result.type === 'dismiss') {
          // 사용자가 브라우저를 닫음 - 결제 상태 확인
          setTimeout(async () => {
            await handlePaymentComplete(orderId);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('충전 오류:', error);
      Alert.alert('오류', '충전 요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const renderAmountOption = (option) => {
    const isSelected = selectedAmount === option.amount;
    const bonus = calculateBonus(option.amount);

    return (
      <TouchableOpacity
        key={option.amount}
        style={[
          styles.amountOption,
          isSelected && styles.amountOptionSelected
        ]}
        onPress={() => handleAmountSelect(option.amount)}
      >
        <View style={styles.amountOptionContent}>
          <Text style={[
            styles.amountLabel,
            isSelected && styles.amountLabelSelected
          ]}>
            {option.label}
          </Text>
          {option.bonus > 0 && (
            <View style={styles.bonusBadge}>
              <Text style={styles.bonusBadgeText}>{option.badgeText}</Text>
            </View>
          )}
        </View>
        <View style={styles.amountPORow}>
          <Ionicons name="arrow-forward" size={14} color={isSelected ? '#2B5FE3' : '#999'} />
          <Text style={[
            styles.amountPO,
            isSelected && styles.amountPOSelected
          ]}>
            {bonus.totalPO.toLocaleString()} PO
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const selectedAmountValue = getSelectedAmount();
  const bonus = selectedAmountValue ? calculateBonus(selectedAmountValue) : null;

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PO 충전</Text>
        <TouchableOpacity onPress={() => navigation.navigate('PaymentHistory')}>
          <Ionicons name="receipt-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 잔액 카드 */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>현재 보유 PO</Text>
          {loadingBalance ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <Text style={styles.balanceAmount}>{balance.toLocaleString()} PO</Text>
          )}
          <Text style={styles.balanceSubtext}>
            약 {Math.floor(balance * 0.95).toLocaleString()}원 상당
          </Text>
        </View>

        {/* 충전 금액 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>충전 금액 선택</Text>
          <Text style={styles.sectionSubtitle}>원화를 PO로 충전합니다</Text>
          <View style={styles.amountGrid}>
            {chargeOptions.map(option => renderAmountOption(option))}
          </View>
        </View>

        {/* 직접 입력 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>직접 입력</Text>
          <View style={styles.customInputWrapper}>
            <TextInput
              style={[
                styles.customInput,
                customAmount && styles.customInputActive
              ]}
              placeholder="충전할 금액 입력 (원)"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={customAmount}
              onChangeText={handleCustomAmountChange}
            />
            <Text style={styles.currencyLabel}>원</Text>
          </View>
          {customAmount && parseInt(customAmount) >= 1000 && bonus && (
            <View style={styles.customAmountInfo}>
              <View style={styles.conversionRow}>
                <Text style={styles.conversionLabel}>결제 금액</Text>
                <Text style={styles.conversionValue}>{parseInt(customAmount).toLocaleString()}원</Text>
              </View>
              {bonus.bonusAmount > 0 && (
                <View style={styles.conversionRow}>
                  <Text style={styles.conversionLabel}>보너스 ({bonus.bonusRate}%)</Text>
                  <Text style={styles.bonusValue}>+{bonus.bonusAmount.toLocaleString()} PO</Text>
                </View>
              )}
              <View style={[styles.conversionRow, styles.totalConversionRow]}>
                <Text style={styles.totalLabel}>받는 PO</Text>
                <Text style={styles.totalValue}>{bonus.totalPO.toLocaleString()} PO</Text>
              </View>
            </View>
          )}
        </View>

        {/* 결제 정보 요약 */}
        {selectedAmountValue && bonus && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>결제 정보</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>결제 금액</Text>
              <Text style={styles.summaryValue}>{selectedAmountValue.toLocaleString()}원</Text>
            </View>
            <View style={styles.summaryDivider} />
            {bonus.bonusAmount > 0 && (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>기본 PO</Text>
                  <Text style={styles.summaryValue}>{selectedAmountValue.toLocaleString()} PO</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>보너스 ({bonus.bonusRate}%)</Text>
                  <Text style={styles.summaryBonus}>+{bonus.bonusAmount.toLocaleString()} PO</Text>
                </View>
              </>
            )}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelTotal}>총 받는 PO</Text>
              <Text style={styles.summaryValueTotal}>{bonus.totalPO.toLocaleString()} PO</Text>
            </View>
          </View>
        )}

        {/* 충전 버튼 */}
        <TouchableOpacity
          style={[
            styles.chargeButton,
            (!selectedAmountValue || loading) && styles.chargeButtonDisabled
          ]}
          onPress={handleCharge}
          disabled={!selectedAmountValue || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.chargeButtonText}>
              {selectedAmountValue
                ? `${selectedAmountValue.toLocaleString()}원 결제하기`
                : '금액을 선택해주세요'
              }
            </Text>
          )}
        </TouchableOpacity>

        {/* 안내사항 */}
        <View style={styles.noticeCard}>
          <View style={styles.noticeHeader}>
            <Ionicons name="information-circle" size={20} color="#2B5FE3" />
            <Text style={styles.noticeTitle}>안내사항</Text>
          </View>
          <Text style={styles.noticeText}>• 충전 금액에 따라 최대 20% 보너스 PO가 제공됩니다</Text>
          <Text style={styles.noticeText}>• 결제는 토스페이먼츠를 통해 안전하게 처리됩니다</Text>
          <Text style={styles.noticeText}>• PO는 크리에이터 주식 거래에 사용됩니다</Text>
        </View>

        <View style={styles.warningCard}>
          <View style={styles.noticeHeader}>
            <Ionicons name="warning" size={20} color="#F0344B" />
            <Text style={styles.warningTitle}>환불 정책</Text>
          </View>
          <Text style={styles.warningText}>• PO는 원칙적으로 환불되지 않습니다</Text>
          <Text style={styles.warningText}>• 미사용 PO에 한해 7일 이내 환불 신청 가능</Text>
          <Text style={styles.warningText}>• 보너스 PO는 환불 대상에서 제외됩니다</Text>
          <Text style={styles.warningText}>• 투자 손실은 환불되지 않습니다</Text>
          <Text style={styles.warningSubtext}>환불 문의: support@hipo.app</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 결제 수단 선택 모달 */}
      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>결제 수단 선택</Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {selectedAmountValue && bonus && (
              <View style={styles.modalSummary}>
                <Text style={styles.modalSummaryLabel}>결제 금액</Text>
                <Text style={styles.modalSummaryAmount}>{selectedAmountValue.toLocaleString()}원</Text>
                <Text style={styles.modalSummaryPO}>→ {bonus.totalPO.toLocaleString()} PO</Text>
              </View>
            )}

            <View style={styles.paymentMethods}>
              <TouchableOpacity
                style={styles.paymentMethod}
                onPress={() => processPayment('CARD')}
              >
                <View style={[styles.paymentIcon, { backgroundColor: '#EEF4FF' }]}>
                  <Ionicons name="card" size={24} color="#2B5FE3" />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentName}>신용/체크카드</Text>
                  <Text style={styles.paymentDesc}>모든 카드 결제 가능</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.paymentMethod}
                onPress={() => processPayment('TOSSPAY')}
              >
                <View style={[styles.paymentIcon, { backgroundColor: '#EEF4FF' }]}>
                  <Text style={styles.paymentIconText}>T</Text>
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentName}>토스페이</Text>
                  <Text style={styles.paymentDesc}>토스 앱으로 간편결제</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.paymentMethod}
                onPress={() => processPayment('NAVERPAY')}
              >
                <View style={[styles.paymentIcon, { backgroundColor: '#E7F8F0' }]}>
                  <Text style={[styles.paymentIconText, { color: '#00C73C' }]}>N</Text>
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentName}>네이버페이</Text>
                  <Text style={styles.paymentDesc}>네이버페이로 간편결제</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.paymentMethod}
                onPress={() => processPayment('KAKAOPAY')}
              >
                <View style={[styles.paymentIcon, { backgroundColor: '#FFF6E6' }]}>
                  <Text style={[styles.paymentIconText, { color: '#FEE500' }]}>K</Text>
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentName}>카카오페이</Text>
                  <Text style={styles.paymentDesc}>카카오톡으로 간편결제</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.paymentMethod}
                onPress={() => processPayment('TRANSFER')}
              >
                <View style={[styles.paymentIcon, { backgroundColor: '#F1F3F7' }]}>
                  <Ionicons name="business" size={24} color="#666" />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentName}>계좌이체</Text>
                  <Text style={styles.paymentDesc}>실시간 계좌이체</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    backgroundColor: t.colors.surface,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  balanceCard: {
    backgroundColor: t.colors.primary,
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 34,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.surface,
  },
  balanceSubtext: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    marginBottom: 12,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  amountOption: {
    width: '48%',
    backgroundColor: t.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: t.colors.border,
  },
  amountOptionSelected: {
    borderColor: t.colors.primary,
    backgroundColor: t.colors.primaryBackground,
  },
  amountOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.textPrimary,
  },
  amountLabelSelected: {
    color: t.colors.primary,
  },
  bonusBadge: {
    backgroundColor: t.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bonusBadgeText: {
    color: t.colors.surface,
    fontSize: 11,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
  },
  amountPORow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amountPO: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    color: t.colors.textSecondary,
    fontWeight: '600',
  },
  amountPOSelected: {
    color: t.colors.primary,
  },
  customInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: t.colors.border,
  },
  customInput: {
    flex: 1,
    padding: 16,
    fontSize: 17,
    fontFamily: t.fonts.regular,
  },
  customInputActive: {
    borderColor: t.colors.primary,
  },
  currencyLabel: {
    paddingRight: 16,
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    color: t.colors.textSecondary,
    fontWeight: '600',
  },
  customAmountInfo: {
    marginTop: 12,
    padding: 16,
    backgroundColor: t.colors.primaryBackground,
    borderRadius: 12,
  },
  conversionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  conversionLabel: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  conversionValue: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
  },
  bonusValue: {
    fontSize: 14,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.error,
  },
  totalConversionRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: t.colors.primaryBorder,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
  },
  totalValue: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.primary,
  },
  summaryCard: {
    backgroundColor: t.colors.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  summaryTitle: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.textPrimary,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
  },
  summaryBonus: {
    fontSize: 14,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.error,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: t.colors.backgroundSecondary,
    marginVertical: 12,
  },
  summaryLabelTotal: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.textPrimary,
  },
  summaryValueTotal: {
    fontSize: 20,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.primary,
  },
  chargeButton: {
    backgroundColor: t.colors.primary,
    marginHorizontal: 16,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  chargeButtonDisabled: {
    backgroundColor: t.colors.borderDark,
  },
  chargeButtonText: {
    color: t.colors.surface,
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
  },
  noticeCard: {
    backgroundColor: t.colors.surface,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  noticeTitle: {
    fontSize: 14,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.textPrimary,
  },
  noticeText: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    marginBottom: 6,
    lineHeight: 20,
  },
  // Warning card styles
  warningCard: {
    backgroundColor: t.colors.errorBackground,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.colors.stockUpSoft,
  },
  warningTitle: {
    fontSize: 14,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.error,
  },
  warningText: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    marginBottom: 6,
    lineHeight: 20,
  },
  warningSubtext: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.backgroundSecondary,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  modalSummary: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: t.colors.background,
  },
  modalSummaryLabel: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    marginBottom: 4,
  },
  modalSummaryAmount: {
    fontSize: 28,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.textPrimary,
  },
  modalSummaryPO: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    color: t.colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  paymentMethods: {
    padding: 16,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: t.colors.background,
    borderRadius: 12,
    marginBottom: 12,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentIconText: {
    fontSize: 20,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.primary,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
    marginBottom: 2,
  },
  paymentDesc: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
  },
});

export default ChargeScreen;
