import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const VARIANTS = {
  badge: { height: 24, paddingH: 10, fontSize: 11, iconSize: 12, borderRadius: 12 },
  chip: { height: 28, paddingH: 12, fontSize: 12, iconSize: 14, borderRadius: 14 },
  icon: { height: 20, paddingH: 6, fontSize: 10, iconSize: 10, borderRadius: 10 },
};

const STATUS_CONFIG = {
  unclaimed: {
    colors: ['#8B5CF6', '#A78BFA'],
    icon: '\uD83D\uDC7B',
    label: '\uAC00\uC0C1',
    textColor: '#FFFFFF',
  },
  claim_pending: {
    colors: ['#F59B00', '#FBBF4C'],
    icon: '\u23F3',
    label: '\uC2EC\uC0AC\uC911',
    textColor: '#FFFFFF',
  },
  claimed: {
    colors: ['#00B368', '#34D399'],
    icon: '\u2713',
    label: '\uC778\uC99D',
    textColor: '#FFFFFF',
  },
};

export default function VirtualCelebBadge({ virtualStatus = 'unclaimed', variant = 'badge', style }) {
  if (!virtualStatus || virtualStatus === 'none') return null;

  const config = STATUS_CONFIG[virtualStatus];
  if (!config) return null;

  const size = VARIANTS[variant] || VARIANTS.badge;

  // \uC778\uC218 \uC644\uB8CC \uD6C4 \uC778\uC99D \uBB38\uC790\uB85C \uC804\uD658
  if (virtualStatus === 'claimed') {
    return (
      <View style={[styles.verifiedBadge, { height: size.height, borderRadius: size.borderRadius, paddingHorizontal: size.paddingH }, style]}>
        <Text style={[styles.verifiedIcon, { fontSize: size.iconSize }]}>{config.icon}</Text>
        <Text style={[styles.verifiedText, { fontSize: size.fontSize }]}>{config.label}</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={config.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.gradientBadge,
        { height: size.height, borderRadius: size.borderRadius, paddingHorizontal: size.paddingH },
        style,
      ]}
    >
      <Text style={[styles.icon, { fontSize: size.iconSize }]}>{config.icon}</Text>
      <Text style={[styles.label, { fontSize: size.fontSize, color: config.textColor }]}>
        {config.label}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  icon: {
    color: '#FFFFFF',
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E7F8F0',
    borderWidth: 1,
    borderColor: '#5FD3A0',
    paddingHorizontal: 10,
    gap: 4,
  },
  verifiedIcon: {
    color: '#00915A',
    fontWeight: '700',
  },
  verifiedText: {
    color: '#00915A',
    fontWeight: '700',
  },
});
