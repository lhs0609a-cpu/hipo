import { Animated, Easing } from 'react-native';

/**
 * Animation Utilities
 *
 * Pre-configured animations for common UI patterns
 */

/**
 * Fade In Animation
 */
export const fadeIn = (animatedValue, duration = 300, toValue = 1) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: Easing.out(Easing.ease),
    useNativeDriver: true,
  });
};

/**
 * Fade Out Animation
 */
export const fadeOut = (animatedValue, duration = 300, toValue = 0) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: Easing.in(Easing.ease),
    useNativeDriver: true,
  });
};

/**
 * Slide In From Bottom
 */
export const slideInFromBottom = (animatedValue, duration = 300, toValue = 0) => {
  return Animated.spring(animatedValue, {
    toValue,
    duration,
    friction: 8,
    tension: 40,
    useNativeDriver: true,
  });
};

/**
 * Slide Out To Bottom
 */
export const slideOutToBottom = (animatedValue, duration = 300, toValue = 500) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: Easing.in(Easing.ease),
    useNativeDriver: true,
  });
};

/**
 * Scale Animation
 */
export const scale = (animatedValue, toValue = 1, duration = 200) => {
  return Animated.spring(animatedValue, {
    toValue,
    duration,
    friction: 5,
    useNativeDriver: true,
  });
};

/**
 * Bounce Animation
 */
export const bounce = (animatedValue, toValue = 1) => {
  return Animated.spring(animatedValue, {
    toValue,
    friction: 3,
    tension: 40,
    useNativeDriver: true,
  });
};

/**
 * Shake Animation
 */
export const shake = (animatedValue) => {
  return Animated.sequence([
    Animated.timing(animatedValue, { toValue: 10, duration: 50, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: -10, duration: 50, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: 10, duration: 50, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: -10, duration: 50, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: 0, duration: 50, useNativeDriver: true }),
  ]);
};

/**
 * Pulse Animation (continuous)
 */
export const pulse = (animatedValue) => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1.1,
        duration: 500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ])
  );
};

/**
 * Rotate Animation (continuous)
 */
export const rotate = (animatedValue) => {
  return Animated.loop(
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    })
  );
};

/**
 * Stagger Animation
 * Animate multiple items with a delay between each
 */
export const stagger = (animations, delay = 100) => {
  return Animated.stagger(delay, animations);
};

/**
 * Parallel Animation
 * Run multiple animations at the same time
 */
export const parallel = (animations) => {
  return Animated.parallel(animations);
};

/**
 * Sequence Animation
 * Run animations one after another
 */
export const sequence = (animations) => {
  return Animated.sequence(animations);
};

/**
 * Create a spring animation config
 */
export const springConfig = (friction = 7, tension = 40) => ({
  friction,
  tension,
  useNativeDriver: true,
});

/**
 * Create a timing animation config
 */
export const timingConfig = (duration = 300, easing = Easing.out(Easing.ease)) => ({
  duration,
  easing,
  useNativeDriver: true,
});

/**
 * Interpolate rotation
 */
export const interpolateRotation = (animatedValue) => {
  return animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
};

/**
 * Interpolate color (example: for background color changes)
 */
export const interpolateColor = (animatedValue, colors) => {
  return animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: colors,
  });
};

export default {
  fadeIn,
  fadeOut,
  slideInFromBottom,
  slideOutToBottom,
  scale,
  bounce,
  shake,
  pulse,
  rotate,
  stagger,
  parallel,
  sequence,
  springConfig,
  timingConfig,
  interpolateRotation,
  interpolateColor,
};
