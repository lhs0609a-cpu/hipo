import React, { useState, useRef } from 'react';
import { getAppWidth, getAppHeight } from '../utils/appWidth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = getAppWidth();
const SCREEN_HEIGHT = getAppHeight();
const TUTORIAL_COMPLETED_KEY = '@tutorial_completed';

const TUTORIAL_SLIDES = [
  {
    id: '1',
    icon: 'trending-up',
    iconColor: '#00B368',
    title: '크리에이터 주식 투자',
    subtitle: '좋아하는 크리에이터에 투자하세요',
    description: 'HIPO에서는 유명 크리에이터, 인플루언서,\n아티스트의 주식을 사고팔 수 있습니다.',
    gradient: ['#00B368', '#5FD3A0'],
  },
  {
    id: '2',
    icon: 'cash',
    iconColor: '#F59B00',
    title: '배당금 수익',
    subtitle: '투자 수익을 실현하세요',
    description: '보유한 주식에서 정기적으로 배당금이\n지급됩니다. 투자 성과를 함께 나누세요.',
    gradient: ['#F59B00', '#FBBF4C'],
  },
  {
    id: '3',
    icon: 'people',
    iconColor: '#2B5FE3',
    title: '주주 커뮤니티',
    subtitle: '팬들과 소통하세요',
    description: '같은 크리에이터에 투자한 주주들과\n소통하고 특별한 혜택을 받으세요.',
    gradient: ['#2B5FE3', '#5E93F7'],
  },
  {
    id: '4',
    icon: 'shield-checkmark',
    iconColor: '#8B5CF6',
    title: '신뢰도 시스템',
    subtitle: '활발한 활동으로 레벨업하세요',
    description: '신뢰도가 높아질수록 더 많은 혜택을\n받을 수 있습니다. 지금 시작하세요!',
    gradient: ['#8B5CF6', '#A78BFA'],
  },
];

export default function TutorialScreen({ navigation, route }) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // 튜토리얼 완료 후 이동할 화면 (기본값: Home)
  const nextScreen = route?.params?.nextScreen || 'MainTabs';

  const handleNext = () => {
    if (currentIndex < TUTORIAL_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      completeTutorial();
    }
  };

  const handleSkip = () => {
    completeTutorial();
  };

  const completeTutorial = async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
      navigation.replace(nextScreen);
    } catch (error) {
      console.error('튜토리얼 완료 저장 실패:', error);
      navigation.replace(nextScreen);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderSlide = ({ item, index }) => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.5, 1, 0.5],
      extrapolate: 'clamp',
    });

    return (
      <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
        <Animated.View style={[styles.slideContent, { opacity, transform: [{ scale }] }]}>
          {/* 아이콘 영역 */}
          <LinearGradient
            colors={item.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconContainer}
          >
            <View style={styles.iconInner}>
              <Ionicons name={item.icon} size={60} color="#fff" />
            </View>
            {/* 데코레이션 원 */}
            <View style={[styles.decorCircle, styles.decorCircle1]} />
            <View style={[styles.decorCircle, styles.decorCircle2]} />
            <View style={[styles.decorCircle, styles.decorCircle3]} />
          </LinearGradient>

          {/* 텍스트 영역 */}
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              {item.title}
            </Text>
            <Text style={[styles.subtitle, { color: item.iconColor }]}>
              {item.subtitle}
            </Text>
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              {item.description}
            </Text>
          </View>
        </Animated.View>
      </View>
    );
  };

  const renderPagination = () => {
    return (
      <View style={styles.pagination}>
        {TUTORIAL_SLIDES.map((_, index) => {
          const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity,
                  backgroundColor: theme.colors.primary,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  const isLastSlide = currentIndex === TUTORIAL_SLIDES.length - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top }, { backgroundColor: theme.colors.background }]}>
      {/* 건너뛰기 버튼 */}
      {!isLastSlide && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={[styles.skipText, { color: theme.colors.textSecondary }]}>
            건너뛰기
          </Text>
        </TouchableOpacity>
      )}

      {/* 슬라이드 */}
      <FlatList
        ref={flatListRef}
        data={TUTORIAL_SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
      />

      {/* 페이지네이션 */}
      {renderPagination()}

      {/* 버튼 영역 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {isLastSlide ? '시작하기' : '다음'}
          </Text>
          {!isLastSlide && (
            <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
          )}
        </TouchableOpacity>

        {/* 로그인/회원가입 안내 (마지막 슬라이드) */}
        {isLastSlide && (
          <View style={styles.authHint}>
            <Text style={[styles.authHintText, { color: theme.colors.textTertiary }]}>
              계정이 있으신가요?
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.authHintLink, { color: theme.colors.primary }]}>
                로그인
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 15,
    fontFamily: t.fonts.medium,
    fontWeight: '500',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  slideContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
    overflow: 'hidden',
  },
  iconInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  decorCircle1: {
    width: 40,
    height: 40,
    top: 20,
    right: 20,
  },
  decorCircle2: {
    width: 20,
    height: 20,
    bottom: 30,
    left: 25,
  },
  decorCircle3: {
    width: 30,
    height: 30,
    top: 40,
    left: 10,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: t.fonts.bold,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 15,
    fontFamily: t.fonts.regular,
    lineHeight: 24,
    textAlign: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  buttonContainer: {
    paddingHorizontal: 40,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    alignItems: 'center',
  },
  nextButton: {
    flexDirection: 'row',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    color: t.colors.surface,
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
  authHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 6,
  },
  authHintText: {
    fontSize: 14,
    fontFamily: t.fonts.regular,
  },
  authHintLink: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
  },
});
