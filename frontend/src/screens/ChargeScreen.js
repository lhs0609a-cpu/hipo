import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

const ChargeScreen = ({ navigation }) => {
  const [balance, setBalance] = useState(0);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(true);

  // 충전 옵션 (금액, 보너스율)
  const chargeOptions = [
    { amount: 1000, bonus: 0, label: '1,000원' },
    { amount: 5000, bonus: 5, label: '5,000원', badgeText: '+5%' },
    { amount: 10000, bonus: 10, label: '10,000원', badgeText: '+10%' },
    { amount: 30000, bonus: 15, label: '30,000원', badgeText: '+15%' },
    { amount: 50000, bonus: 20, label: '50,000원', badgeText: '+20%' }
  ];

  useEffect(() => {
    fetchBalance();
  }, []);

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
    const totalAmount = amount + bonusAmount;

    return { bonusAmount, totalAmount, bonusRate: bonusRate * 100 };
  };

  const handleAmountSelect = (amount) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (text) => {
    // 숫자만 입력 가능
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

    try {
      setLoading(true);

      // 1. 충전 요청 (주문 생성)
      const requestResponse = await api.post('/payment/charge/request', { amount });

      if (!requestResponse.data.success) {
        Alert.alert('오류', requestResponse.data.error || '충전 요청 실패');
        return;
      }

      const { orderId, totalAmount, bonusAmount } = requestResponse.data;

      // 2. 토스페이먼츠 결제 창 열기
      if (Platform.OS === 'web') {
        // 웹에서는 토스페이먼츠 SDK 사용
        await openTossPaymentWeb(orderId, amount, totalAmount, bonusAmount);
      } else {
        // 모바일에서는 WebView 또는 In-App Browser 사용
        Alert.alert('안내', '모바일 결제는 현재 개발 중입니다. 웹 버전을 이용해주세요.');
      }
    } catch (error) {
      console.error('충전 오류:', error);
      Alert.alert('오류', '충전 요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const openTossPaymentWeb = async (orderId, amount, totalAmount, bonusAmount) => {
    try {
      // 토스페이먼츠 클라이언트 키 가져오기
      const keyResponse = await api.get('/payment/toss-client-key');
      const clientKey = keyResponse.data.clientKey;

      // 현재 사용자 정보
      const user = JSON.parse(await AsyncStorage.getItem('user'));

      // 토스페이먼츠 SDK 로드 (동적으로)
      const loadTossPaymentsScript = () => {
        return new Promise((resolve, reject) => {
          if (window.TossPayments) {
            resolve(window.TossPayments);
            return;
          }

          const script = document.createElement('script');
          script.src = 'https://js.tosspayments.com/v1/payment';
          script.onload = () => resolve(window.TossPayments);
          script.onerror = reject;
          document.head.appendChild(script);
        });
      };

      const TossPayments = await loadTossPaymentsScript();
      const tossPayments = TossPayments(clientKey);

      // 결제 요청
      tossPayments.requestPayment('카드', {
        amount,
        orderId,
        orderName: `포인트 충전 (${amount.toLocaleString()}원 + 보너스 ${bonusAmount.toLocaleString()}원)`,
        customerName: user.username,
        successUrl: `${window.location.origin}/payment/success?orderId=${orderId}`,
        failUrl: `${window.location.origin}/payment/fail?orderId=${orderId}`,
        flowMode: 'DEFAULT', // 기본 결제 플로우
        easyPay: '토스페이,네이버페이,카카오페이' // 간편결제 옵션
      }).catch(error => {
        if (error.code === 'USER_CANCEL') {
          Alert.alert('알림', '결제가 취소되었습니다.');
        } else {
          Alert.alert('오류', error.message || '결제 요청 실패');
        }
      });

    } catch (error) {
      console.error('토스페이먼츠 초기화 실패:', error);
      Alert.alert('오류', '결제 시스템 초기화 실패');
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
        {bonus.bonusAmount > 0 && (
          <Text style={[
            styles.totalAmountText,
            isSelected && styles.totalAmountTextSelected
          ]}>
            실제: {bonus.totalAmount.toLocaleString()}원
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const selectedAmountValue = getSelectedAmount();
  const bonus = selectedAmountValue ? calculateBonus(selectedAmountValue) : null;

  return (
    <ScrollView style={styles.container}>
      {/* 잔액 카드 */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>현재 잔액</Text>
        {loadingBalance ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <Text style={styles.balanceAmount}>{balance.toLocaleString()}원</Text>
        )}
      </View>

      {/* 충전 금액 선택 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>충전 금액 선택</Text>
        <View style={styles.amountGrid}>
          {chargeOptions.map(option => renderAmountOption(option))}
        </View>
      </View>

      {/* 직접 입력 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>직접 입력</Text>
        <TextInput
          style={[
            styles.customInput,
            customAmount && styles.customInputActive
          ]}
          placeholder="금액 입력 (최소 1,000원)"
          keyboardType="numeric"
          value={customAmount}
          onChangeText={handleCustomAmountChange}
        />
        {customAmount && parseInt(customAmount) >= 1000 && (
          <View style={styles.customAmountInfo}>
            <Text style={styles.customAmountText}>
              충전 금액: {parseInt(customAmount).toLocaleString()}원
            </Text>
            {bonus && bonus.bonusAmount > 0 && (
              <>
                <Text style={styles.customBonusText}>
                  보너스: +{bonus.bonusAmount.toLocaleString()}원 ({bonus.bonusRate}%)
                </Text>
                <Text style={styles.customTotalText}>
                  실제 받는 금액: {bonus.totalAmount.toLocaleString()}원
                </Text>
              </>
            )}
          </View>
        )}
      </View>

      {/* 결제 정보 요약 */}
      {selectedAmountValue && bonus && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>결제 정보</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>충전 금액</Text>
            <Text style={styles.summaryValue}>{selectedAmountValue.toLocaleString()}원</Text>
          </View>
          {bonus.bonusAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>보너스 ({bonus.bonusRate}%)</Text>
              <Text style={styles.summaryBonus}>+{bonus.bonusAmount.toLocaleString()}원</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.summaryRowTotal]}>
            <Text style={styles.summaryLabelTotal}>받는 금액</Text>
            <Text style={styles.summaryValueTotal}>{bonus.totalAmount.toLocaleString()}원</Text>
          </View>
        </View>
      )}

      {/* 결제 수단 안내 */}
      <View style={styles.paymentMethodsCard}>
        <Text style={styles.paymentMethodsTitle}>사용 가능한 결제 수단</Text>
        <View style={styles.paymentMethodsGrid}>
          <Text style={styles.paymentMethod}>💳 신용카드</Text>
          <Text style={styles.paymentMethod}>🏦 계좌이체</Text>
          <Text style={styles.paymentMethod}>💙 토스페이</Text>
          <Text style={styles.paymentMethod}>💚 네이버페이</Text>
          <Text style={styles.paymentMethod}>💛 카카오페이</Text>
          <Text style={styles.paymentMethod}>📱 간편결제</Text>
        </View>
      </View>

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
              ? `${selectedAmountValue.toLocaleString()}원 충전하기`
              : '금액을 선택해주세요'
            }
          </Text>
        )}
      </TouchableOpacity>

      {/* 거래 내역 버튼 */}
      <TouchableOpacity
        style={styles.historyButton}
        onPress={() => navigation.navigate('PaymentHistory')}
      >
        <Text style={styles.historyButtonText}>거래 내역 보기</Text>
      </TouchableOpacity>

      {/* 안내사항 */}
      <View style={styles.noticeCard}>
        <Text style={styles.noticeTitle}>💡 안내사항</Text>
        <Text style={styles.noticeText}>• 충전 금액에 따라 최대 20% 보너스가 제공됩니다</Text>
        <Text style={styles.noticeText}>• 결제는 토스페이먼츠를 통해 안전하게 처리됩니다</Text>
        <Text style={styles.noticeText}>• 테스트 모드에서는 실제 결제가 이루어지지 않습니다</Text>
        <Text style={styles.noticeText}>• 환불은 고객센터를 통해 요청하실 수 있습니다</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  balanceCard: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center'
  },
  balanceLabel: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.8,
    marginBottom: 8
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF'
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  amountOption: {
    width: '48%',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    position: 'relative'
  },
  amountOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF'
  },
  amountLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  amountLabelSelected: {
    color: '#007AFF'
  },
  bonusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  bonusBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold'
  },
  totalAmountText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  totalAmountTextSelected: {
    color: '#007AFF'
  },
  customInput: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0'
  },
  customInputActive: {
    borderColor: '#007AFF'
  },
  customAmountInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F0F7FF',
    borderRadius: 8
  },
  customAmountText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4
  },
  customBonusText: {
    fontSize: 14,
    color: '#FF3B30',
    marginBottom: 4,
    fontWeight: 'bold'
  },
  customTotalText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold'
  },
  summaryCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666'
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  summaryBonus: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF3B30'
  },
  summaryRowTotal: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  summaryLabelTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  summaryValueTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF'
  },
  paymentMethodsCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16
  },
  paymentMethodsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  paymentMethod: {
    fontSize: 13,
    color: '#666',
    marginRight: 16,
    marginBottom: 8
  },
  chargeButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12
  },
  chargeButtonDisabled: {
    backgroundColor: '#CCC'
  },
  chargeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  historyButton: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  historyButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600'
  },
  noticeCard: {
    backgroundColor: '#FFF9E6',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  noticeText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18
  }
});

export default ChargeScreen;
