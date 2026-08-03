import React, { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Platform,
  FlatList,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

const PRICE_ALERTS_KEY = '@price_alerts';

// 알림 타입
const ALERT_TYPES = {
  TARGET_PRICE: 'target_price', // 목표가 도달
  PRICE_DROP: 'price_drop', // 일정 비율 하락
  PRICE_RISE: 'price_rise', // 일정 비율 상승
  PERCENT_CHANGE: 'percent_change', // 변동률 알림
};

export default function PriceAlertScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [alerts, setAlerts] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // 저장된 알림 로드
      const savedAlerts = await AsyncStorage.getItem(PRICE_ALERTS_KEY);
      if (savedAlerts) {
        setAlerts(JSON.parse(savedAlerts));
      }

      // 보유 종목 로드
      const response = await api.get('/portfolio/my-holdings');
      if (response.data.success) {
        setHoldings(response.data.holdings || []);
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveAlerts = async (newAlerts) => {
    try {
      await AsyncStorage.setItem(PRICE_ALERTS_KEY, JSON.stringify(newAlerts));
      setAlerts(newAlerts);
    } catch (error) {
      console.error('알림 저장 실패:', error);
    }
  };

  const toggleAlert = (alertId) => {
    const newAlerts = alerts.map((alert) =>
      alert.id === alertId ? { ...alert, enabled: !alert.enabled } : alert
    );
    saveAlerts(newAlerts);
  };

  const deleteAlert = (alertId) => {
    if (Platform.OS === 'web') {
      if (window.confirm('이 알림을 삭제하시겠습니까?')) {
        const newAlerts = alerts.filter((alert) => alert.id !== alertId);
        saveAlerts(newAlerts);
      }
    } else {
      Alert.alert(
        '알림 삭제',
        '이 알림을 삭제하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => {
              const newAlerts = alerts.filter((alert) => alert.id !== alertId);
              saveAlerts(newAlerts);
            },
          },
        ]
      );
    }
  };

  const addAlert = (newAlert) => {
    const alert = {
      ...newAlert,
      id: Date.now().toString(),
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    saveAlerts([...alerts, alert]);
    setShowAddModal(false);
    setSelectedStock(null);
  };

  const renderAlertItem = ({ item }) => {
    const typeLabels = {
      [ALERT_TYPES.TARGET_PRICE]: '목표가',
      [ALERT_TYPES.PRICE_DROP]: '하락 알림',
      [ALERT_TYPES.PRICE_RISE]: '상승 알림',
      [ALERT_TYPES.PERCENT_CHANGE]: '변동률',
    };

    const typeColors = {
      [ALERT_TYPES.TARGET_PRICE]: '#2B5FE3',
      [ALERT_TYPES.PRICE_DROP]: '#F0344B',
      [ALERT_TYPES.PRICE_RISE]: '#00B368',
      [ALERT_TYPES.PERCENT_CHANGE]: '#F59B00',
    };

    return (
      <View style={[styles.alertItem, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.alertHeader}>
          <View style={styles.alertStockInfo}>
            <View style={[styles.stockAvatar, { backgroundColor: theme.colors.primaryBackground }]}>
              <Text style={[styles.stockAvatarText, { color: theme.colors.primary }]}>
                {(item.stockName || 'C').charAt(0)}
              </Text>
            </View>
            <View>
              <Text style={[styles.stockName, { color: theme.colors.textPrimary }]}>
                {item.stockName || '크리에이터'}
              </Text>
              <View style={[styles.typeBadge, { backgroundColor: typeColors[item.type] + '20' }]}>
                <Text style={[styles.typeBadgeText, { color: typeColors[item.type] }]}>
                  {typeLabels[item.type]}
                </Text>
              </View>
            </View>
          </View>
          <Switch
            value={item.enabled}
            onValueChange={() => toggleAlert(item.id)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
            thumbColor={item.enabled ? theme.colors.primary : theme.colors.gray300}
          />
        </View>

        <View style={[styles.alertDetails, { borderTopColor: theme.colors.border }]}>
          <View style={styles.alertCondition}>
            {item.type === ALERT_TYPES.TARGET_PRICE && (
              <>
                <Text style={[styles.conditionLabel, { color: theme.colors.textSecondary }]}>
                  목표 가격
                </Text>
                <Text style={[styles.conditionValue, { color: theme.colors.textPrimary }]}>
                  {item.targetPrice?.toLocaleString()} PO
                </Text>
              </>
            )}
            {item.type === ALERT_TYPES.PRICE_DROP && (
              <>
                <Text style={[styles.conditionLabel, { color: theme.colors.textSecondary }]}>
                  하락 기준
                </Text>
                <Text style={[styles.conditionValue, { color: '#F0344B' }]}>
                  -{item.percentage}%
                </Text>
              </>
            )}
            {item.type === ALERT_TYPES.PRICE_RISE && (
              <>
                <Text style={[styles.conditionLabel, { color: theme.colors.textSecondary }]}>
                  상승 기준
                </Text>
                <Text style={[styles.conditionValue, { color: '#00B368' }]}>
                  +{item.percentage}%
                </Text>
              </>
            )}
            {item.type === ALERT_TYPES.PERCENT_CHANGE && (
              <>
                <Text style={[styles.conditionLabel, { color: theme.colors.textSecondary }]}>
                  변동률 기준
                </Text>
                <Text style={[styles.conditionValue, { color: theme.colors.textPrimary }]}>
                  ±{item.percentage}%
                </Text>
              </>
            )}
          </View>

          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: '#F4433620' }]}
            onPress={() => deleteAlert(item.id)}
          >
            <Ionicons name="trash-outline" size={18} color="#F0344B" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={[theme.colors.primaryBackground, theme.colors.surface]}
        style={styles.emptyIcon}
      >
        <Ionicons name="notifications-outline" size={48} color={theme.colors.primary} />
      </LinearGradient>
      <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
        설정된 가격 알림이 없습니다
      </Text>
      <Text style={[styles.emptyDescription, { color: theme.colors.textSecondary }]}>
        관심 종목의 목표가나 변동률 알림을{'\n'}설정해보세요
      </Text>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.addButtonText}>알림 추가</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }, { backgroundColor: theme.colors.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>가격 알림</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addHeaderButton}>
          <Ionicons name="add" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 안내 문구 */}
      <View style={[styles.infoBox, { backgroundColor: theme.colors.primaryBackground }]}>
        <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
        <Text style={[styles.infoText, { color: theme.colors.primary }]}>
          목표가 도달이나 급등락 시 푸시 알림을 받을 수 있습니다.
        </Text>
      </View>

      {/* 알림 리스트 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.colors.textSecondary }}>로딩 중...</Text>
        </View>
      ) : alerts.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={renderAlertItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* 알림 추가 FAB */}
      {alerts.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* 알림 추가 모달 */}
      <AddAlertModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedStock(null);
        }}
        holdings={holdings}
        selectedStock={selectedStock}
        setSelectedStock={setSelectedStock}
        onAdd={addAlert}
        theme={theme}
      />
    </View>
  );
}

// 알림 추가 모달 컴포넌트
const AddAlertModal = ({
  visible,
  onClose,
  holdings,
  selectedStock,
  setSelectedStock,
  onAdd,
  theme,
}) => {
  const [step, setStep] = useState(1);
  const [alertType, setAlertType] = useState(null);
  const [targetPrice, setTargetPrice] = useState('');
  const [percentage, setPercentage] = useState('');

  useEffect(() => {
    if (!visible) {
      setStep(1);
      setAlertType(null);
      setTargetPrice('');
      setPercentage('');
    }
  }, [visible]);

  const handleSelectStock = (stock) => {
    setSelectedStock(stock);
    setStep(2);
  };

  const handleSelectType = (type) => {
    setAlertType(type);
    setStep(3);
  };

  const handleSubmit = () => {
    if (!selectedStock || !alertType) return;

    const alert = {
      stockId: selectedStock.stockId,
      stockName: selectedStock.stock?.issuer?.displayName || selectedStock.stock?.issuer?.username,
      type: alertType,
      currentPrice: selectedStock.stock?.sharePrice || 0,
    };

    if (alertType === ALERT_TYPES.TARGET_PRICE) {
      if (!targetPrice || isNaN(targetPrice)) {
        Alert.alert('오류', '올바른 목표가를 입력해주세요.');
        return;
      }
      alert.targetPrice = parseInt(targetPrice);
    } else {
      if (!percentage || isNaN(percentage) || parseInt(percentage) <= 0) {
        Alert.alert('오류', '올바른 비율을 입력해주세요.');
        return;
      }
      alert.percentage = parseInt(percentage);
    }

    onAdd(alert);
  };

  const alertTypeOptions = [
    {
      type: ALERT_TYPES.TARGET_PRICE,
      icon: 'flag',
      label: '목표가 도달',
      description: '설정한 가격에 도달하면 알림',
      color: '#2B5FE3',
    },
    {
      type: ALERT_TYPES.PRICE_RISE,
      icon: 'trending-up',
      label: '상승 알림',
      description: '현재가 대비 일정 비율 상승 시',
      color: '#00B368',
    },
    {
      type: ALERT_TYPES.PRICE_DROP,
      icon: 'trending-down',
      label: '하락 알림',
      description: '현재가 대비 일정 비율 하락 시',
      color: '#F0344B',
    },
    {
      type: ALERT_TYPES.PERCENT_CHANGE,
      icon: 'swap-vertical',
      label: '변동률 알림',
      description: '일정 비율 이상 변동 시',
      color: '#F59B00',
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay]}>
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
          {/* 모달 헤더 */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={step > 1 ? () => setStep(step - 1) : onClose}>
              <Ionicons
                name={step > 1 ? 'arrow-back' : 'close'}
                size={24}
                color={theme.colors.textPrimary}
              />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {step === 1 && '종목 선택'}
              {step === 2 && '알림 유형'}
              {step === 3 && '조건 설정'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Step 1: 종목 선택 */}
          {step === 1 && (
            <ScrollView style={styles.modalContent}>
              {holdings.length === 0 ? (
                <View style={styles.emptyHoldings}>
                  <Text style={[styles.emptyHoldingsText, { color: theme.colors.textSecondary }]}>
                    보유 중인 종목이 없습니다.{'\n'}
                    종목을 보유하면 알림을 설정할 수 있습니다.
                  </Text>
                </View>
              ) : (
                holdings.map((holding) => (
                  <TouchableOpacity
                    key={holding.id}
                    style={[styles.stockItem, { borderBottomColor: theme.colors.border }]}
                    onPress={() => handleSelectStock(holding)}
                  >
                    <View style={[styles.stockItemAvatar, { backgroundColor: theme.colors.primaryBackground }]}>
                      <Text style={[styles.stockItemAvatarText, { color: theme.colors.primary }]}>
                        {(holding.stock?.issuer?.displayName || 'C').charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.stockItemInfo}>
                      <Text style={[styles.stockItemName, { color: theme.colors.textPrimary }]}>
                        {holding.stock?.issuer?.displayName || holding.stock?.issuer?.username}
                      </Text>
                      <Text style={[styles.stockItemPrice, { color: theme.colors.textSecondary }]}>
                        현재가: {(holding.stock?.sharePrice || 0).toLocaleString()} PO
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}

          {/* Step 2: 알림 유형 선택 */}
          {step === 2 && (
            <ScrollView style={styles.modalContent}>
              {alertTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option.type}
                  style={[styles.typeOption, { borderBottomColor: theme.colors.border }]}
                  onPress={() => handleSelectType(option.type)}
                >
                  <View style={[styles.typeIcon, { backgroundColor: option.color + '20' }]}>
                    <Ionicons name={option.icon} size={24} color={option.color} />
                  </View>
                  <View style={styles.typeInfo}>
                    <Text style={[styles.typeLabel, { color: theme.colors.textPrimary }]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.typeDescription, { color: theme.colors.textSecondary }]}>
                      {option.description}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Step 3: 조건 설정 */}
          {step === 3 && (
            <View style={styles.modalContent}>
              {/* 선택된 종목 정보 */}
              <View style={[styles.selectedStockInfo, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.selectedStockName, { color: theme.colors.textPrimary }]}>
                  {selectedStock?.stock?.issuer?.displayName || selectedStock?.stock?.issuer?.username}
                </Text>
                <Text style={[styles.selectedStockPrice, { color: theme.colors.textSecondary }]}>
                  현재가: {(selectedStock?.stock?.sharePrice || 0).toLocaleString()} PO
                </Text>
              </View>

              {/* 조건 입력 */}
              {alertType === ALERT_TYPES.TARGET_PRICE ? (
                <View style={styles.inputSection}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    목표 가격 (PO)
                  </Text>
                  <TextInput
                    style={[styles.input, {
                      backgroundColor: theme.colors.background,
                      color: theme.colors.textPrimary,
                      borderColor: theme.colors.border,
                    }]}
                    placeholder="목표 가격 입력"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="numeric"
                    value={targetPrice}
                    onChangeText={setTargetPrice}
                  />
                  <View style={styles.quickValues}>
                    {[5, 10, 20, 50].map((percent) => {
                      const currentPrice = selectedStock?.stock?.sharePrice || 0;
                      const targetValue = Math.round(currentPrice * (1 + percent / 100));
                      return (
                        <TouchableOpacity
                          key={percent}
                          style={[styles.quickValueButton, { backgroundColor: theme.colors.background }]}
                          onPress={() => setTargetPrice(targetValue.toString())}
                        >
                          <Text style={[styles.quickValueText, { color: theme.colors.primary }]}>
                            +{percent}%
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <View style={styles.inputSection}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    {alertType === ALERT_TYPES.PRICE_RISE && '상승률 (%)'}
                    {alertType === ALERT_TYPES.PRICE_DROP && '하락률 (%)'}
                    {alertType === ALERT_TYPES.PERCENT_CHANGE && '변동률 (%)'}
                  </Text>
                  <TextInput
                    style={[styles.input, {
                      backgroundColor: theme.colors.background,
                      color: theme.colors.textPrimary,
                      borderColor: theme.colors.border,
                    }]}
                    placeholder="비율 입력"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="numeric"
                    value={percentage}
                    onChangeText={setPercentage}
                  />
                  <View style={styles.quickValues}>
                    {[3, 5, 10, 15, 20].map((value) => (
                      <TouchableOpacity
                        key={value}
                        style={[styles.quickValueButton, { backgroundColor: theme.colors.background }]}
                        onPress={() => setPercentage(value.toString())}
                      >
                        <Text style={[styles.quickValueText, { color: theme.colors.primary }]}>
                          {value}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* 확인 버튼 */}
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSubmit}
              >
                <Text style={styles.submitButtonText}>알림 설정</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addHeaderButton: {
    padding: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  alertItem: {
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  alertStockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stockAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockAvatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  stockName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  alertDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  alertCondition: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  conditionLabel: {
    fontSize: 13,
  },
  conditionValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  emptyHoldings: {
    padding: 40,
    alignItems: 'center',
  },
  emptyHoldingsText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  stockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  stockItemAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stockItemAvatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  stockItemInfo: {
    flex: 1,
  },
  stockItemName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  stockItemPrice: {
    fontSize: 13,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  typeInfo: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  typeDescription: {
    fontSize: 13,
  },
  selectedStockInfo: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  selectedStockName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedStockPrice: {
    fontSize: 14,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  quickValues: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickValueButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  quickValueText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 'auto',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
