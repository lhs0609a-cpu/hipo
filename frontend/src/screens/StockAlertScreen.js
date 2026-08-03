import React, { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { COLORS } from '../constants/colors';
import api from '../api/client';

export default function StockAlertScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [selectedTab, setSelectedTab] = useState('alerts'); // alerts, watchlist
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [alertType, setAlertType] = useState('price_above'); // price_above, price_below, price_change
  const [targetValue, setTargetValue] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedTab]);

  const loadData = async () => {
    try {
      setLoading(true);

      if (selectedTab === 'alerts') {
        const response = await api.get('/stock-alerts');
        if (response.data.success) {
          setAlerts(response.data.alerts || []);
        }
      } else {
        const response = await api.get('/stock-alerts/watchlist');
        if (response.data.success) {
          setWatchlist(response.data.watchlist || []);
        }
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchStocks = async (query) => {
    if (!query) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await api.get('/search', {
        params: { q: query, type: 'users' }
      });
      if (response.data.success) {
        setSearchResults(response.data.results || []);
      }
    } catch (error) {
      console.error('검색 오류:', error);
    }
  };

  const createAlert = async () => {
    if (!selectedStock || !targetValue) {
      if (Platform.OS === 'web') {
        window.alert('크리에이터와 목표가를 입력해주세요');
      } else {
        Alert.alert('알림', '크리에이터와 목표가를 입력해주세요');
      }
      return;
    }

    try {
      const response = await api.post('/stock-alerts', {
        stockId: selectedStock.stockId,
        alertType,
        targetValue: parseFloat(targetValue),
      });

      if (response.data.success) {
        if (Platform.OS === 'web') {
          window.alert('알림이 생성되었습니다');
        } else {
          Alert.alert('성공', '알림이 생성되었습니다');
        }
        setShowCreateModal(false);
        resetForm();
        loadData();
      }
    } catch (error) {
      console.error('알림 생성 오류:', error);
      if (Platform.OS === 'web') {
        window.alert('알림 생성에 실패했습니다');
      } else {
        Alert.alert('오류', '알림 생성에 실패했습니다');
      }
    }
  };

  const deleteAlert = async (alertId) => {
    try {
      await api.delete(`/stock-alerts/${alertId}`);
      loadData();
    } catch (error) {
      console.error('알림 삭제 오류:', error);
    }
  };

  const addToWatchlist = async (stock) => {
    try {
      await api.post('/stock-alerts/watchlist', {
        stockId: stock.stockId,
      });
      if (Platform.OS === 'web') {
        window.alert('워치리스트에 추가되었습니다');
      } else {
        Alert.alert('성공', '워치리스트에 추가되었습니다');
      }
      loadData();
    } catch (error) {
      console.error('워치리스트 추가 오류:', error);
    }
  };

  const removeFromWatchlist = async (stockId) => {
    try {
      await api.delete(`/stock-alerts/watchlist/${stockId}`);
      loadData();
    } catch (error) {
      console.error('워치리스트 삭제 오류:', error);
    }
  };

  const resetForm = () => {
    setSelectedStock(null);
    setAlertType('price_above');
    setTargetValue('');
    setSearchQuery('');
    setSearchResults([]);
  };

  const getAlertTypeText = (type) => {
    switch (type) {
      case 'price_above': return '목표가 상승';
      case 'price_below': return '목표가 하락';
      case 'price_change': return '가격 변동';
      default: return type;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>크리에이터 알림</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.addButton}>
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* 탭 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'alerts' && styles.tabActive]}
          onPress={() => setSelectedTab('alerts')}
        >
          <Text style={[styles.tabText, selectedTab === 'alerts' && styles.tabTextActive]}>
            알림 ({alerts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'watchlist' && styles.tabActive]}
          onPress={() => setSelectedTab('watchlist')}
        >
          <Text style={[styles.tabText, selectedTab === 'watchlist' && styles.tabTextActive]}>
            워치리스트 ({watchlist.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {selectedTab === 'alerts' ? (
          alerts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyText}>설정된 알림이 없습니다</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => setShowCreateModal(true)}>
                <Text style={styles.emptyButtonText}>알림 추가하기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            alerts.map((alert) => (
              <View key={alert.id} style={styles.alertItem}>
                <View style={styles.alertInfo}>
                  <Text style={styles.alertStock}>{alert.stock?.user?.username || '알 수 없음'}</Text>
                  <Text style={styles.alertType}>{getAlertTypeText(alert.alertType)}</Text>
                  <Text style={styles.alertTarget}>
                    목표: {alert.targetValue?.toLocaleString()} PO
                  </Text>
                  <Text style={styles.alertStatus}>
                    {alert.isActive ? '🟢 활성' : '⚫ 비활성'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteAlert(alert.id)}
                >
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))
          )
        ) : (
          watchlist.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>⭐</Text>
              <Text style={styles.emptyText}>워치리스트가 비어있습니다</Text>
            </View>
          ) : (
            watchlist.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.watchlistItem}
                onPress={() => navigation.navigate('StockDetail', { stockId: item.stockId })}
              >
                <View style={styles.watchlistInfo}>
                  <Text style={styles.watchlistStock}>{item.stock?.user?.username || '알 수 없음'}</Text>
                  <Text style={styles.watchlistPrice}>
                    {item.stock?.sharePrice?.toLocaleString() || 0} PO
                  </Text>
                  {item.note && <Text style={styles.watchlistNote}>{item.note}</Text>}
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removeFromWatchlist(item.stockId)}
                >
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )
        )}
      </ScrollView>

      {/* 알림 생성 모달 */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>알림 추가</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* 크리에이터 검색 */}
              <Text style={styles.label}>크리에이터 선택</Text>
              <TextInput
                style={styles.input}
                placeholder="크리에이터 이름 검색..."
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  searchStocks(text);
                }}
              />

              {searchResults.length > 0 && (
                <View style={styles.searchResults}>
                  {searchResults.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      style={styles.searchResultItem}
                      onPress={() => {
                        setSelectedStock({ stockId: user.stockId, username: user.username });
                        setSearchQuery(user.username);
                        setSearchResults([]);
                      }}
                    >
                      <Text style={styles.searchResultText}>{user.username}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* 알림 타입 */}
              <Text style={styles.label}>알림 타입</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[styles.typeButton, alertType === 'price_above' && styles.typeButtonActive]}
                  onPress={() => setAlertType('price_above')}
                >
                  <Text style={[styles.typeButtonText, alertType === 'price_above' && styles.typeButtonTextActive]}>
                    가격 상승
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, alertType === 'price_below' && styles.typeButtonActive]}
                  onPress={() => setAlertType('price_below')}
                >
                  <Text style={[styles.typeButtonText, alertType === 'price_below' && styles.typeButtonTextActive]}>
                    가격 하락
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, alertType === 'price_change' && styles.typeButtonActive]}
                  onPress={() => setAlertType('price_change')}
                >
                  <Text style={[styles.typeButtonText, alertType === 'price_change' && styles.typeButtonTextActive]}>
                    가격 변동
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 목표가 */}
              <Text style={styles.label}>목표가 (PO)</Text>
              <TextInput
                style={styles.input}
                placeholder="목표가 입력..."
                value={targetValue}
                onChangeText={setTargetValue}
                keyboardType="numeric"
              />

              {/* 버튼 */}
              <TouchableOpacity style={styles.createButton} onPress={createAlert}>
                <Text style={styles.createButtonText}>알림 생성</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: t.colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: t.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: t.colors.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: t.colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
    fontSize: 28,
    color: t.colors.primary,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: t.colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: t.colors.textSecondary,
  },
  tabTextActive: {
    color: t.colors.primary,
  },
  content: {
    flex: 1,
  },
  alertItem: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    padding: 16,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  alertInfo: {
    flex: 1,
  },
  alertStock: {
    fontSize: 16,
    fontWeight: '600',
    color: t.colors.text,
    marginBottom: 4,
  },
  alertType: {
    fontSize: 13,
    color: t.colors.textSecondary,
    marginBottom: 4,
  },
  alertTarget: {
    fontSize: 14,
    fontWeight: '600',
    color: t.colors.primary,
    marginBottom: 4,
  },
  alertStatus: {
    fontSize: 12,
    color: t.colors.textSecondary,
  },
  watchlistItem: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    padding: 16,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  watchlistInfo: {
    flex: 1,
  },
  watchlistStock: {
    fontSize: 16,
    fontWeight: '600',
    color: t.colors.text,
    marginBottom: 4,
  },
  watchlistPrice: {
    fontSize: 14,
    color: t.colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  watchlistNote: {
    fontSize: 13,
    color: t.colors.textSecondary,
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  deleteIcon: {
    fontSize: 20,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: t.colors.textSecondary,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: t.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: t.colors.surface,
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: t.colors.text,
  },
  modalClose: {
    fontSize: 24,
    color: t.colors.textSecondary,
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: t.colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: t.colors.background,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: t.colors.text,
  },
  searchResults: {
    backgroundColor: t.colors.background,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 8,
    marginTop: 8,
    maxHeight: 150,
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  searchResultText: {
    fontSize: 14,
    color: t.colors.text,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: t.colors.border,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: t.colors.primary,
    borderColor: t.colors.primary,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: t.colors.textSecondary,
  },
  typeButtonTextActive: {
    color: t.colors.surface,
  },
  createButton: {
    backgroundColor: t.colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: t.colors.surface,
  },
});
