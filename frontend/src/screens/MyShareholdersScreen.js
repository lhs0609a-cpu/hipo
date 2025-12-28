import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { getMyShareholders } from '../api/stocks';
import { COLORS, TRUST_LEVEL_COLORS } from '../constants/colors';

export default function MyShareholdersScreen({ navigation }) {
  const [shareholders, setShareholders] = useState([]);
  const [myStock, setMyStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadShareholders();
  }, []);

  const loadShareholders = async () => {
    try {
      const data = await getMyShareholders();
      setShareholders(data.shareholders || []);
      setMyStock(data.myStock);
    } catch (error) {
      console.error('주주 목록 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadShareholders();
    setRefreshing(false);
  };

  const renderShareholder = ({ item, index }) => {
    const holder = item.holder;
    const trustLevelColor = TRUST_LEVEL_COLORS[holder.trustLevel] || COLORS.textSecondary;
    const isTopHolder = index < 3;

    return (
      <TouchableOpacity
        style={styles.shareholderCard}
        onPress={() => navigation.navigate('Profile', { userId: holder.id })}
        activeOpacity={0.7}
      >
        <View style={styles.shareholderHeader}>
          <View style={styles.shareholderLeft}>
            {isTopHolder && (
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                </Text>
              </View>
            )}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {holder.username?.charAt(0)?.toUpperCase()}
              </Text>
            </View>
            <View style={styles.holderInfo}>
              <Text style={styles.holderName}>{holder.username}</Text>
              <View style={[styles.trustBadge, { backgroundColor: trustLevelColor }]}>
                <Text style={styles.trustText}>신뢰도 {holder.trustLevel}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>

        <View style={styles.shareholderDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>보유 주식</Text>
            <Text style={styles.detailValue}>{item.shares.toLocaleString()}주</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>보유 비율</Text>
            <Text style={styles.percentageValue}>{item.percentage}%</Text>
          </View>
          <View style={[styles.detailRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>보유 가치</Text>
            <Text style={styles.totalValue}>
              {item.totalValue.toLocaleString()} PO
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => {
    if (!myStock) return null;

    const totalHolders = shareholders.length;
    const totalShares = shareholders.reduce((sum, sh) => sum + sh.shares, 0);
    const circulationRate = myStock.issuedShares > 0
      ? ((totalShares / myStock.issuedShares) * 100).toFixed(2)
      : 0;

    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>내 주식 현황</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>주주 수</Text>
            <Text style={styles.summaryValue}>{totalHolders}명</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>현재가</Text>
            <Text style={styles.summaryValue}>{myStock.sharePrice.toLocaleString()} PO</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>유통 비율</Text>
            <Text style={styles.summaryValue}>{circulationRate}%</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={shareholders}
        renderItem={renderShareholder}
        keyExtractor={(item) => item.holder.id}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>아직 주주가 없습니다</Text>
            <Text style={styles.emptySubtext}>
              다른 사용자들이 내 주식을 구매하면 여기에 표시됩니다
            </Text>
          </View>
        }
        contentContainerStyle={shareholders.length === 0 ? styles.emptyListContent : styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyListContent: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  shareholderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shareholderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  shareholderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankBadge: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 20,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  holderInfo: {
    gap: 4,
  },
  holderName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  trustBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  trustText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 24,
    color: COLORS.textTertiary,
    marginLeft: 8,
  },
  shareholderDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  percentageValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
