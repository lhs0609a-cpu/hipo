import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Share,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { copyText } from '../utils/clipboard';
import { stockUrl, postUrl, homeUrl, inviteUrl } from '../utils/shareLinks';
import { COLORS } from '../constants/colors';

/**
 * 소셜 공유 모달 컴포넌트
 */

const SHARE_OPTIONS = [
  { key: 'copy', label: '링크 복사', icon: 'copy-outline', color: COLORS.textSecondary },
  { key: 'share', label: '공유하기', icon: 'share-social-outline', color: COLORS.primary },
  { key: 'twitter', label: 'Twitter', icon: 'logo-twitter', color: '#1DA1F2' },
  { key: 'facebook', label: 'Facebook', icon: 'logo-facebook', color: '#4267B2' },
];

const ShareModal = ({
  visible,
  onClose,
  shareType = 'stock', // 'stock' | 'portfolio' | 'post' | 'achievement' | 'shareholder' | 'creator'
  data = {},
  /** 공유하는 사람의 추천 코드. 링크에 붙어 유입 추적에 쓰인다. */
  referralCode,
}) => {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  /**
   * 공유 메시지 생성.
   *
   * 링크는 전부 utils/shareLinks 를 거친다. 예전에는 여기서 `https://hipo.kr` 을
   * 직접 조립했는데, 앱이 받는 도메인은 hipo.app 이라 공유 링크를 눌러도
   * 앱이 열리지 않았다.
   */
  const getShareContent = () => {
    // 백엔드 카드에 추천 코드가 실려 오면 그것을 우선 사용
    const ref = referralCode || data.shareData?.referralCode || null;

    switch (shareType) {
      // 주주 인증 카드: 백엔드 getShareCard('shareholder')가 만든 메시지/URL 사용
      case 'shareholder': {
        const sd = data.shareData || {};
        return {
          title: `${sd.issuerName || '크리에이터'}의 주주`,
          message:
            data.shareMessage ||
            `나는 ${sd.issuerName || '크리에이터'}의 주주! HIPO에서 응원하기`,
          url: data.shareUrl || stockUrl(sd.stockId, ref),
        };
      }

      // 크리에이터 자랑 카드: "내 주주 N명 · 주가 +X%"
      case 'creator': {
        const sd = data.shareData || {};
        const change = sd.priceChange || 0;
        const changeText = `${change >= 0 ? '+' : ''}${Number(change).toFixed(2)}%`;
        return {
          title: `${sd.displayName || '내'} 종목`,
          message:
            data.shareMessage ||
            `내 주주가 ${sd.holders || 0}명이 됐어요! 현재가 ${(sd.currentPrice || 0).toLocaleString()} PO (${changeText})\nHIPO에서 나의 주주가 되어주세요`,
          url: data.shareUrl || stockUrl(sd.stockId, ref),
        };
      }

      case 'stock': {
        const priceChange = data.priceChangePercent || 0;
        const changeText =
          priceChange >= 0 ? `+${priceChange.toFixed(2)}%` : `${priceChange.toFixed(2)}%`;
        return {
          title: `${data.name || '크리에이터'} 주식`,
          message: `[HIPO] ${data.name || '크리에이터'}의 주식이 ${changeText} 변동했어요!\n현재가: ${(data.price || 0).toLocaleString()} PO\n\n지금 HIPO에서 확인해보세요!`,
          url: stockUrl(data.id, ref),
        };
      }

      case 'portfolio': {
        const profitRate = data.profitRate || 0;
        const profitText =
          profitRate >= 0 ? `+${profitRate.toFixed(2)}%` : `${profitRate.toFixed(2)}%`;
        return {
          title: '내 포트폴리오',
          message: `[HIPO] 나의 투자 수익률: ${profitText}\n총 평가금액: ${(data.totalValue || 0).toLocaleString()} PO\n\n크리에이터에 투자하고 수익을 얻어보세요!`,
          url: ref ? inviteUrl(ref) : homeUrl(),
        };
      }

      case 'achievement':
        return {
          title: `${data.title || '업적'} 달성!`,
          message: `[HIPO] "${data.title || '업적'}"을(를) 달성했어요!\n${data.description || ''}\n\n나도 HIPO에서 투자해보기!`,
          url: ref ? inviteUrl(ref) : homeUrl(),
        };

      case 'post':
        return {
          title: '게시물 공유',
          message: `[HIPO] ${data.authorName || '크리에이터'}님의 게시물\n\n"${(data.content || '').substring(0, 100)}${data.content?.length > 100 ? '...' : ''}"\n\nHIPO에서 더 많은 소식을 확인하세요!`,
          url: postUrl(data.id, ref),
        };

      default:
        return {
          title: 'HIPO',
          message: 'HIPO에서 크리에이터에 투자하고 수익을 얻어보세요!',
          url: ref ? inviteUrl(ref) : homeUrl(),
        };
    }
  };

  // 클립보드 복사 (expo-clipboard 없으면 공유 시트로 폴백)
  const handleCopyLink = async () => {
    const content = getShareContent();
    const result = await copyText(content.url);
    if (result.ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 기본 공유
  const handleShare = async () => {
    setSharing(true);
    try {
      const content = getShareContent();
      await Share.share({
        title: content.title,
        message: `${content.message}\n\n${content.url}`,
        url: content.url, // iOS only
      });
    } catch (error) {
      console.error('Share error:', error);
    } finally {
      setSharing(false);
    }
  };

  // SNS 공유 (웹 브라우저로 열기)
  const handleSocialShare = async (platform) => {
    const content = getShareContent();
    const encodedMessage = encodeURIComponent(content.message);
    const encodedUrl = encodeURIComponent(content.url);

    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedMessage}`;
        break;
    }

    if (shareUrl) {
      // Linking.openURL(shareUrl);
      // 웹에서는 window.open, 앱에서는 InAppBrowser 사용
      if (Platform.OS === 'web') {
        window.open(shareUrl, '_blank');
      } else {
        const { Linking } = require('react-native');
        Linking.openURL(shareUrl);
      }
    }
  };

  const handleOptionPress = async (option) => {
    switch (option.key) {
      case 'copy':
        await handleCopyLink();
        break;
      case 'share':
        await handleShare();
        onClose();
        break;
      case 'twitter':
      case 'facebook':
        await handleSocialShare(option.key);
        onClose();
        break;
    }
  };

  // 공유 미리보기 카드
  const renderPreviewCard = () => {
    const content = getShareContent();

    const sh = data.shareData || {};

    return (
      <View style={styles.previewCard}>
        {shareType === 'shareholder' && (
          <LinearGradient
            colors={[(sh.priceChange || 0) >= 0 ? '#8B5CF6' : '#F0344B', COLORS.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.previewGradient}
          >
            <View style={styles.previewContent}>
              <View style={styles.previewAvatar}>
                <Text style={styles.previewAvatarText}>
                  {(sh.issuerName || 'C').charAt(0)}
                </Text>
              </View>
              <Text style={styles.previewName}>{sh.issuerName || '크리에이터'}</Text>
              <View style={[styles.previewBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={[styles.previewBadgeText, { color: '#fff' }]}>
                  {sh.isEarlyBird ? `🏆 ${sh.rank}번째 주주` : `${sh.rank}번째 주주`}
                </Text>
              </View>
              <Text style={styles.previewPrice}>{(sh.currentPrice || 0).toLocaleString()} PO</Text>
            </View>
          </LinearGradient>
        )}

        {shareType === 'stock' && (
          <LinearGradient
            colors={[(data.priceChangePercent || 0) >= 0 ? COLORS.up : COLORS.down, COLORS.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.previewGradient}
          >
            <View style={styles.previewContent}>
              <View style={styles.previewAvatar}>
                <Text style={styles.previewAvatarText}>
                  {(data.name || 'C').charAt(0)}
                </Text>
              </View>
              <Text style={styles.previewName}>{data.name || '크리에이터'}</Text>
              <Text style={styles.previewPrice}>{(data.price || 0).toLocaleString()} PO</Text>
              <View style={[
                styles.previewBadge,
                { backgroundColor: (data.priceChangePercent || 0) >= 0 ? COLORS.stockUpBackground : COLORS.stockDownBackground }
              ]}>
                <Text style={[
                  styles.previewBadgeText,
                  { color: (data.priceChangePercent || 0) >= 0 ? COLORS.up : COLORS.down }
                ]}>
                  {(data.priceChangePercent || 0) >= 0 ? '+' : ''}{(data.priceChangePercent || 0).toFixed(2)}%
                </Text>
              </View>
            </View>
          </LinearGradient>
        )}

        {shareType === 'portfolio' && (
          <LinearGradient
            colors={[(data.profitRate || 0) >= 0 ? '#F0344B' : '#2B5FE3', COLORS.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.previewGradient}
          >
            <View style={styles.previewContent}>
              <Ionicons name="briefcase" size={32} color="#fff" />
              <Text style={styles.previewPortfolioLabel}>내 포트폴리오</Text>
              <Text style={styles.previewPortfolioValue}>{(data.totalValue || 0).toLocaleString()} PO</Text>
              <View style={[
                styles.previewBadge,
                { backgroundColor: 'rgba(255,255,255,0.2)' }
              ]}>
                <Text style={[styles.previewBadgeText, { color: '#fff' }]}>
                  수익률 {(data.profitRate || 0) >= 0 ? '+' : ''}{(data.profitRate || 0).toFixed(2)}%
                </Text>
              </View>
            </View>
          </LinearGradient>
        )}

        <View style={styles.previewFooter}>
          <Ionicons name="logo-react" size={16} color={COLORS.primary} />
          <Text style={styles.previewBrand}>HIPO</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>공유하기</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* 미리보기 */}
          {renderPreviewCard()}

          {/* 공유 옵션 */}
          <View style={styles.optionsContainer}>
            {SHARE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={styles.optionItem}
                onPress={() => handleOptionPress(option)}
                disabled={sharing}
              >
                <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
                  {option.key === 'copy' && copied ? (
                    <Ionicons name="checkmark" size={24} color={COLORS.success} />
                  ) : sharing && option.key === 'share' ? (
                    <ActivityIndicator size="small" color={option.color} />
                  ) : (
                    <Ionicons name={option.icon} size={24} color={option.color} />
                  )}
                </View>
                <Text style={styles.optionLabel}>
                  {option.key === 'copy' && copied ? '복사됨!' : option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 안내 문구 */}
          <Text style={styles.disclaimer}>
            공유된 정보는 실시간 데이터와 다를 수 있습니다.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

// 간편 공유 버튼 (인라인)
export const ShareButton = ({ onPress, size = 'medium', style }) => {
  const sizeConfig = {
    small: { iconSize: 18, padding: 8 },
    medium: { iconSize: 22, padding: 10 },
    large: { iconSize: 26, padding: 12 },
  };
  const config = sizeConfig[size] || sizeConfig.medium;

  return (
    <TouchableOpacity
      style={[styles.shareButton, { padding: config.padding }, style]}
      onPress={onPress}
    >
      <Ionicons name="share-outline" size={config.iconSize} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
  },
  // Preview card
  previewCard: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.gray100,
  },
  previewGradient: {
    padding: 20,
  },
  previewContent: {
    alignItems: 'center',
  },
  previewAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  previewName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  previewPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  previewBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  previewBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewPortfolioLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  previewPortfolioValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginVertical: 8,
  },
  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: COLORS.surface,
    gap: 6,
  },
  previewBrand: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Options
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  optionItem: {
    alignItems: 'center',
    minWidth: 70,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  disclaimer: {
    fontSize: 11,
    color: COLORS.textTertiary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  // Share button
  shareButton: {
    backgroundColor: COLORS.gray100,
    borderRadius: 10,
  },
});

export default ShareModal;
