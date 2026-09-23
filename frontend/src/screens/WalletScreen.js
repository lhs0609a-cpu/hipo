import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { walletAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
const notify = (title, message) => Platform.OS === 'web' ? window.alert(`${title}\n${message}`) : Alert.alert(title, message);

const WalletScreen = ({ navigation }) => {
  const { isAuthenticated } = useAuth();
  const [balance, setBalance] = useState(0);
  const [available, setAvailable] = useState(0);
  const [reserved, setReserved] = useState(0);
  const [cash, setCash] = useState(0);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchWalletData = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const [balanceRes, transactionsRes] = await Promise.all([
        walletAPI.getBalance(),
        walletAPI.getTransactions(),
      ]);
      setBalance(balanceRes.data.balance || 0);
      setAvailable(balanceRes.data.availableBalance || 0);
      setReserved(balanceRes.data.reservedBalance || 0);
      setCash(balanceRes.data.cashBalance || 0);
      setTransactions(transactionsRes.data.transactions || []);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      let errorMessage = '지갑 정보를 불러올 수 없습니다';
      if (error.response) {
        errorMessage = error.response.data?.message || `서버 오류 (${error.response.status})`;
      } else if (error.request) {
        errorMessage = '서버에 연결할 수 없습니다.\n인터넷 연결을 확인해주세요.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
    return navigation.addListener('focus', fetchWalletData);
  }, [isAuthenticated, navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWalletData();
  }, []);

  const openModal = (type) => {
    setModalType(type);
    setAmount('');
    setModalVisible(true);
  };

  const handleTransaction = async () => {
    const numAmount = Number(amount);
    if (!Number.isSafeInteger(numAmount) || numAmount <= 0) {
      notify('오류', '올바른 금액을 입력해주세요');
      return;
    }

    if (modalType === 'withdraw' && numAmount > available) {
      notify('오류', '사용 가능 잔액이 부족합니다');
      return;
    }

    setProcessing(true);
    try {
      if (modalType === 'deposit') {
        await walletAPI.deposit(numAmount);
        notify('성공', `${numAmount.toLocaleString()} PO로 전환되었습니다`);
      } else {
        await walletAPI.withdraw(numAmount, { bankName, accountNumber, accountHolder });
        notify('성공', `${numAmount.toLocaleString()} PO 환전 신청이 접수되었습니다`);
      }
      setModalVisible(false);
      fetchWalletData();
    } catch (error) {
      console.error('Transaction error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || '거래에 실패했습니다';
      notify('오류', errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'deposit':
        return '💵';
      case 'withdraw':
        return '💸';
      case 'buy':
        return '📈';
      case 'sell':
        return '📉';
      case 'dividend':
        return '💰';
      default:
        return '💳';
    }
  };

  const getTransactionLabel = (type) => {
    switch (type) {
      case 'deposit':
        return '입금';
      case 'withdraw':
        return '출금';
      case 'buy':
        return '주식 매수';
      case 'sell':
        return '주식 매도';
      case 'dividend':
        return '배당금';
      default:
        return '거래';
    }
  };

  const renderTransactionItem = ({ item }) => {
    const isPositive = item.amount > 0 || item.type === 'deposit' || item.type === 'sell' || item.type === 'dividend';
    const displayAmount = Math.abs(item.amount);

    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionIcon}>
          <Text style={styles.iconText}>{getTransactionIcon(item.type)}</Text>
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionType}>{item.description || getTransactionLabel(item.type)}</Text>
          <Text style={styles.transactionDate}>
            {new Date(item.createdAt || item.created_at).toLocaleDateString('ko-KR')}
          </Text>
        </View>
        <Text style={[styles.transactionAmount, isPositive ? styles.positive : styles.negative]}>
          {isPositive ? '+' : '-'}{displayAmount.toLocaleString()} PO
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>지갑</Text>
        </View>
        <View style={styles.loginRequiredContainer}>
          <Text style={styles.loginRequiredIcon}>💰</Text>
          <Text style={styles.loginRequiredTitle}>로그인이 필요합니다</Text>
          <Text style={styles.loginRequiredText}>
            지갑을 확인하려면{'\n'}로그인해주세요.
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>로그인하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>지갑</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchWalletData}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>지갑</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>보유 예수금</Text>
        <Text style={styles.balanceAmount}>{balance.toLocaleString()} PO</Text>
        <Text>사용 가능 {available.toLocaleString()} PO · 주문 예약 {reserved.toLocaleString()} PO</Text>
        <Text>결제 완료 현금 {cash.toLocaleString()}원</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Charge')}><Text style={{ color: '#007AFF', padding: 10 }}>현금 충전</Text></TouchableOpacity>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.depositButton]}
            onPress={() => openModal('deposit')}
          >
            <Text style={styles.actionButtonText}>현금 → PO</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.withdrawButton]}
            onPress={() => openModal('withdraw')}
          >
            <Text style={styles.actionButtonText}>환전 신청</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.transactionsSection}>
        <Text style={styles.sectionTitle}>거래 내역</Text>
        <FlatList
          data={transactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id?.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>거래 내역이 없습니다</Text>
            </View>
          }
        />
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalType === 'deposit' ? '현금 잔액을 PO로 전환' : 'PO 환전 신청'}
            </Text>

            <TextInput
              style={styles.amountInput}
              placeholder="금액을 입력하세요"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            {modalType === 'withdraw' ? <View>
              <Text>최소 10,000 PO · 수수료 10% · 승인 후 지급</Text>
              <TextInput style={styles.amountInput} placeholder="은행명" value={bankName} onChangeText={setBankName} />
              <TextInput style={styles.amountInput} placeholder="계좌번호" value={accountNumber} onChangeText={setAccountNumber} />
              <TextInput style={styles.amountInput} placeholder="예금주" value={accountHolder} onChangeText={setAccountHolder} />
            </View> : <Text>결제 완료 현금 {cash.toLocaleString()}원에서 1원당 1 PO로 전환합니다.</Text>}
            <View style={styles.quickAmounts}>
              {[10000, 50000, 100000, 500000].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={styles.quickAmountButton}
                  onPress={() => setAmount(String(value))}
                >
                  <Text style={styles.quickAmountText}>
                    +{(value / 10000).toFixed(0)}만
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  modalType === 'deposit' ? styles.depositConfirm : styles.withdrawConfirm,
                  processing && styles.buttonDisabled,
                ]}
                onPress={handleTransaction}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {modalType === 'deposit' ? '전환' : '환전 신청'}
                  </Text>
                )}
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
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  balanceCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  depositButton: {
    backgroundColor: '#4CAF50',
  },
  withdrawButton: {
    backgroundColor: '#FF5722',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionsSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  transactionItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  transactionDate: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#FF5722',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  loginRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loginRequiredIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  loginRequiredTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  loginRequiredText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  amountInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickAmountButton: {
    backgroundColor: '#e3f2fd',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  quickAmountText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  depositConfirm: {
    backgroundColor: '#4CAF50',
  },
  withdrawConfirm: {
    backgroundColor: '#FF5722',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WalletScreen;
