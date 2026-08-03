import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { dividendAPI } from '../services/api';

const DividendCalendarWidget = ({ navigation }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [upcomingDividends, setUpcomingDividends] = useState([]);
  const [totalExpected, setTotalExpected] = useState(0);
  const [nextDividendDate, setNextDividendDate] = useState(null);

  useEffect(() => {
    fetchUpcomingDividends();
  }, []);

  const fetchUpcomingDividends = async () => {
    try {
      const response = await dividendAPI.getUpcoming();
      const upcoming = response.data.upcoming || [];
      setUpcomingDividends(upcoming.slice(0, 5));

      // 총 예상 배당금
      const total = upcoming.reduce((sum, d) => sum + (d.expectedAmount || 0), 0);
      setTotalExpected(total);

      // 다음 배당일
      if (upcoming.length > 0) {
        setNextDividendDate(new Date(upcoming[0].scheduledAt));
      }
    } catch (error) {
      console.error('Error fetching upcoming dividends:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntil = (date) => {
    if (!date) return null;
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (upcomingDividends.length === 0) {
    return null; // 예정 배당이 없으면 위젯 숨김
  }

  const daysUntil = getDaysUntil(nextDividendDate);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      onPress={() => navigation.navigate('Dividend')}
      activeOpacity={0.8}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: '#FFF6E6' }]}>
            <Ionicons name="calendar" size={20} color="#F59B00" />
          </View>
          <View>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              배당 달력
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textTertiary }]}>
              예정된 배당금을 확인하세요
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
      </View>

      {/* 요약 카드 */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { backgroundColor: '#FFF6E6' }]}>
          <Text style={styles.summaryLabel}>다음 배당까지</Text>
          {daysUntil !== null && (
            <View style={styles.daysContainer}>
              <Text style={styles.daysNumber}>{daysUntil}</Text>
              <Text style={styles.daysUnit}>일</Text>
            </View>
          )}
          <Text style={styles.dateText}>{formatDate(nextDividendDate)}</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: '#E7F8F0' }]}>
          <Text style={styles.summaryLabel}>예상 배당금</Text>
          <Text style={styles.expectedAmount}>
            {totalExpected.toLocaleString()}
          </Text>
          <Text style={styles.expectedUnit}>PO</Text>
        </View>
      </View>

      {/* 예정 배당 리스트 */}
      <View style={styles.listContainer}>
        {upcomingDividends.slice(0, 3).map((dividend, index) => (
          <View
            key={dividend.id || index}
            style={[
              styles.dividendItem,
              index < upcomingDividends.slice(0, 3).length - 1 && styles.dividendItemBorder,
            ]}
          >
            <View style={styles.dividendLeft}>
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeMonth}>
                  {new Date(dividend.scheduledAt).toLocaleDateString('ko-KR', { month: 'short' })}
                </Text>
                <Text style={styles.dateBadgeDay}>
                  {new Date(dividend.scheduledAt).getDate()}
                </Text>
              </View>
              <View style={styles.dividendInfo}>
                <Text style={[styles.creatorName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                  {dividend.stock?.issuer?.displayName || dividend.stock?.issuer?.username || '크리에이터'}
                </Text>
                <Text style={[styles.sharesText, { color: theme.colors.textTertiary }]}>
                  {dividend.shares || 0}주 보유 • 배당률 {dividend.rate || 0}%
                </Text>
              </View>
            </View>
            <Text style={styles.dividendAmount}>
              +{(dividend.expectedAmount || 0).toLocaleString()} PO
            </Text>
          </View>
        ))}
      </View>

      {upcomingDividends.length > 3 && (
        <View style={styles.moreContainer}>
          <Text style={[styles.moreText, { color: theme.colors.primary }]}>
            +{upcomingDividends.length - 3}개 더 보기
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  // 요약 카드
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  daysContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  daysNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F59B00',
  },
  daysUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59B00',
    marginLeft: 2,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  expectedAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00B368',
  },
  expectedUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00B368',
    marginTop: 2,
  },

  // 리스트
  listContainer: {
    paddingHorizontal: 20,
  },
  dividendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  dividendItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F7',
  },
  dividendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateBadge: {
    width: 44,
    height: 44,
    backgroundColor: '#F8F9FB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateBadgeMonth: {
    fontSize: 10,
    color: '#999',
    fontWeight: '500',
  },
  dateBadgeDay: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  dividendInfo: {
    flex: 1,
  },
  creatorName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  sharesText: {
    fontSize: 12,
  },
  dividendAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00B368',
  },

  // 더 보기
  moreContainer: {
    alignItems: 'center',
    paddingTop: 12,
  },
  moreText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DividendCalendarWidget;
