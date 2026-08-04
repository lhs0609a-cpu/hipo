import React, { useState, useRef } from 'react';
import { getAppWidth, getAppHeight } from '../utils/appWidth';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const width = getAppWidth();
const height = getAppHeight();

const ONBOARDING_COMPLETED_KEY = '@hipo_onboarding_completed';

const onboardingData = [
  {
    id: '1',
    icon: '📈',
    title: '크리에이터에게 투자하세요',
    subtitle: 'HIPO는 좋아하는 크리에이터의\n주식을 사고팔 수 있는 플랫폼입니다',
    highlight: '새로운 방식의 팬 투자',
  },
  {
    id: '2',
    icon: '💰',
    title: '배당금을 받으세요',
    subtitle: '크리에이터가 성장하면\n주주인 당신도 함께 수익을 얻습니다',
    highlight: '크리에이터 성장 = 나의 수익',
  },
  {
    id: '3',
    icon: '🎯',
    title: '지금 시작하세요',
    subtitle: '신규 가입 시 웰컴 보너스로\n바로 투자를 시작할 수 있어요',
    highlight: '가입 즉시 투자 시작 가능',
  },
];

export default function OnboardingScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = async () => {
    if (currentIndex < onboardingData.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      await completeOnboarding();
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      navigation.replace('Login');
    } catch (error) {
      console.error('온보딩 완료 저장 실패:', error);
      navigation.replace('Login');
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const renderItem = ({ item, index }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.4, 1, 0.4],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.slide}>
        <Animated.View style={[styles.iconContainer, { transform: [{ scale }], opacity }]}>
          <Text style={styles.icon}>{item.icon}</Text>
        </Animated.View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
          <View style={styles.highlightContainer}>
            <Text style={styles.highlight}>{item.highlight}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {onboardingData.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
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
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  const isLastSlide = currentIndex === onboardingData.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#F8F9FB', '#EEF4FF', '#DBE7FE']}
        style={styles.gradient}
      >
        {/* Skip 버튼 */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>HIPO</Text>
          </View>
          {!isLastSlide && (
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>건너뛰기</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 슬라이드 */}
        <Animated.FlatList
          ref={flatListRef}
          data={onboardingData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          scrollEventThrottle={16}
        />

        {/* 하단 컨트롤 */}
        <View style={styles.footer}>
          {renderDots()}

          <TouchableOpacity
            style={[
              styles.nextButton,
              isLastSlide && styles.startButton,
            ]}
            onPress={handleNext}
          >
            <LinearGradient
              colors={isLastSlide ? ['#2B5FE3', '#1E4BC7'] : ['#2B5FE3', '#6248E8']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.nextButtonText}>
                {isLastSlide ? '시작하기' : '다음'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {isLastSlide && (
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>시작하기를 누르면 </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
                <Text style={styles.termsLink}>이용약관</Text>
              </TouchableOpacity>
              <Text style={styles.termsText}> 및 </Text>
              <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
                <Text style={styles.termsLink}>개인정보처리방침</Text>
              </TouchableOpacity>
              <Text style={styles.termsText}>에 동의하게 됩니다</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.primary,
    letterSpacing: -0.5,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 15,
    fontFamily: t.fonts.medium,
    color: t.colors.textSecondary,
    fontWeight: '500',
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: t.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
    shadowColor: t.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  icon: {
    fontSize: 72,
    fontFamily: t.fonts.regular,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 20,
  },
  highlightContainer: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  highlight: {
    fontSize: 14,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.primary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: t.colors.primary,
    marginHorizontal: 4,
  },
  nextButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  startButton: {
    // 시작 버튼 추가 스타일
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 17,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.surface,
  },
  termsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textDisabled,
    lineHeight: 18,
  },
  termsLink: {
    fontSize: 12,
    fontFamily: t.fonts.semibold,
    color: t.colors.primary,
    fontWeight: '600',
    lineHeight: 18,
    textDecorationLine: 'underline',
  },
});
