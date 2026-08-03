import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// 신뢰등급 설정
const TRUST_LEVELS = {
  bronze: {
    label: 'Bronze',
    labelKo: '브론즈',
    icon: 'shield-outline',
    colors: ['#B87333', '#8A5626'],
    textColor: '#FFFFFF',
    multiplier: '0.3x',
    rank: 1,
  },
  silver: {
    label: 'Silver',
    labelKo: '실버',
    icon: 'shield-half-outline',
    colors: ['#9BA3AF', '#A3ABBA'],
    textColor: '#2E3542',
    multiplier: '0.5x',
    rank: 2,
  },
  gold: {
    label: 'Gold',
    labelKo: '골드',
    icon: 'shield',
    colors: ['#D9A521', '#F59B00'],
    textColor: '#2E3542',
    multiplier: '0.7x',
    rank: 3,
  },
  platinum: {
    label: 'Platinum',
    labelKo: '플래티넘',
    icon: 'shield-checkmark-outline',
    colors: ['#6E8CA0', '#A3ABBA'],
    textColor: '#2E3542',
    multiplier: '1.0x',
    rank: 4,
  },
  diamond: {
    label: 'Diamond',
    labelKo: '다이아몬드',
    icon: 'diamond-outline',
    colors: ['#3FB6C9', '#91B8FB'],
    textColor: '#193CA0',
    multiplier: '1.3x',
    rank: 5,
  },
  master: {
    label: 'Master',
    labelKo: '마스터',
    icon: 'trophy-outline',
    colors: ['#F0344B', '#F0344B'],
    textColor: '#FFFFFF',
    multiplier: '1.5x',
    rank: 6,
  },
  legend: {
    label: 'Legend',
    labelKo: '레전드',
    icon: 'star',
    colors: ['#8B5CF6', '#8B5CF6'],
    textColor: '#FFFFFF',
    multiplier: '2.0x',
    rank: 7,
  },
};

/**
 * 신뢰등급 뱃지 컴포넌트
 * @param {string} level - 신뢰등급 (bronze, silver, gold, platinum, diamond, master, legend)
 * @param {string} size - 크기 (small, medium, large)
 * @param {boolean} showLabel - 라벨 표시 여부
 * @param {boolean} showMultiplier - 배수 표시 여부
 * @param {string} variant - 스타일 변형 (badge, chip, icon)
 */
const TrustBadge = ({
  level = 'bronze',
  size = 'medium',
  showLabel = true,
  showMultiplier = false,
  variant = 'badge',
  style,
}) => {
  const config = TRUST_LEVELS[level?.toLowerCase()] || TRUST_LEVELS.bronze;

  // 크기별 설정
  const sizeConfig = {
    small: { icon: 12, fontSize: 10, padding: 4, height: 20 },
    medium: { icon: 16, fontSize: 12, padding: 6, height: 26 },
    large: { icon: 20, fontSize: 14, padding: 8, height: 32 },
  };

  const sizes = sizeConfig[size] || sizeConfig.medium;

  // 아이콘만 표시
  if (variant === 'icon') {
    return (
      <View style={[styles.iconOnly, style]}>
        <LinearGradient
          colors={config.colors}
          style={[
            styles.iconContainer,
            { width: sizes.height, height: sizes.height, borderRadius: sizes.height / 2 },
          ]}
        >
          <Ionicons name={config.icon} size={sizes.icon} color={config.textColor} />
        </LinearGradient>
      </View>
    );
  }

  // 칩 스타일
  if (variant === 'chip') {
    return (
      <LinearGradient
        colors={config.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.chip,
          { paddingHorizontal: sizes.padding * 1.5, paddingVertical: sizes.padding / 2 },
          style,
        ]}
      >
        <Ionicons
          name={config.icon}
          size={sizes.icon}
          color={config.textColor}
          style={{ marginRight: 4 }}
        />
        <Text style={[styles.chipText, { fontSize: sizes.fontSize, color: config.textColor }]}>
          {config.labelKo}
        </Text>
      </LinearGradient>
    );
  }

  // 기본 뱃지 스타일
  return (
    <LinearGradient
      colors={config.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.badge,
        {
          paddingHorizontal: sizes.padding * 1.5,
          paddingVertical: sizes.padding,
          borderRadius: sizes.height / 2,
        },
        style,
      ]}
    >
      <Ionicons
        name={config.icon}
        size={sizes.icon}
        color={config.textColor}
        style={showLabel ? { marginRight: 4 } : {}}
      />
      {showLabel && (
        <Text style={[styles.label, { fontSize: sizes.fontSize, color: config.textColor }]}>
          {config.labelKo}
        </Text>
      )}
      {showMultiplier && (
        <Text
          style={[
            styles.multiplier,
            { fontSize: sizes.fontSize - 2, color: config.textColor, marginLeft: 4 },
          ]}
        >
          {config.multiplier}
        </Text>
      )}
    </LinearGradient>
  );
};

/**
 * 신뢰등급 진행 바
 */
export const TrustProgressBar = ({ currentLevel = 'bronze', progress = 0, style }) => {
  const config = TRUST_LEVELS[currentLevel?.toLowerCase()] || TRUST_LEVELS.bronze;
  const levels = Object.keys(TRUST_LEVELS);
  const currentIndex = levels.indexOf(currentLevel?.toLowerCase());
  const nextLevel = currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;

  return (
    <View style={[styles.progressContainer, style]}>
      <View style={styles.progressHeader}>
        <TrustBadge level={currentLevel} size="small" />
        {nextLevel && (
          <>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <LinearGradient
                  colors={config.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressBarFill, { width: `${progress}%` }]}
                />
              </View>
            </View>
            <TrustBadge level={nextLevel} size="small" variant="icon" />
          </>
        )}
      </View>
      {nextLevel && (
        <Text style={styles.progressText}>
          다음 등급까지 {100 - progress}% 남음
        </Text>
      )}
    </View>
  );
};

/**
 * 모든 신뢰등급 표시
 */
export const TrustLevelList = ({ currentLevel = 'bronze', style }) => {
  const levels = Object.entries(TRUST_LEVELS);

  return (
    <View style={[styles.levelList, style]}>
      {levels.map(([key, config]) => {
        const isActive = key === currentLevel?.toLowerCase();
        const isPassed = config.rank < (TRUST_LEVELS[currentLevel?.toLowerCase()]?.rank || 1);

        return (
          <View
            key={key}
            style={[
              styles.levelItem,
              isActive && styles.levelItemActive,
              isPassed && styles.levelItemPassed,
            ]}
          >
            <TrustBadge level={key} size="small" showLabel={false} />
            <Text
              style={[
                styles.levelItemText,
                isActive && styles.levelItemTextActive,
                isPassed && styles.levelItemTextPassed,
              ]}
            >
              {config.labelKo}
            </Text>
            <Text style={styles.levelMultiplier}>{config.multiplier}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '600',
  },
  multiplier: {
    fontWeight: '500',
    opacity: 0.9,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontWeight: '600',
  },
  iconOnly: {},
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Progress bar styles
  progressContainer: {
    width: '100%',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#DFE3EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#7C8698',
    textAlign: 'center',
    marginTop: 8,
  },
  // Level list styles
  levelList: {
    gap: 8,
  },
  levelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FB',
    borderRadius: 10,
    opacity: 0.6,
  },
  levelItemActive: {
    backgroundColor: '#EEF4FF',
    opacity: 1,
    borderWidth: 1,
    borderColor: '#2B5FE3',
  },
  levelItemPassed: {
    opacity: 0.8,
  },
  levelItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#5D6779',
    marginLeft: 10,
  },
  levelItemTextActive: {
    color: '#2B5FE3',
    fontWeight: '600',
  },
  levelItemTextPassed: {
    color: '#1A1F29',
  },
  levelMultiplier: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C8698',
  },
});

export default TrustBadge;
