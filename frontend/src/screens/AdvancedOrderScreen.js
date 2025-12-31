import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tradingAPI, stockAPI } from '../services/api';

const AdvancedOrderScreen = ({ navigation, route }) => {
  const { stockId, stockName, currentPrice } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('new'); // new, pending, history

  // Order form states
  const [orderType, setOrderType] = useState('BUY'); // BUY, SELL
  const [orderMode, setOrderMode] = useState('limit'); // limit, stop_loss, take_profit, stop_limit
  const [quantity, setQuantity] = useState('');
  const [limitPrice, setLimitPrice] = useState(currentPrice?.toString() || '');
  const [stopPrice, setStopPrice] = useState('');
  const [triggerCondition, setTriggerCondition] = useState('gte'); // gte, lte

  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [selectedOrderMode, setSelectedOrderMode] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const [pendingRes, historyRes] = await Promise.all([
        tradingAPI.getMyOrders('PENDING'),
        tradingAPI.getMyOrders('FILLED'),
      ]);
      setOrders([
        ...(pendingRes.data.orders || []),
        ...(historyRes.data.orders || []),
      ]);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

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

  const orderModes = [
    {
      id: 'limit',
      name: '지정가',
      icon: 'pricetag',
      color: '#3182F6',
      description: '원하는 가격에 주문을 체결합니다. 지정한 가격 이하(매수) 또는 이상(매도)이 되면 자동으로 체결됩니다.',
    },
    {
      id: 'stop_loss',
      name: '손절',
      icon: 'trending-down',
      color: '#F04452',
      description: '손실을 제한합니다. 가격이 설정한 손절가에 도달하면 자동으로 매도하여 추가 손실을 방지합니다.',
    },
    {
      id: 'take_profit',
      name: '익절',
      icon: 'trending-up',
      color: '#00C471',
      description: '수익을 실현합니다. 가격이 설정한 익절가에 도달하면 자동으로 매도하여 수익을 확정합니다.',
    },
    {
      id: 'stop_limit',
      name: '스탑리밋',
      icon: 'swap-horizontal',
      color: '#FFB800',
      description: '트리거 가격에 도달하면 지정가 주문이 활성화됩니다. 스탑 가격과 지정가를 별도로 설정할 수 있습니다.',
    },
  ];

  const handleSubmitOrder = async () => {
    if (!quantity || parseInt(quantity) <= 0) {
      Alert.alert('오류', '주문 수량을 입력해주세요');
      return;
    }

    if (!limitPrice || parseInt(limitPrice) <= 0) {
      Alert.alert('오류', '주문 가격을 입력해주세요');
      return;
    }

    if ((orderMode === 'stop_loss' || orderMode === 'take_profit' || orderMode === 'stop_limit') && !stopPrice) {
      Alert.alert('오류', '트리거 가격을 입력해주세요');
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        stockId,
        orderType,
        quantity: parseInt(quantity),
        limitPrice: parseInt(limitPrice),
      };

      if (orderMode === 'limit') {
        await tradingAPI.createLimitOrder(orderData);
      } else {
        await tradingAPI.createStopOrder({
          ...orderData,
          orderMode,
          stopPrice: parseInt(stopPrice),
          triggerCondition,
        });
      }

      Alert.alert('성공', '주문이 등록되었습니다', [
        {
          text: '확인',
          onPress: () => {
            setQuantity('');
            setLimitPrice(currentPrice?.toString() || '');
            setStopPrice('');
            fetchOrders();
            setActiveTab('pending');
          },
        },
      ]);
    } catch (error) {
      Alert.alert('오류', error.response?.data?.message || '주문 등록에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    Alert.alert(
      '주문 취소',
      '이 주문을 취소하시겠습니까?',
      [
        { text: '아니오', style: 'cancel' },
        {
          text: '취소하기',
          style: 'destructive',
          onPress: async () => {
            try {
              await tradingAPI.cancelOrder(orderId);
              Alert.alert('성공', '주문이 취소되었습니다');
              fetchOrders();
            } catch (error) {
              Alert.alert('오류', error.response?.data?.message || '주문 취소에 실패했습니다');
            }
          },
        },
      ]
    );
  };

  const showOrderModeInfo = (mode) => {
    setSelectedOrderMode(mode);
    setInfoModalVisible(true);
  };

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: { label: '대기', color: '#FFB800', bg: '#FFF5E0' },
      PARTIAL: { label: '부분체결', color: '#3182F6', bg: '#E8F3FF' },
      FILLED: { label: '체결', color: '#00C471', bg: '#E0FFF0' },
      CANCELLED: { label: '취소', color: '#999', bg: '#F5F5F5' },
    };
    return badges[status] || badges.PENDING;
  };

  const renderOrderItem = ({ item }) => {
    const badge = getStatusBadge(item.status);
    const modeInfo = orderModes.find(m => m.id === item.orderMode) || orderModes[0];

    return (
      <View style={styles.orderItem}>
        <View style={styles.orderHeader}>
          <View style={styles.orderModeTag}>
            <Ionicons name={modeInfo.icon} size={14} color={modeInfo.color} />
            <Text style={[styles.orderModeText, { color: modeInfo.color }]}>
              {modeInfo.name}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.orderBody}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderStock}>{item.stock?.name || item.targetUser?.username}</Text>
            <Text style={[
              styles.orderTypeText,
              item.orderType === 'BUY' ? styles.buyText : styles.sellText,
            ]}>
              {item.orderType === 'BUY' ? '매수' : '매도'}
            </Text>
          </View>

          <View style={styles.orderDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>수량</Text>
              <Text style={styles.detailValue}>{formatNumber(item.quantity)}주</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>지정가</Text>
              <Text style={styles.detailValue}>{formatNumber(item.limitPrice)} PO</Text>
            </View>
            {item.stopPrice && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>트리거</Text>
                <Text style={styles.detailValue}>{formatNumber(item.stopPrice)} PO</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.orderFooter}>
          <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          {item.status === 'PENDING' && (
            <TouchableOpacity
              style={styles.cancelOrderButton}
              onPress={() => handleCancelOrder(item.id)}
            >
              <Text style={styles.cancelOrderText}>취소</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>고급 주문</Text>
        <TouchableOpacity onPress={() => showOrderModeInfo(orderModes[0])}>
          <Ionicons name="help-circle-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* 탭 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'new' && styles.activeTab]}
          onPress={() => setActiveTab('new')}
        >
          <Text style={[styles.tabText, activeTab === 'new' && styles.activeTabText]}>
            새 주문
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            대기중
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            체결내역
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'new' ? (
        <ScrollView contentContainerStyle={styles.content}>
          {/* 종목 정보 */}
          {stockName && (
            <View style={styles.stockInfo}>
              <Text style={styles.stockName}>{stockName}</Text>
              <Text style={styles.currentPriceLabel}>
                현재가: <Text style={styles.currentPriceValue}>{formatNumber(currentPrice)} PO</Text>
              </Text>
            </View>
          )}

          {/* 매수/매도 선택 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>주문 유형</Text>
            <View style={styles.orderTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.orderTypeButton,
                  orderType === 'BUY' && styles.buyButton,
                ]}
                onPress={() => setOrderType('BUY')}
              >
                <Text style={[
                  styles.orderTypeButtonText,
                  orderType === 'BUY' && styles.buyButtonText,
                ]}>
                  매수
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.orderTypeButton,
                  orderType === 'SELL' && styles.sellButton,
                ]}
                onPress={() => setOrderType('SELL')}
              >
                <Text style={[
                  styles.orderTypeButtonText,
                  orderType === 'SELL' && styles.sellButtonText,
                ]}>
                  매도
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 주문 방식 선택 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>주문 방식</Text>
            <View style={styles.modeGrid}>
              {orderModes.map((mode) => (
                <TouchableOpacity
                  key={mode.id}
                  style={[
                    styles.modeCard,
                    orderMode === mode.id && { borderColor: mode.color },
                  ]}
                  onPress={() => setOrderMode(mode.id)}
                  onLongPress={() => showOrderModeInfo(mode)}
                >
                  <View style={[styles.modeIcon, { backgroundColor: mode.color + '20' }]}>
                    <Ionicons name={mode.icon} size={24} color={mode.color} />
                  </View>
                  <Text style={styles.modeName}>{mode.name}</Text>
                  {orderMode === mode.id && (
                    <Ionicons name="checkmark-circle" size={20} color={mode.color} style={styles.modeCheck} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 주문 수량 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>주문 수량</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="수량 입력"
                keyboardType="number-pad"
              />
              <Text style={styles.inputSuffix}>주</Text>
            </View>
          </View>

          {/* 지정 가격 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {orderMode === 'limit' ? '지정가' : '체결 가격'}
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={limitPrice}
                onChangeText={setLimitPrice}
                placeholder="가격 입력"
                keyboardType="number-pad"
              />
              <Text style={styles.inputSuffix}>PO</Text>
            </View>
            <View style={styles.priceButtons}>
              {[-5, -1, 0, 1, 5].map((percent) => (
                <TouchableOpacity
                  key={percent}
                  style={styles.priceButton}
                  onPress={() => {
                    const newPrice = Math.floor(currentPrice * (1 + percent / 100));
                    setLimitPrice(newPrice.toString());
                  }}
                >
                  <Text style={styles.priceButtonText}>
                    {percent === 0 ? '현재가' : `${percent > 0 ? '+' : ''}${percent}%`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 트리거 가격 (손절/익절/스탑리밋) */}
          {(orderMode === 'stop_loss' || orderMode === 'take_profit' || orderMode === 'stop_limit') && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>트리거 가격</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={stopPrice}
                  onChangeText={setStopPrice}
                  placeholder="트리거 가격 입력"
                  keyboardType="number-pad"
                />
                <Text style={styles.inputSuffix}>PO</Text>
              </View>

              <View style={styles.conditionButtons}>
                <TouchableOpacity
                  style={[
                    styles.conditionButton,
                    triggerCondition === 'gte' && styles.activeCondition,
                  ]}
                  onPress={() => setTriggerCondition('gte')}
                >
                  <Ionicons
                    name="arrow-up"
                    size={16}
                    color={triggerCondition === 'gte' ? '#fff' : '#666'}
                  />
                  <Text style={[
                    styles.conditionText,
                    triggerCondition === 'gte' && styles.activeConditionText,
                  ]}>
                    이상이면 실행
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.conditionButton,
                    triggerCondition === 'lte' && styles.activeCondition,
                  ]}
                  onPress={() => setTriggerCondition('lte')}
                >
                  <Ionicons
                    name="arrow-down"
                    size={16}
                    color={triggerCondition === 'lte' ? '#fff' : '#666'}
                  />
                  <Text style={[
                    styles.conditionText,
                    triggerCondition === 'lte' && styles.activeConditionText,
                  ]}>
                    이하면 실행
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 주문 요약 */}
          {quantity && limitPrice && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>주문 요약</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>예상 체결 금액</Text>
                <Text style={styles.summaryValue}>
                  {formatNumber(parseInt(quantity || 0) * parseInt(limitPrice || 0))} PO
                </Text>
              </View>
            </View>
          )}

          {/* 주문 버튼 */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              orderType === 'BUY' ? styles.buySubmitButton : styles.sellSubmitButton,
              loading && styles.disabledButton,
            ]}
            onPress={handleSubmitOrder}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {orderType === 'BUY' ? '매수' : '매도'} 주문
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={orders.filter((o) =>
            activeTab === 'pending'
              ? o.status === 'PENDING' || o.status === 'PARTIAL'
              : o.status === 'FILLED' || o.status === 'CANCELLED'
          )}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.orderList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#ddd" />
              <Text style={styles.emptyText}>
                {activeTab === 'pending' ? '대기 중인 주문이 없습니다' : '체결 내역이 없습니다'}
              </Text>
            </View>
          }
        />
      )}

      {/* 주문 방식 설명 모달 */}
      <Modal visible={infoModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setInfoModalVisible(false)}
        >
          <View style={styles.infoModalContent}>
            {selectedOrderMode && (
              <>
                <View style={[styles.infoModalIcon, { backgroundColor: selectedOrderMode.color + '20' }]}>
                  <Ionicons name={selectedOrderMode.icon} size={32} color={selectedOrderMode.color} />
                </View>
                <Text style={styles.infoModalTitle}>{selectedOrderMode.name} 주문</Text>
                <Text style={styles.infoModalDesc}>{selectedOrderMode.description}</Text>
              </>
            )}
            <TouchableOpacity
              style={styles.infoModalButton}
              onPress={() => setInfoModalVisible(false)}
            >
              <Text style={styles.infoModalButtonText}>확인</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3182F6',
  },
  tabText: {
    fontSize: 15,
    color: '#999',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#3182F6',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  stockInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  stockName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  currentPriceLabel: {
    fontSize: 14,
    color: '#666',
  },
  currentPriceValue: {
    fontWeight: '600',
    color: '#000',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  orderTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  orderTypeButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  buyButton: {
    backgroundColor: '#F04452',
  },
  sellButton: {
    backgroundColor: '#1261C4',
  },
  orderTypeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  buyButtonText: {
    color: '#fff',
  },
  sellButtonText: {
    color: '#fff',
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modeCard: {
    width: '47%',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modeName: {
    fontSize: 14,
    fontWeight: '600',
  },
  modeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 14,
    fontSize: 18,
    fontWeight: '600',
  },
  inputSuffix: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  priceButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  priceButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  priceButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  conditionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  conditionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  activeCondition: {
    backgroundColor: '#3182F6',
  },
  conditionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  activeConditionText: {
    color: '#fff',
  },
  summaryCard: {
    backgroundColor: '#E8F3FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 14,
    color: '#3182F6',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3182F6',
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buySubmitButton: {
    backgroundColor: '#F04452',
  },
  sellSubmitButton: {
    backgroundColor: '#1261C4',
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  orderList: {
    padding: 16,
  },
  orderItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderModeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderModeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderBody: {},
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  orderStock: {
    fontSize: 16,
    fontWeight: '600',
  },
  orderTypeText: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  buyText: {
    backgroundColor: '#FFF0F1',
    color: '#F04452',
  },
  sellText: {
    backgroundColor: '#E8F3FF',
    color: '#1261C4',
  },
  orderDetails: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
  },
  cancelOrderButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelOrderText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  infoModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  infoModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  infoModalDesc: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  infoModalButton: {
    backgroundColor: '#3182F6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  infoModalButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default AdvancedOrderScreen;
