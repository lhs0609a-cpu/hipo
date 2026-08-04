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

const NOTIFICATION_SETTINGS_KEY = '@notification_settings';

const DEFAULT_SETTINGS = {
  // 거래 알림
  trade: {
    enabled: true,
    buyComplete: true,
    sellComplete: true,
    orderFilled: true,
    orderCancelled: true,
  },
  // 가격 알림
  price: {
    enabled: true,
    targetPrice: true,
    priceChange: true,
    threshold: 5, // 5% 변동시 알림
  },
  // 배당 알림
  dividend: {
    enabled: true,
    dividendReceived: true,
    dividendAnnouncement: true,
  },
  // 소셜 알림
  social: {
    enabled: true,
    newFollower: true,
    likes: true,
    comments: true,
    mentions: true,
  },
  // 마케팅 알림
  marketing: {
    enabled: false,
    events: false,
    promotions: false,
    newsletter: false,
  },
  // 시스템 알림
  system: {
    enabled: true,
    security: true,
    updates: true,
    maintenance: true,
  },
};

export default function NotificationSettingsScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
    } catch (error) {
      console.error('알림 설정 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('알림 설정 저장 실패:', error);
    }
  };

  const toggleCategory = (category) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        enabled: !settings[category].enabled,
      },
    };
    saveSettings(newSettings);
  };

  const toggleSubSetting = (category, key) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [key]: !settings[category][key],
      },
    };
    saveSettings(newSettings);
  };

  const handlePriceThreshold = () => {
    const thresholds = [1, 3, 5, 10, 15, 20];
    if (Platform.OS === 'web') {
      const result = window.prompt('가격 변동 알림 기준 (%):', settings.price.threshold.toString());
      if (result) {
        const value = parseInt(result);
        if (value >= 1 && value <= 50) {
          const newSettings = {
            ...settings,
            price: { ...settings.price, threshold: value },
          };
          saveSettings(newSettings);
        }
      }
    } else {
      Alert.alert(
        '가격 변동 알림 기준',
        '몇 % 이상 변동 시 알림을 받으시겠습니까?',
        thresholds.map((t) => ({
          text: `${t}%`,
          onPress: () => {
            const newSettings = {
              ...settings,
              price: { ...settings.price, threshold: t },
            };
            saveSettings(newSettings);
          },
        }))
      );
    }
  };

  const renderSettingItem = (label, value, onToggle, disabled = false, description = null) => (
    <View style={[styles.settingItem, disabled && styles.settingItemDisabled]}>
      <View style={styles.settingTextContainer}>
        <Text style={[styles.settingLabel, { color: disabled ? theme.colors.textTertiary : theme.colors.textPrimary }]}>
          {label}
        </Text>
        {description && (
          <Text style={[styles.settingDescription, { color: theme.colors.textTertiary }]}>
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
        thumbColor={value ? theme.colors.primary : theme.colors.gray300}
      />
    </View>
  );

  const renderCategory = (title, icon, iconColor, category, items) => {
    const categoryEnabled = settings[category]?.enabled;

    return (
      <View style={[styles.categoryContainer, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => toggleCategory(category)}
          activeOpacity={0.7}
        >
          <View style={[styles.categoryIcon, { backgroundColor: iconColor + '20' }]}>
            <Ionicons name={icon} size={20} color={iconColor} />
          </View>
          <Text style={[styles.categoryTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
          <Switch
            value={categoryEnabled}
            onValueChange={() => toggleCategory(category)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
            thumbColor={categoryEnabled ? theme.colors.primary : theme.colors.gray300}
          />
        </TouchableOpacity>

        {categoryEnabled && (
          <View style={[styles.subSettings, { borderTopColor: theme.colors.border }]}>
            {items.map((item, index) => (
              <View key={item.key}>
                {renderSettingItem(
                  item.label,
                  settings[category]?.[item.key],
                  () => toggleSubSetting(category, item.key),
                  !categoryEnabled,
                  item.description
                )}
                {index < items.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

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
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>알림 설정</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 안내 문구 */}
        <View style={[styles.infoBox, { backgroundColor: theme.colors.primaryBackground }]}>
          <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
          <Text style={[styles.infoText, { color: theme.colors.primary }]}>
            카테고리별로 알림을 관리할 수 있습니다.{'\n'}
            중요한 거래 및 보안 알림은 항상 수신됩니다.
          </Text>
        </View>

        {/* 거래 알림 */}
        {renderCategory('거래 알림', 'swap-horizontal', '#00B368', 'trade', [
          { key: 'buyComplete', label: '매수 체결', description: '주문한 매수가 완료되면 알림' },
          { key: 'sellComplete', label: '매도 체결', description: '주문한 매도가 완료되면 알림' },
          { key: 'orderFilled', label: '주문 체결', description: '지정가 주문이 체결되면 알림' },
          { key: 'orderCancelled', label: '주문 취소', description: '주문이 취소되면 알림' },
        ])}

        {/* 가격 알림 */}
        <View style={[styles.categoryContainer, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            style={styles.categoryHeader}
            onPress={() => toggleCategory('price')}
            activeOpacity={0.7}
          >
            <View style={[styles.categoryIcon, { backgroundColor: '#FF980020' }]}>
              <Ionicons name="trending-up" size={20} color="#F59B00" />
            </View>
            <Text style={[styles.categoryTitle, { color: theme.colors.textPrimary }]}>가격 알림</Text>
            <Switch
              value={settings.price?.enabled}
              onValueChange={() => toggleCategory('price')}
              trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
              thumbColor={settings.price?.enabled ? theme.colors.primary : theme.colors.gray300}
            />
          </TouchableOpacity>

          {settings.price?.enabled && (
            <View style={[styles.subSettings, { borderTopColor: theme.colors.border }]}>
              {/* 가격 알림 설정 바로가기 */}
              <TouchableOpacity
                style={styles.priceAlertLink}
                onPress={() => navigation.navigate('PriceAlert')}
                activeOpacity={0.7}
              >
                <View style={[styles.priceAlertLinkIcon, { backgroundColor: theme.colors.primaryBackground }]}>
                  <Ionicons name="notifications" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingLabel, { color: theme.colors.primary }]}>
                    가격 알림 설정
                  </Text>
                  <Text style={[styles.settingDescription, { color: theme.colors.textTertiary }]}>
                    종목별 목표가, 급등락 알림 관리
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              {renderSettingItem(
                '목표가 도달',
                settings.price?.targetPrice,
                () => toggleSubSetting('price', 'targetPrice'),
                false,
                '설정한 목표 가격에 도달하면 알림'
              )}
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              {renderSettingItem(
                '급등락 알림',
                settings.price?.priceChange,
                () => toggleSubSetting('price', 'priceChange'),
                false,
                '보유 종목이 급등/급락하면 알림'
              )}
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              <TouchableOpacity
                style={styles.settingItem}
                onPress={handlePriceThreshold}
                activeOpacity={0.7}
              >
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                    변동 알림 기준
                  </Text>
                  <Text style={[styles.settingDescription, { color: theme.colors.textTertiary }]}>
                    이 비율 이상 변동 시 알림을 받습니다
                  </Text>
                </View>
                <View style={styles.thresholdValue}>
                  <Text style={[styles.thresholdText, { color: theme.colors.primary }]}>
                    {settings.price?.threshold}%
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 배당 알림 */}
        {renderCategory('배당 알림', 'cash', '#8B5CF6', 'dividend', [
          { key: 'dividendReceived', label: '배당금 수령', description: '배당금이 입금되면 알림' },
          { key: 'dividendAnnouncement', label: '배당 공시', description: '보유 종목 배당 일정 안내' },
        ])}

        {/* 소셜 알림 */}
        {renderCategory('소셜 알림', 'people', '#2B5FE3', 'social', [
          { key: 'newFollower', label: '새 팔로워', description: '새로운 팔로워가 생기면 알림' },
          { key: 'likes', label: '좋아요', description: '내 게시물에 좋아요가 달리면 알림' },
          { key: 'comments', label: '댓글', description: '내 게시물에 댓글이 달리면 알림' },
          { key: 'mentions', label: '멘션', description: '다른 사용자가 나를 멘션하면 알림' },
        ])}

        {/* 마케팅 알림 */}
        {renderCategory('마케팅 알림', 'megaphone', '#EC5F9E', 'marketing', [
          { key: 'events', label: '이벤트', description: '새로운 이벤트 및 프로모션 안내' },
          { key: 'promotions', label: '특별 혜택', description: '한정 혜택 및 할인 정보' },
          { key: 'newsletter', label: '뉴스레터', description: '주간 투자 뉴스레터 수신' },
        ])}

        {/* 시스템 알림 */}
        {renderCategory('시스템 알림', 'settings', '#6E8CA0', 'system', [
          { key: 'security', label: '보안 알림', description: '로그인, 비밀번호 변경 등 보안 관련' },
          { key: 'updates', label: '앱 업데이트', description: '새로운 기능 및 업데이트 안내' },
          { key: 'maintenance', label: '점검 안내', description: '서비스 점검 일정 안내' },
        ])}

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
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    margin: 16,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: t.fonts.regular,
    lineHeight: 18,
  },
  categoryContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  subSettings: {
    borderTopWidth: 1,
    paddingTop: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingItemDisabled: {
    opacity: 0.5,
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
  divider: {
    height: 1,
    marginLeft: 16,
  },
  thresholdValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  thresholdText: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  priceAlertLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  priceAlertLinkIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
});
