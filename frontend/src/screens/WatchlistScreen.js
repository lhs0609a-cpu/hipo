import React, { useState, useEffect, useCallback } from 'react';
import useThemedStyles from '../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { watchlistAPI } from '../services/api';

const WatchlistScreen = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [alertPrice, setAlertPrice] = useState('');
  const [alertCondition, setAlertCondition] = useState('gte');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [watchlistRes, categoriesRes] = await Promise.all([
        watchlistAPI.getAll(),
        watchlistAPI.getCategories(),
      ]);
      setWatchlist(watchlistRes.data.watchlist || []);
      setCategories(categoriesRes.data.categories || []);
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleRemove = async (stockId) => {
    Alert.alert(
      '관심종목 삭제',
      '이 종목을 관심종목에서 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await watchlistAPI.remove(stockId);
              setWatchlist(prev => prev.filter(item => item.stockId !== stockId));
            } catch (error) {
              Alert.alert('오류', '삭제에 실패했습니다');
            }
          },
        },
      ]
    );
  };

  const handleSetAlert = async () => {
    if (!alertPrice) {
      Alert.alert('오류', '알림 가격을 입력해주세요');
      return;
    }

    try {
      await watchlistAPI.setAlert(selectedStock.stockId, parseInt(alertPrice), alertCondition);
      Alert.alert('성공', '가격 알림이 설정되었습니다');
      setAlertModalVisible(false);
      fetchData();
    } catch (error) {
      Alert.alert('오류', '알림 설정에 실패했습니다');
    }
  };

  const openAlertModal = (item) => {
    setSelectedStock(item);
    setAlertPrice(item.priceAlert?.toString() || item.sharePrice?.toString() || '');
    setAlertCondition(item.alertCondition || 'gte');
    setAlertModalVisible(true);
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    return num.toLocaleString();
  };

  const formatPercent = (num) => {
    if (!num) return '0%';
    const prefix = num >= 0 ? '+' : '';
    return `${prefix}${parseFloat(num).toFixed(2)}%`;
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        activeCategory === item.id && styles.activeCategoryChip,
      ]}
      onPress={() => setActiveCategory(item.id)}
    >
      <Text style={styles.categoryIcon}>{item.icon}</Text>
      <Text style={[
        styles.categoryText,
        activeCategory === item.id && styles.activeCategoryText,
      ]}>
        {item.name}
      </Text>
      <Text style={styles.categoryCount}>{item.stockCount}</Text>
    </TouchableOpacity>
  );

  const renderWatchlistItem = ({ item }) => (
    <TouchableOpacity
      style={styles.watchlistItem}
      onPress={() => navigation.navigate('StockDetail', { stockId: item.stockId })}
    >
      <View style={styles.itemLeft}>
        <View style={styles.creatorInfo}>
          <Text style={styles.creatorName}>{item.creator?.username}</Text>
          <Text style={styles.addedDate}>
            추가 시점: {formatNumber(item.addedPrice)} PO
          </Text>
        </View>
      </View>

      <View style={styles.itemCenter}>
        <Text style={styles.currentPrice}>{formatNumber(item.sharePrice)} PO</Text>
        <Text style={[
          styles.priceChange,
          item.priceChange >= 0 ? styles.priceUp : styles.priceDown,
        ]}>
          {formatPercent(item.priceChange)}
        </Text>
      </View>

      <View style={styles.itemRight}>
        <Text style={[
          styles.profit,
          parseFloat(item.currentProfitPercent) >= 0 ? styles.priceUp : styles.priceDown,
        ]}>
          {formatPercent(item.currentProfitPercent)}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openAlertModal(item)}
          >
            <Ionicons
              name={item.priceAlert ? 'notifications' : 'notifications-outline'}
              size={20}
              color={item.priceAlert ? '#2B5FE3' : '#999'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRemove(item.stockId)}
          >
            <Ionicons name="close" size={20} color="#999" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
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
        <Text style={styles.headerTitle}>관심종목</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Search')}>
          <Ionicons name="add" size={24} color="#2B5FE3" />
        </TouchableOpacity>
      </View>

      {/* 카테고리 필터 */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ id: 'all', name: '전체', icon: '📋', stockCount: watchlist.length }, ...categories]}
        renderItem={renderCategoryItem}
        keyExtractor={item => item.id}
        style={styles.categoryList}
        contentContainerStyle={styles.categoryListContent}
      />

      {/* 관심종목 목록 */}
      <FlatList
        data={watchlist}
        renderItem={renderWatchlistItem}
        keyExtractor={item => item.stockId}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="star-outline" size={64} color="#ddd" />
            <Text style={styles.emptyText}>관심종목이 없습니다</Text>
            <Text style={styles.emptySubtext}>
              주식 상세 페이지에서 관심종목을 추가해보세요
            </Text>
          </View>
        }
      />

      {/* 알림 설정 모달 */}
      <Modal visible={alertModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>가격 알림 설정</Text>
            <Text style={styles.modalDesc}>
              {selectedStock?.creator?.username}
            </Text>
            <Text style={styles.currentPriceInfo}>
              현재가: {formatNumber(selectedStock?.sharePrice)} PO
            </Text>

            <View style={styles.conditionButtons}>
              <TouchableOpacity
                style={[
                  styles.conditionButton,
                  alertCondition === 'gte' && styles.activeConditionButton,
                ]}
                onPress={() => setAlertCondition('gte')}
              >
                <Ionicons name="arrow-up" size={20} color={alertCondition === 'gte' ? '#fff' : '#666'} />
                <Text style={[
                  styles.conditionText,
                  alertCondition === 'gte' && styles.activeConditionText,
                ]}>
                  이상
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.conditionButton,
                  alertCondition === 'lte' && styles.activeConditionButton,
                ]}
                onPress={() => setAlertCondition('lte')}
              >
                <Ionicons name="arrow-down" size={20} color={alertCondition === 'lte' ? '#fff' : '#666'} />
                <Text style={[
                  styles.conditionText,
                  alertCondition === 'lte' && styles.activeConditionText,
                ]}>
                  이하
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.priceInput}
              value={alertPrice}
              onChangeText={setAlertPrice}
              placeholder="알림 받을 가격"
              keyboardType="number-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setAlertModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleSetAlert}
              >
                <Text style={styles.confirmButtonText}>설정</Text>
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
  categoryList: {
    backgroundColor: '#fff',
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryListContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.backgroundSecondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  activeCategoryChip: {
    backgroundColor: t.colors.primary,
  },
  categoryIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    marginRight: 6,
  },
  activeCategoryText: {
    color: '#fff',
    fontWeight: '600',
  },
  categoryCount: {
    fontSize: 12,
    color: '#999',
  },
  listContent: {
    padding: 16,
  },
  watchlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  itemLeft: {
    flex: 1,
  },
  creatorInfo: {},
  creatorName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  addedDate: {
    fontSize: 12,
    color: '#999',
  },
  itemCenter: {
    alignItems: 'flex-end',
    marginRight: 16,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  priceChange: {
    fontSize: 13,
  },
  priceUp: {
    color: t.colors.error,
  },
  priceDown: {
    color: t.colors.primaryDark,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  profit: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
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
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  currentPriceInfo: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  conditionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  conditionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.backgroundSecondary,
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  activeConditionButton: {
    backgroundColor: t.colors.primary,
  },
  conditionText: {
    fontSize: 16,
    color: '#666',
  },
  activeConditionText: {
    color: '#fff',
    fontWeight: '600',
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
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

export default WatchlistScreen;
