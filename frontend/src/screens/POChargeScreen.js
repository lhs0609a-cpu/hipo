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
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { poWalletAPI } from '../services/api';

const POChargeScreen = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(0);
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
  }, []);

  const fetchData = async () => {
    try {
      const [balanceRes, productsRes, historyRes] = await Promise.all([
        poWalletAPI.getBalance(),
        poWalletAPI.getProducts(),
        poWalletAPI.getHistory('all'),
      ]);
      setBalance(balanceRes.data.balance || 0);
      setProducts(productsRes.data.products || []);
      setHistory(historyRes.data.history || []);
    } catch (error) {
      console.error('Error fetching PO data:', error);
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

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setChargeModalVisible(true);
  };

  const handleCharge = async () => {
    const amount = selectedProduct?.amount || parseInt(customAmount);
    if (!amount || amount <= 0) {
      Alert.alert('오류', '충전 금액을 선택해주세요');
      return;
    }

    // In real app, this would open payment gateway
    Alert.alert(
      'PO 충전',
      `${formatNumber(amount)} PO를 충전하시겠습니까?\n결제 금액: ${formatNumber(amount)}원`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '결제하기',
          onPress: async () => {
            try {
              // Simulate payment ID
              const paymentId = `PAY_${Date.now()}`;
              await poWalletAPI.charge(amount, 'card', paymentId);
              Alert.alert('성공', `${formatNumber(amount)} PO가 충전되었습니다`);
              setChargeModalVisible(false);
              setSelectedProduct(null);
              setCustomAmount('');
              fetchData();
            } catch (error) {
              Alert.alert('오류', error.response?.data?.message || '충전에 실패했습니다');
            }
          },
        },
      ]
    );
  };

  const handleConvert = async () => {
    if (!convertAmount || !bankName || !accountNumber || !accountHolder) {
      Alert.alert('오류', '모든 필드를 입력해주세요');
      return;
    }

    const amount = parseInt(convertAmount);
    if (amount > balance) {
      Alert.alert('오류', '보유 PO보다 많은 금액입니다');
      return;
    }

    if (amount < 10000) {
      Alert.alert('오류', '최소 출금 금액은 10,000 PO입니다');
      return;
    }

    Alert.alert(
      'PO 환전',
      `${formatNumber(amount)} PO를 현금으로 환전합니다.\n수수료 5% 차감 후 ${formatNumber(Math.floor(amount * 0.95))}원이 입금됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '환전하기',
          onPress: async () => {
            try {
              await poWalletAPI.convert(amount, bankName, accountNumber, accountHolder);
              Alert.alert('성공', '환전 신청이 완료되었습니다. 1-3일 내에 입금됩니다.');
              setConvertModalVisible(false);
              setConvertAmount('');
              setBankName('');
              setAccountNumber('');
              setAccountHolder('');
              fetchData();
            } catch (error) {
              Alert.alert('오류', error.response?.data?.message || '환전에 실패했습니다');
            }
          },
        },
      ]
    );
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'CHARGE':
        return { name: 'add-circle', color: '#2B5FE3' };
      case 'CONVERT':
        return { name: 'arrow-down-circle', color: '#F0344B' };
      case 'TRADE':
        return { name: 'swap-horizontal', color: '#00B368' };
      case 'DIVIDEND':
        return { name: 'gift', color: '#F59B00' };
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
    const icon = getTransactionIcon(item.type);
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
        <Text style={styles.headerTitle}>PO 지갑</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 잔액 카드 */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>보유 PO</Text>
        <Text style={styles.balanceAmount}>{formatNumber(balance)} PO</Text>
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
            <Ionicons name="arrow-down-circle" size={24} color="#2B5FE3" />
            <Text style={[styles.balanceButtonText, { color: '#2B5FE3' }]}>환전</Text>
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
          {/* 충전 상품 목록 */}
          <Text style={styles.sectionTitle}>충전 상품</Text>
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
              - 환전 시 5% 수수료가 부과됩니다
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
                    <Text style={[styles.chargeValue, { color: '#2B5FE3' }]}>
                      +{formatNumber(selectedProduct.bonus)} PO
                    </Text>
                  </View>
                )}
                <View style={[styles.chargeRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>결제 금액</Text>
                  <Text style={styles.totalValue}>
                    {formatNumber(selectedProduct.price)}원
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.paymentMethods}>
              <Text style={styles.paymentTitle}>결제 수단</Text>
              <TouchableOpacity style={styles.paymentOption}>
                <Ionicons name="card" size={24} color="#2B5FE3" />
                <Text style={styles.paymentText}>신용/체크카드</Text>
                <Ionicons name="checkmark-circle" size={24} color="#2B5FE3" />
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
                onPress={handleCharge}
              >
                <Text style={styles.confirmButtonText}>결제하기</Text>
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
              환전 수수료 5%가 적용됩니다
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
                  예상 입금액: {formatNumber(Math.floor(parseInt(convertAmount || 0) * 0.95))}원
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
                onPress={handleConvert}
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
  balanceCard: {
    backgroundColor: t.colors.primary,
    margin: 16,
    borderRadius: 16,
    padding: 24,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 28,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.surface,
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
    backgroundColor: t.colors.surface,
  },
  balanceButtonText: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.surface,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
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
    backgroundColor: t.colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    color: t.colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: t.colors.surface,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    marginBottom: 12,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productCard: {
    width: '48%',
    backgroundColor: t.colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  popularProduct: {
    borderColor: t.colors.primary,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: t.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  popularText: {
    fontSize: 11,
    fontFamily: t.fonts.semibold,
    color: t.colors.surface,
    fontWeight: '600',
  },
  productAmount: {
    fontSize: 20,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    marginBottom: 4,
  },
  bonusText: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    color: t.colors.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
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
    backgroundColor: t.colors.surface,
    borderRadius: 8,
    padding: 14,
    fontSize: 17,
    fontFamily: t.fonts.regular,
  },
  customButton: {
    backgroundColor: t.colors.primary,
    paddingHorizontal: 24,
    borderRadius: 8,
    justifyContent: 'center',
  },
  customButtonText: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    color: t.colors.surface,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    lineHeight: 20,
  },
  historyList: {
    padding: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
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
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
  },
  historyAmount: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
  },
  positive: {
    color: t.colors.primary,
  },
  negative: {
    color: t.colors.error,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textTertiary,
    marginTop: 16,
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
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
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
  chargePreview: {
    backgroundColor: t.colors.background,
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
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  chargeValue: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    color: t.colors.primary,
  },
  paymentMethods: {
    marginBottom: 20,
  },
  paymentTitle: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    marginBottom: 12,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.background,
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  paymentText: {
    flex: 1,
    fontSize: 15,
    fontFamily: t.fonts.regular,
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
    borderRadius: 8,
    padding: 14,
    fontSize: 17,
    fontFamily: t.fonts.regular,
  },
  convertPreview: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    color: t.colors.primary,
    marginTop: 8,
    fontWeight: '600',
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
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: t.colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    color: t.colors.surface,
    fontWeight: '600',
  },
});

export default POChargeScreen;
