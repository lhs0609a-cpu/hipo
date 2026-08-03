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
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { COLORS } from '../constants/colors';
import api from '../api/client';

export default function CompetitionScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('ongoing'); // ongoing, upcoming, ended
  const [competitions, setCompetitions] = useState([]);
  const [myCompetitions, setMyCompetitions] = useState([]);

  useEffect(() => {
    loadData();
  }, [selectedTab]);

  const loadData = async () => {
    try {
      setLoading(true);

      // 대회 목록 조회
      const response = await api.get('/competitions', {
        params: {
          status: selectedTab === 'ongoing' ? 'active' : selectedTab === 'upcoming' ? 'upcoming' : 'ended'
        }
      });

      if (response.data.success) {
        setCompetitions(response.data.competitions || []);
      }

      // 내 참가 대회 조회
      const myResponse = await api.get('/competitions/my');
      if (myResponse.data.success) {
        setMyCompetitions(myResponse.data.competitions || []);
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinCompetition = async (competitionId) => {
    try {
      const response = await api.post(`/competitions/${competitionId}/join`);

      if (response.data.success) {
        if (Platform.OS === 'web') {
          window.alert('대회에 참가했습니다!');
        } else {
          Alert.alert('성공', '대회에 참가했습니다!');
        }
        loadData();
      }
    } catch (error) {
      console.error('대회 참가 오류:', error);
      const message = error.response?.data?.error || '대회 참가에 실패했습니다';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('오류', message);
      }
    }
  };

  const getCompetitionStatus = (competition) => {
    const now = new Date();
    const startDate = new Date(competition.startDate);
    const endDate = new Date(competition.endDate);

    if (now < startDate) return { text: '대기중', color: '#F59B00' };
    if (now > endDate) return { text: '종료', color: theme.colors.textSecondary };
    return { text: '진행중', color: theme.colors.success };
  };

  const getCompetitionTypeText = (type) => {
    const types = {
      profit_rate: '수익률 경쟁',
      volume: '거래량 경쟁',
      portfolio: '포트폴리오 경쟁',
    };
    return types[type] || type;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const formatPrize = (prize) => {
    if (!prize) return '미정';
    if (typeof prize === 'number') return `${prize.toLocaleString()} PO`;
    return prize;
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
        <Text style={styles.headerTitle}>트레이딩 대회</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 내 참가 대회 요약 */}
      {myCompetitions.length > 0 && (
        <View style={styles.myCompetitionsCard}>
          <Text style={styles.myCompetitionsTitle}>내 참가 대회</Text>
          <View style={styles.myCompetitionsStats}>
            <View style={styles.myStatItem}>
              <Text style={styles.myStatLabel}>참가중</Text>
              <Text style={styles.myStatValue}>
                {myCompetitions.filter(c => c.status === 'active').length}개
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.myStatItem}>
              <Text style={styles.myStatLabel}>최고 순위</Text>
              <Text style={styles.myStatValue}>
                {Math.min(...myCompetitions.map(c => c.myRank || 999))}위
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.myStatItem}>
              <Text style={styles.myStatLabel}>총 상금</Text>
              <Text style={styles.myStatValue}>
                {myCompetitions.reduce((sum, c) => sum + (c.myPrize || 0), 0).toLocaleString()} PO
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 탭 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'ongoing' && styles.tabActive]}
          onPress={() => setSelectedTab('ongoing')}
        >
          <Text style={[styles.tabText, selectedTab === 'ongoing' && styles.tabTextActive]}>
            진행중 🔥
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'upcoming' && styles.tabActive]}
          onPress={() => setSelectedTab('upcoming')}
        >
          <Text style={[styles.tabText, selectedTab === 'upcoming' && styles.tabTextActive]}>
            예정
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'ended' && styles.tabActive]}
          onPress={() => setSelectedTab('ended')}
        >
          <Text style={[styles.tabText, selectedTab === 'ended' && styles.tabTextActive]}>
            종료
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {competitions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyText}>
              {selectedTab === 'ongoing'
                ? '진행중인 대회가 없습니다'
                : selectedTab === 'upcoming'
                ? '예정된 대회가 없습니다'
                : '종료된 대회가 없습니다'}
            </Text>
          </View>
        ) : (
          competitions.map((competition) => {
            const status = getCompetitionStatus(competition);
            const isJoined = competition.isJoined;

            return (
              <View key={competition.id} style={styles.competitionCard}>
                <View style={styles.competitionHeader}>
                  <View style={styles.competitionHeaderLeft}>
                    <Text style={styles.competitionName}>{competition.name}</Text>
                    <Text style={styles.competitionType}>
                      {getCompetitionTypeText(competition.competitionType)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>
                      {status.text}
                    </Text>
                  </View>
                </View>

                <Text style={styles.competitionDescription} numberOfLines={2}>
                  {competition.description}
                </Text>

                <View style={styles.competitionInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>기간</Text>
                    <Text style={styles.infoValue}>
                      {formatDate(competition.startDate)} ~ {formatDate(competition.endDate)}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>참가자</Text>
                    <Text style={styles.infoValue}>
                      {competition.participantCount || 0}명
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>상금</Text>
                    <Text style={[styles.infoValue, styles.prizeValue]}>
                      {formatPrize(competition.totalPrize)}
                    </Text>
                  </View>
                </View>

                <View style={styles.competitionActions}>
                  <TouchableOpacity
                    style={styles.detailButton}
                    onPress={() => navigation.navigate('CompetitionDetail', { competitionId: competition.id })}
                  >
                    <Text style={styles.detailButtonText}>상세보기</Text>
                  </TouchableOpacity>

                  {status.text === '진행중' && !isJoined && (
                    <TouchableOpacity
                      style={styles.joinButton}
                      onPress={() => joinCompetition(competition.id)}
                    >
                      <Text style={styles.joinButtonText}>참가하기</Text>
                    </TouchableOpacity>
                  )}

                  {isJoined && (
                    <View style={styles.joinedBadge}>
                      <Text style={styles.joinedText}>✓ 참가중</Text>
                    </View>
                  )}
                </View>

                {isJoined && competition.myRank && (
                  <View style={styles.myRankCard}>
                    <View style={styles.myRankItem}>
                      <Text style={styles.myRankLabel}>내 순위</Text>
                      <Text style={styles.myRankValue}>{competition.myRank}위</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.myRankItem}>
                      <Text style={styles.myRankLabel}>수익률</Text>
                      <Text style={[
                        styles.myRankValue,
                        { color: competition.myProfitRate >= 0 ? theme.colors.success : theme.colors.danger }
                      ]}>
                        {competition.myProfitRate >= 0 ? '+' : ''}{competition.myProfitRate?.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
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
  myCompetitionsCard: {
    backgroundColor: t.colors.surface,
    padding: 20,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  myCompetitionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: t.colors.text,
    marginBottom: 16,
  },
  myCompetitionsStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  myStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  myStatLabel: {
    fontSize: 12,
    color: t.colors.textSecondary,
    marginBottom: 8,
  },
  myStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: t.colors.primary,
  },
  statDivider: {
    width: 1,
    backgroundColor: t.colors.border,
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
  competitionCard: {
    backgroundColor: t.colors.surface,
    padding: 16,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  competitionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  competitionHeaderLeft: {
    flex: 1,
  },
  competitionName: {
    fontSize: 18,
    fontWeight: '700',
    color: t.colors.text,
    marginBottom: 4,
  },
  competitionType: {
    fontSize: 13,
    color: t.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  competitionDescription: {
    fontSize: 14,
    color: t.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  competitionInfo: {
    backgroundColor: t.colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: t.colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: t.colors.text,
  },
  prizeValue: {
    color: t.colors.primary,
  },
  competitionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  detailButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: t.colors.border,
    alignItems: 'center',
  },
  detailButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: t.colors.text,
  },
  joinButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: t.colors.surface,
  },
  joinedBadge: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: t.colors.success + '20',
    borderWidth: 1,
    borderColor: t.colors.success,
    alignItems: 'center',
  },
  joinedText: {
    fontSize: 14,
    fontWeight: '600',
    color: t.colors.success,
  },
  myRankCard: {
    flexDirection: 'row',
    backgroundColor: t.colors.primary + '10',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  myRankItem: {
    flex: 1,
    alignItems: 'center',
  },
  myRankLabel: {
    fontSize: 12,
    color: t.colors.textSecondary,
    marginBottom: 4,
  },
  myRankValue: {
    fontSize: 16,
    fontWeight: '700',
    color: t.colors.text,
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
  },
});
