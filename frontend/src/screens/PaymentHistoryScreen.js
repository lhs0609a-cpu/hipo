import React, { useState, useEffect } from 'react';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import api from '../api/client';

const PaymentHistoryScreen = () => {
  const styles = useThemedStyles(makeStyles);
  const [tab, setTab] = useState('payments'); // 'payments' | 'transactions'
  const [payments, setPayments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [tab]);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (tab === 'payments') {
        const response = await api.get('/payment/my-payments');
        if (response.data.success) {
          setPayments(response.data.payments);
        }
      } else {
        const response = await api.get('/payment/my-wallet-transactions');
        if (response.data.success) {
          setTransactions(response.data.transactions);
        }
      }
    } catch (error) {
      console.error('내역 조회 실패:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { text: '대기중', color: '#F59B00', bgColor: '#FFF6E6' },
      COMPLETED: { text: '완료', color: '#00B368', bgColor: '#E7F8F0' },
      FAILED: { text: '실패', color: '#F0344B', bgColor: '#FFF1F2' },
      CANCELLED: { text: '취소', color: '#7C8698', bgColor: '#F8F9FB' },
      REFUNDED: { text: '환불', color: '#5E93F7', bgColor: '#F2EEFE' }
    };

    const config = statusConfig[status] || statusConfig.PENDING;

    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
        <Text style={[styles.statusText, { color: config.color }]}>{config.text}</Text>
      </View>
    );
  };

  const getPaymentMethodIcon = (method) => {
    const icons = {
      CARD: '💳',
      TRANSFER: '🏦',
      TOSS: '💙',
      NAVERPAY: '💚',
      KAKAOPAY: '💛',
      PAYCO: '🔴',
      SAMSUNGPAY: '📱',
      OTHER: '💰'
    };
    return icons[method] || icons.OTHER;
  };

  const getTransactionTypeConfig = (type) => {
    const config = {
      CHARGE: { icon: '⬆️', text: '충전', color: '#00B368' },
      USE: { icon: '⬇️', text: '사용', color: '#F0344B' },
      REFUND: { icon: '↩️', text: '환불', color: '#5E93F7' },
      BONUS: { icon: '🎁', text: '보너스', color: '#F59B00' },
      ADMIN_ADJUSTMENT: { icon: '⚙️', text: '조정', color: '#7C8698' }
    };
    return config[type] || config.USE;
  };

  const renderPaymentItem = ({ item }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemTitleRow}>
          <Text style={styles.itemIcon}>{getPaymentMethodIcon(item.paymentMethod)}</Text>
          <View style={styles.itemTitleContainer}>
            <Text style={styles.itemTitle}>포인트 충전</Text>
            <Text style={styles.itemDate}>
              {new Date(item.requestedAt).toLocaleString('ko-KR')}
            </Text>
          </View>
        </View>
        {getStatusBadge(item.status)}
      </View>

      <View style={styles.itemDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>충전 금액</Text>
          <Text style={styles.detailValue}>{item.amount.toLocaleString()}원</Text>
        </View>

        {item.bonusAmount > 0 && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>보너스</Text>
            <Text style={styles.detailBonus}>+{item.bonusAmount.toLocaleString()}원</Text>
          </View>
        )}

        <View style={[styles.detailRow, styles.detailRowTotal]}>
          <Text style={styles.detailLabelTotal}>받은 금액</Text>
          <Text style={styles.detailValueTotal}>{item.totalAmount.toLocaleString()}원</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>주문번호</Text>
          <Text style={styles.detailOrderId}>{item.orderId}</Text>
        </View>
      </View>
    </View>
  );

  const renderTransactionItem = ({ item }) => {
    const typeConfig = getTransactionTypeConfig(item.type);
    const isPositive = ['CHARGE', 'REFUND', 'BONUS'].includes(item.type);

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionTitleRow}>
            <Text style={styles.transactionIcon}>{typeConfig.icon}</Text>
            <View style={styles.transactionTitleContainer}>
              <Text style={styles.transactionTitle}>{item.description}</Text>
              <Text style={styles.transactionDate}>
                {new Date(item.createdAt).toLocaleString('ko-KR')}
              </Text>
            </View>
          </View>
          <Text style={[
            styles.transactionAmount,
            { color: isPositive ? '#00B368' : '#F0344B' }
          ]}>
            {isPositive ? '+' : ''}{item.amount.toLocaleString()}원
          </Text>
        </View>

        <View style={styles.transactionBalance}>
          <Text style={styles.balanceLabel}>잔액</Text>
          <Text style={styles.balanceValue}>
            {item.balanceBefore.toLocaleString()}원 → {item.balanceAfter.toLocaleString()}원
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyText}>
        {tab === 'payments' ? '결제 내역이 없습니다' : '거래 내역이 없습니다'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 탭 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, tab === 'payments' && styles.tabActive]}
          onPress={() => setTab('payments')}
        >
          <Text style={[styles.tabText, tab === 'payments' && styles.tabTextActive]}>
            결제 내역
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'transactions' && styles.tabActive]}
          onPress={() => setTab('transactions')}
        >
          <Text style={[styles.tabText, tab === 'transactions' && styles.tabTextActive]}>
            거래 내역
          </Text>
        </TouchableOpacity>
      </View>

      {/* 리스트 */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B5FE3" />
        </View>
      ) : (
        <FlatList
          data={tab === 'payments' ? payments : transactions}
          renderItem={tab === 'payments' ? renderPaymentItem : renderTransactionItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmptyList}
        />
      )}
    </View>
  );
};

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.background
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabActive: {
    borderBottomColor: t.colors.primary
  },
  tabText: {
    fontSize: 15,
    color: t.colors.textTertiary,
    fontWeight: '500'
  },
  tabTextActive: {
    color: t.colors.primary,
    fontWeight: 'bold'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  listContent: {
    padding: 16,
    paddingBottom: 32
  },
  itemCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  itemTitleRow: {
    flexDirection: 'row',
    flex: 1
  },
  itemIcon: {
    fontSize: 24,
    marginRight: 12
  },
  itemTitleContainer: {
    flex: 1
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  itemDate: {
    fontSize: 12,
    color: t.colors.textTertiary
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  itemDetails: {
    borderTopWidth: 1,
    borderTopColor: t.colors.backgroundSecondary,
    paddingTop: 12
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  detailLabel: {
    fontSize: 14,
    color: '#666'
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  detailBonus: {
    fontSize: 14,
    fontWeight: 'bold',
    color: t.colors.warning
  },
  detailRowTotal: {
    marginTop: 4,
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: t.colors.backgroundSecondary
  },
  detailLabelTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333'
  },
  detailValueTotal: {
    fontSize: 17,
    fontWeight: 'bold',
    color: t.colors.primary
  },
  detailOrderId: {
    fontSize: 12,
    color: t.colors.textTertiary,
    fontFamily: 'monospace'
  },
  transactionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  transactionTitleRow: {
    flexDirection: 'row',
    flex: 1
  },
  transactionIcon: {
    fontSize: 20,
    marginRight: 12
  },
  transactionTitleContainer: {
    flex: 1
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  transactionDate: {
    fontSize: 12,
    color: t.colors.textTertiary
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  transactionBalance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: t.colors.backgroundSecondary
  },
  balanceLabel: {
    fontSize: 13,
    color: '#666'
  },
  balanceValue: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'monospace'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyText: {
    fontSize: 16,
    color: t.colors.textTertiary
  }
});

export default PaymentHistoryScreen;
