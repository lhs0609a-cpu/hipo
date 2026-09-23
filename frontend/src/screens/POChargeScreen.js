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
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { poWalletAPI } from '../services/api';

const notify = (title, message) => Platform.OS === 'web' ? window.alert(`${title}\n${message}`) : Alert.alert(title, message);
const confirmAction = (title, message, action) => {
  if (Platform.OS === 'web') { if (window.confirm(`${title}\n${message}`)) action(); }
  else Alert.alert(title, message, [{ text: '취소', style: 'cancel' }, { text: '확인', onPress: action }]);
};

const POChargeScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [cash, setCash] = useState(0);
  const [available, setAvailable] = useState(0);
  const [reserved, setReserved] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('charge');

  // Modals
  const [chargeModalVisible, setChargeModalVisible] = useState(false);
  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form states
  const [customAmount, setCustomAmount] = useState('');
  const [convertAmount, setConvertAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  useEffect(() => {
    fetchData();
    return navigation.addListener('focus', fetchData);
  }, [navigation]);

  const fetchData = async () => {
    try {
      const [balanceRes, productsRes, historyRes] = await Promise.all([
        poWalletAPI.getBalance(),
        poWalletAPI.getProducts(),
        poWalletAPI.getHistory('all'),
      ]);
      setBalance(balanceRes.data.poBalance || 0);
      setCash(balanceRes.data.cashBalance || 0);
      setAvailable(balanceRes.data.availableBalance || 0);
      setReserved(balanceRes.data.reservedBalance || 0);
      setError('');
      setProducts(productsRes.data.products || []);
      setHistory(historyRes.data.transactions || []);
    } catch (error) {
      setError('지갑 정보를 불러오지 못했습니다. 새로고침해주세요.');
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
    return Number(num).toLocaleString();
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

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setChargeModalVisible(true);
  };

  const handleCharge = () => {
    const amount = selectedProduct?.amount || Number(customAmount);
    if (processing) return;
    if (!Number.isSafeInteger(amount) || amount <= 0) return notify('오류', '양의 정수 금액을 입력해주세요');
    if (amount > cash) return notify('오류', '결제 완료 현금 잔액이 부족합니다. 현금 충전을 먼저 진행해주세요.');
    confirmAction('PO 전환', `현금 ${formatNumber(amount)}원을 ${formatNumber(amount)} PO로 전환합니다.`, async () => {
      setProcessing(true);
      try {
        await poWalletAPI.charge(amount);
        setChargeModalVisible(false);
        setSelectedProduct(null);
        setCustomAmount('');
        await fetchData();
        notify('완료', `${formatNumber(amount)} PO로 전환되었습니다`);
      } catch (error) { notify('오류', error.response?.data?.error || '전환에 실패했습니다'); }
      finally { setProcessing(false); }
    });
  };

  const handleConvert = () => {
    const amount = Number(convertAmount);
    if (processing) return;
    if (!Number.isSafeInteger(amount) || amount < 10000) return notify('오류', '최소 환전 금액은 10,000 PO입니다');
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) return notify('오류', '계좌 정보를 모두 입력해주세요');
    if (amount > available) return notify('오류', '주문 예약금을 제외한 사용 가능 PO가 부족합니다');
    confirmAction('PO 환전 신청', `${formatNumber(amount)} PO · 수수료 10% · 승인 후 지급액 ${formatNumber(amount - Math.floor(amount * 0.1))}원`, async () => {
      setProcessing(true);
      try {
        await poWalletAPI.convert(amount, bankName, accountNumber, accountHolder);
        setConvertModalVisible(false);
        setConvertAmount('');
        await fetchData();
        notify('접수 완료', '환전 신청이 접수되었습니다. 승인 후 지급됩니다.');
      } catch (error) { notify('오류', error.response?.data?.error || '환전 신청에 실패했습니다'); }
      finally { setProcessing(false); }
    });
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'PURCHASE':
        return { name: 'add-circle', color: '#3182F6' };
      case 'WITHDRAW':
        return { name: 'arrow-down-circle', color: '#F04452' };
      case 'TRADE':
        return { name: 'swap-horizontal', color: '#00C471' };
      case 'DIVIDEND':
        return { name: 'gift', color: '#FFB800' };
      default:
        return { name: 'ellipse', color: '#999' };
    }
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.productCard,
        item.isPopular && styles.popularProduct,
      ]}
      onPress={() => handleSelectProduct(item)}
    >
      {item.isPopular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>인기</Text>
        </View>
      )}
      <Text style={styles.productAmount}>{formatNumber(item.amount)} PO</Text>
      {item.bonus > 0 && (
        <Text style={styles.bonusText}>+{formatNumber(item.bonus)} 보너스</Text>
      )}
      <Text style={styles.productPrice}>{formatNumber(item.price)}원</Text>
    </TouchableOpacity>
  );

  const renderHistoryItem = ({ item }) => {
    const icon = getTransactionIcon(item.transactionType);
    return (
      <View style={styles.historyItem}>
        <View style={[styles.historyIcon, { backgroundColor: icon.color + '20' }]}>
          <Ionicons name={icon.name} size={24} color={icon.color} />
        </View>
        <View style={styles.historyContent}>
          <Text style={styles.historyTitle}>{item.description}</Text>
          <Text style={styles.historyDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text style={[
          styles.historyAmount,
          item.amount >= 0 ? styles.positive : styles.negative,
        ]}>
          {item.amount >= 0 ? '+' : ''}{formatNumber(item.amount)} PO
        </Text>
      </View>
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
        <Text style={styles.headerTitle}>PO 지갑</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 잔액 카드 */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>보유 PO</Text>
        <Text style={styles.balanceAmount}>{formatNumber(balance)} PO</Text>
        <Text style={{ color: '#fff' }}>사용 가능 {formatNumber(available)} PO · 주문 예약 {formatNumber(reserved)} PO</Text>
        <Text style={{ color: '#fff' }}>현금 잔액 {formatNumber(cash)}원</Text>
        {!!error && <Text style={{ color: '#fff' }}>{error}</Text>}
        <TouchableOpacity onPress={() => navigation.navigate('Charge')}><Text style={{ color: '#fff', padding: 12 }}>현금 충전</Text></TouchableOpacity>
        <View style={styles.balanceActions}>
          <TouchableOpacity
            style={styles.balanceButton}
            onPress={() => setActiveTab('charge')}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.balanceButtonText}>충전</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.balanceButton, styles.convertButton]}
            onPress={() => setConvertModalVisible(true)}
          >
            <Ionicons name="arrow-down-circle" size={24} color="#3182F6" />
            <Text style={[styles.balanceButtonText, { color: '#3182F6' }]}>환전</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 탭 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'charge' && styles.activeTab]}
          onPress={() => setActiveTab('charge')}
        >
          <Text style={[styles.tabText, activeTab === 'charge' && styles.activeTabText]}>
            충전하기
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            거래내역
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'charge' ? (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* 현금 → PO 전환 목록 */}
          <Text style={styles.sectionTitle}>현금 → PO 전환</Text>
          <FlatList
            data={products}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id?.toString() || item.amount.toString()}
            numColumns={2}
            columnWrapperStyle={styles.productRow}
            scrollEnabled={false}
          />

          {/* 직접 입력 */}
          <View style={styles.customSection}>
            <Text style={styles.sectionTitle}>직접 입력</Text>
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customInput}
                value={customAmount}
                onChangeText={setCustomAmount}
                placeholder="충전할 금액 입력"
                keyboardType="number-pad"
              />
              <TouchableOpacity
                style={styles.customButton}
                onPress={() => {
                  if (customAmount) {
                    setSelectedProduct({ amount: parseInt(customAmount), price: parseInt(customAmount) });
                    setChargeModalVisible(true);
                  }
                }}
              >
                <Text style={styles.customButtonText}>충전</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 안내 */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#666" />
            <Text style={styles.infoText}>
              - PO는 앱 내 주식 거래에 사용됩니다{'\n'}
              - 충전 즉시 사용 가능합니다{'\n'}
              - 환전 시 10% 수수료가 부과됩니다
            </Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.historyList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>거래 내역이 없습니다</Text>
            </View>
          }
        />
      )}

      {/* 충전 확인 모달 */}
      <Modal visible={chargeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>PO 충전</Text>

            {selectedProduct && (
              <View style={styles.chargePreview}>
                <View style={styles.chargeRow}>
                  <Text style={styles.chargeLabel}>충전 금액</Text>
                  <Text style={styles.chargeValue}>
                    {formatNumber(selectedProduct.amount)} PO
                  </Text>
                </View>
                {selectedProduct.bonus > 0 && (
                  <View style={styles.chargeRow}>
                    <Text style={styles.chargeLabel}>보너스</Text>
                    <Text style={[styles.chargeValue, { color: '#3182F6' }]}>
                      +{formatNumber(selectedProduct.bonus)} PO
                    </Text>
                  </View>
                )}
                <View style={[styles.chargeRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>전환할 현금</Text>
                  <Text style={styles.totalValue}>
                    {formatNumber(selectedProduct.price)}원
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.paymentMethods}>
              <Text style={styles.paymentTitle}>사용할 잔액</Text>
              <TouchableOpacity style={styles.paymentOption}>
                <Ionicons name="card" size={24} color="#3182F6" />
                <Text style={styles.paymentText}>결제 완료 현금 잔액</Text>
                <Ionicons name="checkmark-circle" size={24} color="#3182F6" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setChargeModalVisible(false);
                  setSelectedProduct(null);
                }}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                disabled={processing} onPress={handleCharge}
              >
                <Text style={styles.confirmButtonText}>PO로 전환</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 환전 모달 */}
      <Modal visible={convertModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>PO 환전</Text>
            <Text style={styles.modalDesc}>
              보유 PO를 현금으로 환전합니다{'\n'}
              환전 수수료 10%가 적용됩니다
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>환전 금액 (PO)</Text>
              <TextInput
                style={styles.input}
                value={convertAmount}
                onChangeText={setConvertAmount}
                placeholder="최소 10,000 PO"
                keyboardType="number-pad"
              />
              {convertAmount && (
                <Text style={styles.convertPreview}>
                  예상 입금액: {formatNumber(Number(convertAmount || 0) - Math.floor(Number(convertAmount || 0) * 0.1))}원
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>은행명</Text>
              <TextInput
                style={styles.input}
                value={bankName}
                onChangeText={setBankName}
                placeholder="예: 국민은행"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>계좌번호</Text>
              <TextInput
                style={styles.input}
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="계좌번호 입력"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>예금주</Text>
              <TextInput
                style={styles.input}
                value={accountHolder}
                onChangeText={setAccountHolder}
                placeholder="예금주명 입력"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setConvertModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                disabled={processing} onPress={handleConvert}
              >
                <Text style={styles.confirmButtonText}>환전 신청</Text>
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
  balanceCard: {
    backgroundColor: '#3182F6',
    margin: 16,
    borderRadius: 16,
    padding: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  balanceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  convertButton: {
    backgroundColor: '#fff',
  },
  balanceButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#3182F6',
  },
  tabText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  popularProduct: {
    borderColor: '#3182F6',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#3182F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  popularText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  productAmount: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  bonusText: {
    fontSize: 13,
    color: '#3182F6',
    fontWeight: '600',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 14,
    color: '#666',
  },
  customSection: {
    marginTop: 24,
  },
  customInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  customInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  customButton: {
    backgroundColor: '#3182F6',
    paddingHorizontal: 24,
    borderRadius: 8,
    justifyContent: 'center',
  },
  customButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  historyList: {
    padding: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  historyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 13,
    color: '#999',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  positive: {
    color: '#3182F6',
  },
  negative: {
    color: '#F04452',
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
  chargePreview: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  chargeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chargeLabel: {
    fontSize: 15,
    color: '#666',
  },
  chargeValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3182F6',
  },
  paymentMethods: {
    marginBottom: 20,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  paymentText: {
    flex: 1,
    fontSize: 15,
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
  convertPreview: {
    fontSize: 14,
    color: '#3182F6',
    marginTop: 8,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
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

export default POChargeScreen;
