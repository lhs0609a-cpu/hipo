import React, { useState, useEffect } from 'react';
import useThemedStyles from '../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { missionAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const MissionScreen = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMissions();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchMissions = async () => {
    try {
      const response = await missionAPI.getAll();
      setMissions(response.data.missions || []);
    } catch (error) {
      console.error('Error fetching missions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleClaimReward = async (missionId) => {
    try {
      await missionAPI.claimReward(missionId);
      Alert.alert('성공', '보상을 받았습니다!');
      fetchMissions();
    } catch (error) {
      Alert.alert('오류', error.response?.data?.message || '보상 수령에 실패했습니다');
    }
  };

  const getMissionIcon = (type) => {
    switch (type) {
      case 'login':
        return '📱';
      case 'trade':
        return '📈';
      case 'post':
        return '📝';
      case 'comment':
        return '💬';
      case 'like':
        return '❤️';
      case 'share':
        return '🔗';
      case 'invite':
        return '👥';
      default:
        return '🎯';
    }
  };

  const renderMissionItem = ({ item }) => {
    const progress = item.currentProgress || 0;
    const target = item.targetProgress || 1;
    const progressPercent = Math.min((progress / target) * 100, 100);
    const isCompleted = progress >= target;
    const isClaimed = item.isClaimed;

    return (
      <View style={[styles.missionCard, isCompleted && styles.completedCard]}>
        <View style={styles.missionIcon}>
          <Text style={styles.iconText}>{getMissionIcon(item.type)}</Text>
        </View>

        <View style={styles.missionContent}>
          <Text style={styles.missionTitle}>{item.title}</Text>
          <Text style={styles.missionDescription}>{item.description}</Text>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}/{target}</Text>
          </View>

          <View style={styles.rewardRow}>
            <Text style={styles.rewardText}>
              🎁 {(item.rewardAmount || 0).toLocaleString()} {item.rewardType === 'point' ? '포인트' : '원'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.claimButton,
            !isCompleted && styles.claimButtonDisabled,
            isClaimed && styles.claimedButton,
          ]}
          onPress={() => handleClaimReward(item.id)}
          disabled={!isCompleted || isClaimed}
        >
          <Text style={[
            styles.claimButtonText,
            !isCompleted && styles.claimButtonTextDisabled,
          ]}>
            {isClaimed ? '완료' : isCompleted ? '받기' : '진행중'}
          </Text>
        </TouchableOpacity>
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

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Text style={styles.headerTitle}>데일리 미션</Text>
        </View>
        <View style={styles.loginRequiredContainer}>
          <Text style={styles.loginRequiredIcon}>🎯</Text>
          <Text style={styles.loginRequiredTitle}>로그인이 필요합니다</Text>
          <Text style={styles.loginRequiredText}>
            미션을 확인하려면{'\n'}로그인해주세요.
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>로그인하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const completedCount = missions.filter(m => (m.currentProgress || 0) >= (m.targetProgress || 1)).length;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>데일리 미션</Text>
        <Text style={styles.headerSubtitle}>
          오늘의 미션 {completedCount}/{missions.length} 완료
        </Text>
        <View style={styles.headerProgress}>
          <View style={styles.headerProgressBar}>
            <View
              style={[
                styles.headerProgressFill,
                { width: `${(completedCount / missions.length) * 100}%` },
              ]}
            />
          </View>
        </View>
      </View>

      <FlatList
        data={missions}
        renderItem={renderMissionItem}
        keyExtractor={(item) => item.id?.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchMissions} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyText}>오늘의 미션이 없습니다</Text>
          </View>
        }
      />
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
    backgroundColor: t.colors.warning,
    paddingTop: 10,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.surface,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
  },
  headerProgress: {
    marginTop: 12,
  },
  headerProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  headerProgressFill: {
    height: '100%',
    backgroundColor: t.colors.surface,
    borderRadius: 4,
  },
  listContainer: {
    padding: 16,
  },
  missionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: t.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedCard: {
    backgroundColor: t.colors.warningBackground,
  },
  missionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: t.colors.warningBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: 24,
    fontFamily: t.fonts.regular,
  },
  missionContent: {
    flex: 1,
  },
  missionTitle: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.textPrimary,
    marginBottom: 4,
  },
  missionDescription: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: t.colors.borderLight,
    borderRadius: 3,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: t.colors.warning,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    minWidth: 40,
  },
  rewardRow: {
    flexDirection: 'row',
  },
  rewardText: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    color: t.colors.warning,
    fontWeight: '600',
  },
  claimButton: {
    backgroundColor: t.colors.warning,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginLeft: 12,
  },
  claimButtonDisabled: {
    backgroundColor: t.colors.border,
  },
  claimedButton: {
    backgroundColor: t.colors.success,
  },
  claimButtonText: {
    color: t.colors.surface,
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  claimButtonTextDisabled: {
    color: t.colors.textTertiary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    fontFamily: t.fonts.regular,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  loginRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loginRequiredIcon: {
    fontSize: 64,
    fontFamily: t.fonts.regular,
    marginBottom: 20,
  },
  loginRequiredTitle: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.textPrimary,
    marginBottom: 12,
  },
  loginRequiredText: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: t.colors.warning,
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 10,
  },
  loginButtonText: {
    color: t.colors.surface,
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
});

export default MissionScreen;
