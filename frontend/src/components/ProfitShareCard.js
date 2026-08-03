import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';

/**
 * 수익 공유/인증 카드 컴포넌트
 * 사용자가 투자 수익을 SNS에 공유하여 신규 유저를 유치할 수 있는 카드
 */
const ProfitShareCard = ({
  totalProfit,
  profitRate,
  topHolding,
  totalDividend,
  period,
  username,
  onShare,
}) => {
  const isPositive = totalProfit >= 0;

  const gradientColors = isPositive
    ? ['#8B5CF6', '#2B5FE3']
    : ['#F0344B', '#E85D2A'];

  const formatNumber = (num) => {
    if (num == null) return '0';
    return Math.abs(num).toLocaleString();
  };

  const formatProfitRate = (rate) => {
    if (rate == null) return '+0.00%';
    const sign = rate >= 0 ? '+' : '';
    return `${sign}${rate.toFixed(2)}%`;
  };

  const handleShare = async () => {
    const sign = profitRate >= 0 ? '+' : '';
    const shareText =
      `HIPO에서 ${period} 수익률 ${sign}${profitRate?.toFixed(2) ?? '0.00'}% 달성! \u{1F4B0}\n` +
      `배당금만 ${formatNumber(totalDividend)} PO 받았어요.\n` +
      `크리에이터 주식 투자, 지금 시작해보세요!\n` +
      `https://hipo.app/invite/${username}`;

    if (Platform.OS === 'web') {
      try {
        window.alert(shareText);
      } catch (e) {
        // silent fallback
      }
    } else {
      try {
        const result = await Share.share({
          message: shareText,
        });

        if (result.action === Share.sharedAction) {
          if (onShare) {
            onShare(result);
          }
        }
      } catch (error) {
        Alert.alert('공유 실패', '공유 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <View style={styles.cardContainer}>
      {/* 상단 그라데이션 헤더 */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>HIPO 투자 성적표</Text>
          <View style={styles.periodBadge}>
            <Text style={styles.periodText}>{period}</Text>
          </View>
        </View>

        {/* 사용자 정보 */}
        <View style={styles.userRow}>
          <Text style={styles.username}>{username}</Text>
          <Ionicons name="checkmark-circle" size={16} color="#5E93F7" />
        </View>
      </LinearGradient>

      {/* 카드 본문 */}
      <View style={styles.bodyContainer}>
        {/* 수익 금액 */}
        <View style={styles.profitSection}>
          <Text
            style={[
              styles.profitAmount,
              { color: isPositive ? '#00B368' : '#F0344B' },
            ]}
          >
            {isPositive ? '+' : '-'}
            {formatNumber(totalProfit)} PO
          </Text>
          <Text
            style={[
              styles.profitRateText,
              { color: isPositive ? '#00B368' : '#F0344B' },
            ]}
          >
            {formatProfitRate(profitRate)}
          </Text>
        </View>

        {/* 구분선 */}
        <View style={styles.divider} />

        {/* 최고 수익 종목 */}
        {topHolding && (
          <View style={styles.detailRow}>
            <Ionicons name="trophy-outline" size={18} color={COLORS.warning} />
            <Text style={styles.detailLabel}>최고 수익 종목</Text>
            <View style={styles.detailValueContainer}>
              <Text style={styles.detailName} numberOfLines={1}>
                {topHolding.name}
              </Text>
              <Text
                style={[
                  styles.detailProfit,
                  {
                    color:
                      (topHolding.profitRate ?? 0) >= 0
                        ? '#00B368'
                        : '#F0344B',
                  },
                ]}
              >
                {(topHolding.profitRate ?? 0) >= 0 ? '+' : ''}
                {topHolding.profitRate?.toFixed(2) ?? '0.00'}%
              </Text>
            </View>
          </View>
        )}

        {/* 누적 배당금 */}
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={18} color={COLORS.success} />
          <Text style={styles.detailLabel}>누적 배당금</Text>
          <Text style={styles.detailValue}>
            {formatNumber(totalDividend)} PO
          </Text>
        </View>

        {/* 구분선 */}
        <View style={styles.divider} />

        {/* 하단 브랜딩 */}
        <View style={styles.brandingSection}>
          <View style={styles.brandRow}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>H</Text>
            </View>
            <View style={styles.brandTextContainer}>
              <Text style={styles.brandName}>HIPO</Text>
              <Text style={styles.brandTagline}>크리에이터 주식 투자 플랫폼</Text>
            </View>
          </View>
          <Text style={styles.ctaText}>지금 시작하기</Text>
        </View>
      </View>

      {/* 워터마크 */}
      <View style={styles.watermarkContainer} pointerEvents="none">
        <Text style={styles.watermarkText}>HIPO</Text>
      </View>

      {/* 공유 버튼 */}
      <TouchableOpacity
        style={styles.shareButton}
        onPress={handleShare}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#8B5CF6', '#2B5FE3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shareButtonGradient}
        >
          <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
          <Text style={styles.shareButtonText}>공유하기</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: 300,
    alignSelf: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: 'hidden',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  // Header gradient
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  periodBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  // Body
  bodyContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  profitSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profitAmount: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  profitRateText: {
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 14,
  },
  // Detail rows
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  detailValueContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
  },
  detailName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    maxWidth: 80,
  },
  detailProfit: {
    fontSize: 13,
    fontWeight: '700',
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'right',
  },
  // Branding
  brandingSection: {
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  logoContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  brandTextContainer: {
    alignItems: 'flex-start',
  },
  brandName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 1,
  },
  brandTagline: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 1,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
    marginTop: 4,
  },
  // Watermark
  watermarkContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    transform: [{ translateY: -20 }],
  },
  watermarkText: {
    fontSize: 72,
    fontWeight: '900',
    color: 'rgba(0, 0, 0, 0.03)',
    letterSpacing: 8,
  },
  // Share button
  shareButton: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 20,
    borderRadius: 14,
    overflow: 'hidden',
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ProfitShareCard;
