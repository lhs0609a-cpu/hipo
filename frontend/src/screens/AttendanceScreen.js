import React, { useState, useEffect, useCallback } from 'react';
import useThemedStyles from '../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { attendanceAPI } from '../services/api';

const AttendanceScreen = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);

  // Animation
  const scaleAnim = useState(new Animated.Value(1))[0];
  const rewardAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await attendanceAPI.getStatus();
      setStatus(res.data);
    } catch (error) {
      console.error('Error fetching attendance status:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStatus();
  }, []);

  const handleCheckIn = async () => {
    if (status?.checkedInToday) return;

    setCheckingIn(true);

    // Button animation
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();

    try {
      const res = await attendanceAPI.checkIn();
      const totalReward = res.data.attendance.totalReward;
      setRewardAmount(totalReward);
      setShowReward(true);

      // Reward animation
      Animated.timing(rewardAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        setShowReward(false);
        rewardAnim.setValue(0);
        fetchStatus();
      }, 2000);

      Alert.alert('출석 완료!', res.data.message);
    } catch (error) {
      Alert.alert('오류', error.response?.data?.message || '출석 체크에 실패했습니다');
    } finally {
      setCheckingIn(false);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    return num.toLocaleString();
  };

  const getDayOfWeek = (index) => {
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    return days[index];
  };

  const getMonthCalendar = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const calendar = [];
    let week = [];

    // 월요일 시작으로 조정
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;

    // 이전 달 빈 칸
    for (let i = 0; i < adjustedFirstDay; i++) {
      week.push(null);
    }

    // 이번 달 날짜
    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      if (week.length === 7) {
        calendar.push(week);
        week = [];
      }
    }

    // 마지막 주 빈 칸
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      calendar.push(week);
    }

    return calendar;
  };

  const isCheckedDate = (day) => {
    if (!day || !status?.monthlyRecord) return false;
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return status.monthlyRecord.some(r => r.date === dateStr);
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate();
  };

  const renderWeekProgress = () => {
    const currentStreak = status?.currentStreak || 0;
    const days = [];

    for (let i = 1; i <= 7; i++) {
      const isComplete = i <= (currentStreak % 7 || (currentStreak > 0 && currentStreak % 7 === 0 ? 7 : 0));
      const isMilestone = i === 7;

      days.push(
        <View key={i} style={styles.weekDay}>
          <View style={[
            styles.weekDayCircle,
            isComplete && styles.weekDayComplete,
            isMilestone && isComplete && styles.weekDayMilestone,
          ]}>
            {isComplete ? (
              <Ionicons name="checkmark" size={20} color="#fff" />
            ) : (
              <Text style={styles.weekDayNumber}>{i}</Text>
            )}
          </View>
          <Text style={styles.weekDayLabel}>
            {isMilestone ? 'x2' : `${i}일`}
          </Text>
        </View>
      );
    }

    return days;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2B5FE3" />
      </View>
    );
  }

  const calendar = getMonthCalendar();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>출석 체크</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 출석 체크 버튼 */}
        <View style={styles.checkInCard}>
          <Text style={styles.streakLabel}>연속 출석</Text>
          <Text style={styles.streakCount}>{status?.currentStreak || 0}일</Text>

          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[
                styles.checkInButton,
                status?.checkedInToday && styles.checkedButton,
              ]}
              onPress={handleCheckIn}
              disabled={status?.checkedInToday || checkingIn}
            >
              {checkingIn ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : status?.checkedInToday ? (
                <>
                  <Ionicons name="checkmark-circle" size={32} color="#fff" />
                  <Text style={styles.checkInButtonText}>출석 완료!</Text>
                </>
              ) : (
                <>
                  <Ionicons name="hand-right" size={32} color="#fff" />
                  <Text style={styles.checkInButtonText}>출석하기</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* 보상 애니메이션 */}
          {showReward && (
            <Animated.View
              style={[
                styles.rewardPopup,
                {
                  opacity: rewardAnim,
                  transform: [{
                    translateY: rewardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  }],
                },
              ]}
            >
              <Text style={styles.rewardPopupText}>+{formatNumber(rewardAmount)} PO</Text>
            </Animated.View>
          )}

          <Text style={styles.nextMilestone}>
            7일 연속까지 {status?.nextMilestone || 7}일 남음
          </Text>
        </View>

        {/* 7일 연속 진행 상황 */}
        <View style={styles.weekProgressCard}>
          <Text style={styles.cardTitle}>이번 주 출석</Text>
          <View style={styles.weekProgress}>
            {renderWeekProgress()}
          </View>
          <View style={styles.weekRewardInfo}>
            <Ionicons name="gift" size={20} color="#F59B00" />
            <Text style={styles.weekRewardText}>7일 연속 출석 시 보상 2배!</Text>
          </View>
        </View>

        {/* 통계 */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{status?.totalDays || 0}</Text>
            <Text style={styles.statLabel}>총 출석일</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatNumber(status?.totalRewards || 0)}</Text>
            <Text style={styles.statLabel}>총 보상 (PO)</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{status?.currentStreak || 0}</Text>
            <Text style={styles.statLabel}>연속 출석</Text>
          </View>
        </View>

        {/* 달력 */}
        <View style={styles.calendarCard}>
          <Text style={styles.cardTitle}>
            {new Date().getFullYear()}년 {new Date().getMonth() + 1}월 출석 기록
          </Text>

          {/* 요일 헤더 */}
          <View style={styles.calendarHeader}>
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
              <Text
                key={i}
                style={[
                  styles.calendarDayHeader,
                  i === 5 && styles.saturdayText,
                  i === 6 && styles.sundayText,
                ]}
              >
                {getDayOfWeek(i)}
              </Text>
            ))}
          </View>

          {/* 날짜 그리드 */}
          {calendar.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.calendarWeek}>
              {week.map((day, dayIndex) => (
                <View key={dayIndex} style={styles.calendarDay}>
                  {day && (
                    <View style={[
                      styles.calendarDayContent,
                      isCheckedDate(day) && styles.checkedDay,
                      isToday(day) && styles.todayDay,
                    ]}>
                      <Text style={[
                        styles.calendarDayText,
                        isCheckedDate(day) && styles.checkedDayText,
                        isToday(day) && !isCheckedDate(day) && styles.todayDayText,
                        dayIndex === 5 && styles.saturdayText,
                        dayIndex === 6 && styles.sundayText,
                      ]}>
                        {day}
                      </Text>
                      {isCheckedDate(day) && (
                        <Ionicons
                          name="checkmark"
                          size={12}
                          color="#fff"
                          style={styles.checkMark}
                        />
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* 안내 */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>출석 체크 안내</Text>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={16} color="#00B368" />
            <Text style={styles.infoText}>매일 출석하면 100 PO 지급</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="star" size={16} color="#F59B00" />
            <Text style={styles.infoText}>7일 연속 출석 시 보상 2배 (200 PO)</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="time" size={16} color="#2B5FE3" />
            <Text style={styles.infoText}>출석 체크는 매일 자정에 초기화됩니다</Text>
          </View>
        </View>
      </ScrollView>
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
  content: {
    padding: 16,
  },
  checkInCard: {
    backgroundColor: t.colors.primary,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  streakLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  streakCount: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
  },
  checkInButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  checkedButton: {
    backgroundColor: t.colors.success,
    borderColor: t.colors.success,
  },
  checkInButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginTop: 4,
  },
  rewardPopup: {
    position: 'absolute',
    bottom: 100,
    backgroundColor: t.colors.warning,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  rewardPopupText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  nextMilestone: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 20,
  },
  weekProgressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  weekProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDay: {
    alignItems: 'center',
  },
  weekDayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  weekDayComplete: {
    backgroundColor: t.colors.primary,
  },
  weekDayMilestone: {
    backgroundColor: t.colors.warning,
  },
  weekDayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  weekDayLabel: {
    fontSize: 11,
    color: '#666',
  },
  weekRewardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 6,
  },
  weekRewardText: {
    fontSize: 13,
    color: '#A57C18',
    fontWeight: '600',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#eee',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: t.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarDayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    paddingVertical: 8,
  },
  calendarWeek: {
    flexDirection: 'row',
  },
  calendarDay: {
    flex: 1,
    aspectRatio: 1,
    padding: 4,
  },
  calendarDayContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  calendarDayText: {
    fontSize: 14,
    color: '#333',
  },
  checkedDay: {
    backgroundColor: t.colors.primary,
  },
  checkedDayText: {
    color: '#fff',
    fontWeight: '600',
  },
  todayDay: {
    borderWidth: 2,
    borderColor: t.colors.primary,
  },
  todayDayText: {
    color: t.colors.primary,
    fontWeight: '600',
  },
  saturdayText: {
    color: t.colors.primary,
  },
  sundayText: {
    color: t.colors.error,
  },
  checkMark: {
    position: 'absolute',
    bottom: 2,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
});

export default AttendanceScreen;
