import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { loginStreakAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const LoginStreakWidget = ({ onRewardClaimed }) => {
  const { isAuthenticated, updateUser, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [streakData, setStreakData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [claimedReward, setClaimedReward] = useState(null);

  // Animation
  const [bounceAnim] = useState(new Animated.Value(1));
  const [glowAnim] = useState(new Animated.Value(0));

  const fetchStreakStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const response = await loginStreakAPI.getStatus();
      setStreakData(response.data);

      // 보상 받을 수 있으면 애니메이션 시작
      if (response.data.reward?.canClaim) {
        startPulseAnimation();
      }
    } catch (error) {
      console.error('Login streak fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchStreakStatus();
  }, [fetchStreakStatus]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(bounceAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  };

  const handleClaim = async () => {
    if (claiming || !streakData?.reward?.canClaim) return;

    setClaiming(true);
    try {
      const response = await loginStreakAPI.claimReward();
      if (response.data.success) {
        setClaimedReward(response.data.reward);
        setShowModal(true);

        // 상태 업데이트
        setStreakData(prev => ({
          ...prev,
          reward: { ...prev.reward, canClaim: false },
        }));

        // 부모에게 알림
        if (onRewardClaimed) {
          onRewardClaimed(response.data.reward.po);
        }

        // 유저 잔액 업데이트
        if (updateUser && user) {
          updateUser({ ...user, poBalance: response.data.newBalance });
        }
      }
    } catch (error) {
      console.error('Claim reward error:', error);
    } finally {
      setClaiming(false);
    }
  };

  if (!isAuthenticated || loading) {
    return null;
  }

  if (!streakData) {
    return null;
  }

  const { streak, reward } = streakData;
  const canClaim = reward?.canClaim;
  const dayInCycle = streak?.dayInCycle || 1;
  const weeklyRewards = reward?.weeklyRewards || [];

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          canClaim && { transform: [{ scale: bounceAnim }] },
        ]}
      >
        <TouchableOpacity
          onPress={canClaim ? handleClaim : () => setShowModal(true)}
          activeOpacity={0.9}
          disabled={claiming}
        >
          <LinearGradient
            colors={canClaim ? ['#F0344B', '#FF8A4C'] : ['#00B368', '#00915A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientContainer}
          >
            <View style={styles.leftSection}>
              <View style={styles.fireIconContainer}>
                <Ionicons
                  name="flame"
                  size={28}
                  color={canClaim ? '#fff' : '#D9A521'}
                />
              </View>
              <View style={styles.streakInfo}>
                <Text style={styles.streakLabel}>연속 로그인</Text>
                <Text style={styles.streakCount}>
                  {streak?.currentStreak || 0}일
                </Text>
              </View>
            </View>

            <View style={styles.rightSection}>
              {canClaim ? (
                <View style={styles.claimButton}>
                  {claiming ? (
                    <ActivityIndicator size="small" color="#F0344B" />
                  ) : (
                    <>
                      <Text style={styles.claimText}>받기</Text>
                      <Text style={styles.rewardText}>
                        +{reward?.todayReward?.po || 0} PO
                      </Text>
                    </>
                  )}
                </View>
              ) : (
                <View style={styles.checkedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.checkedText}>완료</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* 보상 및 진행 상황 모달 */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {claimedReward ? (
              // 보상 수령 완료 화면
              <View style={styles.rewardSuccessContainer}>
                <View style={styles.rewardIconCircle}>
                  <Ionicons name="gift" size={48} color="#00B368" />
                </View>
                <Text style={styles.rewardSuccessTitle}>보상 획득!</Text>
                <Text style={styles.rewardSuccessAmount}>
                  +{claimedReward.po} PO
                </Text>
                <Text style={styles.rewardSuccessDescription}>
                  {claimedReward.description}
                </Text>
                <Text style={styles.streakMessage}>
                  {streak?.currentStreak}일 연속 로그인 중!
                </Text>
              </View>
            ) : (
              // 주간 보상 현황
              <View>
                <Text style={styles.modalTitle}>주간 로그인 보상</Text>
                <Text style={styles.modalSubtitle}>
                  매일 접속하고 보상을 받으세요!
                </Text>

                <View style={styles.weeklyProgress}>
                  {weeklyRewards.map((dayReward, index) => {
                    const day = index + 1;
                    const isPast = day < dayInCycle;
                    const isCurrent = day === dayInCycle;
                    const isFuture = day > dayInCycle;

                    return (
                      <View key={day} style={styles.dayItem}>
                        <View
                          style={[
                            styles.dayCircle,
                            isPast && styles.dayCirclePast,
                            isCurrent && styles.dayCircleCurrent,
                            isFuture && styles.dayCircleFuture,
                          ]}
                        >
                          {isPast ? (
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          ) : (
                            <Ionicons
                              name={day === 7 ? 'trophy' : 'gift'}
                              size={16}
                              color={isCurrent ? '#fff' : '#999'}
                            />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.dayLabel,
                            isCurrent && styles.dayLabelCurrent,
                          ]}
                        >
                          {day}일
                        </Text>
                        <Text
                          style={[
                            styles.dayReward,
                            isCurrent && styles.dayRewardCurrent,
                          ]}
                        >
                          {dayReward.po}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {streak?.currentStreak || 0}일
                    </Text>
                    <Text style={styles.statLabel}>현재 연속</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {streak?.longestStreak || 0}일
                    </Text>
                    <Text style={styles.statLabel}>최장 기록</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {(streak?.totalRewardsClaimed || 0).toLocaleString()}
                    </Text>
                    <Text style={styles.statLabel}>총 획득 PO</Text>
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowModal(false);
                setClaimedReward(null);
              }}
            >
              <Text style={styles.closeButtonText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gradientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fireIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  streakInfo: {},
  streakLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  streakCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  rightSection: {},
  claimButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 80,
  },
  claimText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F0344B',
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F0344B',
  },
  checkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  checkedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },

  // Weekly progress
  weeklyProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dayItem: {
    alignItems: 'center',
    flex: 1,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  dayCirclePast: {
    backgroundColor: '#00B368',
  },
  dayCircleCurrent: {
    backgroundColor: '#F0344B',
  },
  dayCircleFuture: {
    backgroundColor: '#DFE3EB',
  },
  dayLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  dayLabelCurrent: {
    color: '#F0344B',
    fontWeight: '600',
  },
  dayReward: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  dayRewardCurrent: {
    color: '#F0344B',
    fontWeight: '700',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#DFE3EB',
    marginHorizontal: 12,
  },

  // Reward success
  rewardSuccessContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  rewardIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E7F8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  rewardSuccessTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  rewardSuccessAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#00B368',
    marginBottom: 8,
  },
  rewardSuccessDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  streakMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F0344B',
  },

  closeButton: {
    backgroundColor: '#00B368',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default LoginStreakWidget;
