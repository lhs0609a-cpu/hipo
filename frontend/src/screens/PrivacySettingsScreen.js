import React, { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import comingSoon from '../utils/comingSoon';

const PRIVACY_SETTINGS_KEY = '@privacy_settings';

const DEFAULT_SETTINGS = {
  // 프로필 공개 설정
  profile: {
    showProfile: true, // 프로필 공개
    showPortfolio: false, // 포트폴리오 공개
    showActivity: true, // 활동 내역 공개
    showFollowers: true, // 팔로워 목록 공개
    showFollowing: true, // 팔로잉 목록 공개
  },
  // 거래 정보 공개
  trading: {
    showHoldings: false, // 보유 종목 공개
    showProfitLoss: false, // 수익률 공개
    showTransactions: false, // 거래 내역 공개
    showRanking: true, // 랭킹 참여
  },
  // 소셜 설정
  social: {
    allowMessages: true, // 메시지 허용
    allowFollows: true, // 팔로우 허용
    allowMentions: true, // 멘션 허용
    showOnlineStatus: false, // 온라인 상태 표시
  },
  // 검색 및 추천
  discovery: {
    showInSearch: true, // 검색에 노출
    showInRecommendations: true, // 추천에 노출
    allowDataAnalysis: true, // 데이터 분석 허용
  },
  // 데이터 관리
  data: {
    saveSearchHistory: true, // 검색 기록 저장
    saveWatchHistory: true, // 시청 기록 저장
    personalizedAds: false, // 맞춤 광고
  },
};

const VISIBILITY_OPTIONS = [
  { value: 'everyone', label: '전체 공개', icon: 'globe' },
  { value: 'followers', label: '팔로워만', icon: 'people' },
  { value: 'private', label: '비공개', icon: 'lock-closed' },
];

export default function PrivacySettingsScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [profileVisibility, setProfileVisibility] = useState('everyone');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(PRIVACY_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
        setProfileVisibility(parsed.profileVisibility || 'everyone');
      }
    } catch (error) {
      console.error('개인정보 설정 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings, visibility = profileVisibility) => {
    try {
      await AsyncStorage.setItem(
        PRIVACY_SETTINGS_KEY,
        JSON.stringify({ settings: newSettings, profileVisibility: visibility })
      );
      setSettings(newSettings);
    } catch (error) {
      console.error('개인정보 설정 저장 실패:', error);
    }
  };

  const toggleSetting = (category, key) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [key]: !settings[category][key],
      },
    };
    saveSettings(newSettings);
  };

  const handleVisibilityChange = (value) => {
    setProfileVisibility(value);
    saveSettings(settings, value);
  };

  const handleDeleteData = (type) => {
    const messages = {
      search: '검색 기록을 삭제하시겠습니까?',
      watch: '시청 기록을 삭제하시겠습니까?',
      all: '모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    };

    if (Platform.OS === 'web') {
      if (window.confirm(messages[type])) {
        Alert.alert('완료', '데이터가 삭제되었습니다.');
      }
    } else {
      Alert.alert(
        '데이터 삭제',
        messages[type],
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => Alert.alert('완료', '데이터가 삭제되었습니다.'),
          },
        ]
      );
    }
  };

  const handleBlockedUsers = () => {
    comingSoon('차단 사용자 관리');
  };

  const renderSettingItem = (label, value, onToggle, description = null) => (
    <View style={styles.settingItem}>
      <View style={styles.settingTextContainer}>
        <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
        {description && (
          <Text style={[styles.settingDescription, { color: theme.colors.textTertiary }]}>
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
        thumbColor={value ? theme.colors.primary : theme.colors.gray300}
      />
    </View>
  );

  const renderSection = (title, icon, iconColor, items) => (
    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
      </View>
      <View style={[styles.sectionContent, { borderTopColor: theme.colors.border }]}>
        {items.map((item, index) => (
          <View key={item.key}>
            {renderSettingItem(
              item.label,
              settings[item.category]?.[item.key],
              () => toggleSetting(item.category, item.key),
              item.description
            )}
            {index < items.length - 1 && (
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            )}
          </View>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.textSecondary }}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }, { backgroundColor: theme.colors.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>개인정보 설정</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 프로필 공개 범위 */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#3182F620' }]}>
              <Ionicons name="person" size={18} color="#2B5FE3" />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>프로필 공개 범위</Text>
          </View>
          <View style={[styles.visibilityOptions, { borderTopColor: theme.colors.border }]}>
            {VISIBILITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.visibilityOption,
                  profileVisibility === option.value && {
                    backgroundColor: theme.colors.primaryBackground,
                    borderColor: theme.colors.primary,
                  },
                  { borderColor: theme.colors.border },
                ]}
                onPress={() => handleVisibilityChange(option.value)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={profileVisibility === option.value ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.visibilityLabel,
                    {
                      color: profileVisibility === option.value
                        ? theme.colors.primary
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 프로필 정보 공개 */}
        {renderSection('프로필 정보', 'id-card', '#8B5CF6', [
          { category: 'profile', key: 'showPortfolio', label: '포트폴리오 공개', description: '보유 종목과 수익률을 다른 사용자에게 공개' },
          { category: 'profile', key: 'showActivity', label: '활동 내역 공개', description: '게시물, 댓글 등 활동 내역 공개' },
          { category: 'profile', key: 'showFollowers', label: '팔로워 목록 공개', description: '내 팔로워 목록을 다른 사용자에게 공개' },
          { category: 'profile', key: 'showFollowing', label: '팔로잉 목록 공개', description: '내가 팔로우하는 목록 공개' },
        ])}

        {/* 거래 정보 */}
        {renderSection('거래 정보', 'stats-chart', '#00B368', [
          { category: 'trading', key: 'showHoldings', label: '보유 종목 공개', description: '현재 보유 중인 종목 정보 공개' },
          { category: 'trading', key: 'showProfitLoss', label: '수익률 공개', description: '투자 수익률 정보 공개' },
          { category: 'trading', key: 'showTransactions', label: '거래 내역 공개', description: '매수/매도 거래 내역 공개' },
          { category: 'trading', key: 'showRanking', label: '랭킹 참여', description: '투자자 랭킹에 참여' },
        ])}

        {/* 소셜 설정 */}
        {renderSection('소셜', 'chatbubbles', '#2B5FE3', [
          { category: 'social', key: 'allowMessages', label: '메시지 허용', description: '다른 사용자의 메시지 수신 허용' },
          { category: 'social', key: 'allowFollows', label: '팔로우 허용', description: '다른 사용자의 팔로우 허용' },
          { category: 'social', key: 'allowMentions', label: '멘션 허용', description: '게시물에서 멘션 허용' },
          { category: 'social', key: 'showOnlineStatus', label: '온라인 상태 표시', description: '다른 사용자에게 온라인 상태 표시' },
        ])}

        {/* 검색 및 추천 */}
        {renderSection('검색 및 추천', 'search', '#F59B00', [
          { category: 'discovery', key: 'showInSearch', label: '검색 노출', description: '사용자 검색 결과에 노출' },
          { category: 'discovery', key: 'showInRecommendations', label: '추천 노출', description: '추천 사용자 목록에 노출' },
          { category: 'discovery', key: 'allowDataAnalysis', label: '데이터 분석 허용', description: '서비스 개선을 위한 데이터 분석 허용' },
        ])}

        {/* 데이터 관리 */}
        {renderSection('데이터 관리', 'folder', '#6E8CA0', [
          { category: 'data', key: 'saveSearchHistory', label: '검색 기록 저장', description: '검색 기록을 저장하여 추천에 활용' },
          { category: 'data', key: 'saveWatchHistory', label: '시청 기록 저장', description: '크리에이터 시청 기록 저장' },
          { category: 'data', key: 'personalizedAds', label: '맞춤 광고', description: '관심사 기반 맞춤 광고 표시' },
        ])}

        {/* 차단 관리 */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#F4433620' }]}>
              <Ionicons name="ban" size={18} color="#F0344B" />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>차단 관리</Text>
          </View>
          <View style={[styles.sectionContent, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleBlockedUsers}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionLabel, { color: theme.colors.textPrimary }]}>
                차단한 사용자 관리
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 데이터 삭제 */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#F4433620' }]}>
              <Ionicons name="trash" size={18} color="#F0344B" />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>데이터 삭제</Text>
          </View>
          <View style={[styles.sectionContent, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => handleDeleteData('search')}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionLabel, { color: theme.colors.textPrimary }]}>
                검색 기록 삭제
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => handleDeleteData('watch')}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionLabel, { color: theme.colors.textPrimary }]}>
                시청 기록 삭제
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => handleDeleteData('all')}
              activeOpacity={0.7}
            >
              <Text style={[styles.deleteLabel, { color: '#F0344B' }]}>
                모든 데이터 삭제
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#F0344B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 하단 여백 */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  sectionContent: {
    borderTopWidth: 1,
  },
  visibilityOptions: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
  },
  visibilityOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  visibilityLabel: {
    fontSize: 12,
    fontFamily: t.fonts.medium,
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: t.fonts.medium,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    marginTop: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionLabel: {
    fontSize: 15,
    fontFamily: t.fonts.medium,
    fontWeight: '500',
  },
  deleteLabel: {
    fontSize: 15,
    fontFamily: t.fonts.medium,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginLeft: 16,
  },
});
