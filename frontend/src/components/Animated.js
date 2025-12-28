import React, { useEffect, useRef } from 'react';
import { Animated as RNAnimated, View } from 'react-native';
import * as animations from '../utils/animations';

/**
 * FadeIn Component
 * Fades in content on mount
 */
export const FadeIn = ({ children, duration = 300, delay = 0, style }) => {
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      animations.fadeIn(fadeAnim, duration).start();
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  return (
    <RNAnimated.View style={[{ opacity: fadeAnim }, style]}>
      {children}
    </RNAnimated.View>
  );
};

/**
 * SlideIn Component
 * Slides in content from bottom on mount
 */
export const SlideIn = ({ children, duration = 300, delay = 0, style }) => {
  const slideAnim = useRef(new RNAnimated.Value(100)).current;
  const opacityAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      RNAnimated.parallel([
        animations.slideInFromBottom(slideAnim, duration, 0),
        animations.fadeIn(opacityAnim, duration),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  return (
    <RNAnimated.View
      style={[
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
        style,
      ]}
    >
      {children}
    </RNAnimated.View>
  );
};

/**
 * ScaleIn Component
 * Scales in content on mount
 */
export const ScaleIn = ({ children, duration = 200, delay = 0, style }) => {
  const scaleAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      animations.scale(scaleAnim, 1, duration).start();
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  return (
    <RNAnimated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      {children}
    </RNAnimated.View>
  );
};

/**
 * Pulse Component
 * Continuously pulses content
 */
export const Pulse = ({ children, style }) => {
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    const animation = animations.pulse(pulseAnim);
    animation.start();

    return () => animation.stop();
  }, []);

  return (
    <RNAnimated.View
      style={[
        {
          transform: [{ scale: pulseAnim }],
        },
        style,
      ]}
    >
      {children}
    </RNAnimated.View>
  );
};

/**
 * Rotate Component
 * Continuously rotates content
 */
export const Rotate = ({ children, style }) => {
  const rotateAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const animation = animations.rotate(rotateAnim);
    animation.start();

    return () => animation.stop();
  }, []);

  const rotation = animations.interpolateRotation(rotateAnim);

  return (
    <RNAnimated.View
      style={[
        {
          transform: [{ rotate: rotation }],
        },
        style,
      ]}
    >
      {children}
    </RNAnimated.View>
  );
};

/**
 * Shake Component (on demand)
 */
export const Shake = ({ children, trigger, style }) => {
  const shakeAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (trigger) {
      animations.shake(shakeAnim).start();
    }
  }, [trigger]);

  return (
    <RNAnimated.View
      style={[
        {
          transform: [{ translateX: shakeAnim }],
        },
        style,
      ]}
    >
      {children}
    </RNAnimated.View>
  );
};

/**
 * Stagger Component
 * Animates children with staggered delay
 */
export const Stagger = ({ children, staggerDelay = 100, animation = 'fadeIn' }) => {
  const childArray = React.Children.toArray(children);

  return (
    <>
      {childArray.map((child, index) => {
        const delay = index * staggerDelay;

        switch (animation) {
          case 'fadeIn':
            return (
              <FadeIn key={index} delay={delay}>
                {child}
              </FadeIn>
            );
          case 'slideIn':
            return (
              <SlideIn key={index} delay={delay}>
                {child}
              </SlideIn>
            );
          case 'scaleIn':
            return (
              <ScaleIn key={index} delay={delay}>
                {child}
              </ScaleIn>
            );
          default:
            return child;
        }
      })}
    </>
  );
};

/**
 * Skeleton Component
 * Animated loading skeleton
 */
export const Skeleton = ({ width, height, style }) => {
  const pulseAnim = useRef(new RNAnimated.Value(0.3)).current;

  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        RNAnimated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <RNAnimated.View
      style={[
        {
          width,
          height,
          backgroundColor: '#e0e0e0',
          borderRadius: 8,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
};

/**
 * Pressable with Scale Animation
 */
export const AnimatedPressable = ({ children, onPress, style }) => {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;

  const handlePressIn = () => {
    RNAnimated.spring(scaleAnim, {
      toValue: 0.95,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    RNAnimated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <RNAnimated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      <View
        onTouchStart={handlePressIn}
        onTouchEnd={handlePressOut}
        onPress={onPress}
      >
        {children}
      </View>
    </RNAnimated.View>
  );
};

export default {
  FadeIn,
  SlideIn,
  ScaleIn,
  Pulse,
  Rotate,
  Shake,
  Stagger,
  Skeleton,
  AnimatedPressable,
};
