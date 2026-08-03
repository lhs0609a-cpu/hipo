import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const BADGE_CONFIG = {
  unclaimed: {
    label: '사전상장',
    backgroundColor: '#FFF6E6',
    textColor: '#B26F00',
    borderColor: '#FBBF4C',
  },
  claim_pending: {
    label: '인수 심사중',
    backgroundColor: '#FFF6E6',
    textColor: '#B26F00',
    borderColor: '#FBBF4C',
  },
  claimed: {
    label: '본인 인증',
    backgroundColor: '#E7F8F0',
    textColor: '#00915A',
    borderColor: '#5FD3A0',
  },
};

export default function VirtualStatusBadge({ virtualStatus, size = 'medium', style }) {
  if (!virtualStatus || virtualStatus === 'none') return null;

  const config = BADGE_CONFIG[virtualStatus];
  if (!config) return null;

  const isSmall = size === 'small';

  return (
    <View style={[
      styles.badge,
      {
        backgroundColor: config.backgroundColor,
        borderColor: config.borderColor,
        paddingHorizontal: isSmall ? 6 : 8,
        paddingVertical: isSmall ? 2 : 4,
      },
      style,
    ]}>
      <Text style={[
        styles.text,
        {
          color: config.textColor,
          fontSize: isSmall ? 10 : 12,
        },
      ]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '700',
  },
});
