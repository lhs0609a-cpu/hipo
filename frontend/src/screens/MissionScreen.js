import React, { useState, useEffect } from 'react';
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
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
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
      <View style={styles.header}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#FF9800',
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
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
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  listContainer: {
    padding: 16,
  },
  missionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedCard: {
    backgroundColor: '#fff8e1',
  },
  missionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: 24,
  },
  missionContent: {
    flex: 1,
  },
  missionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  missionDescription: {
    fontSize: 13,
    color: '#666',
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
    backgroundColor: '#eee',
    borderRadius: 3,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF9800',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    minWidth: 40,
  },
  rewardRow: {
    flexDirection: 'row',
  },
  rewardText: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '600',
  },
  claimButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginLeft: 12,
  },
  claimButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  claimedButton: {
    backgroundColor: '#4CAF50',
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  claimButtonTextDisabled: {
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  loginRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loginRequiredIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  loginRequiredTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  loginRequiredText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default MissionScreen;
