import React, { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import useThemedStyles from '../../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from 'react-native';
import api from '../../api/client';
import { buyStock, getShareholderCard } from '../../api/stocks';
import { useAuth } from '../../contexts/AuthContext';
import ShareModal from '../../components/ShareModal';
import { COLORS } from '../../constants/colors';

/**
 * 첫 주주 되기 온보딩 — "30초 안에 첫 주주"
 * [1] 누구의 주주가 될까요? (추천 종목)
 * [2] 원탭 매수 → 주주 인증 카드
 * [3] 공유 / 주주 커뮤니티 입장
 */
export default function FirstBuyOnboardingScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recommended, setRecommended] = useState([]);
  const [suggestedShares, setSuggestedShares] = useState(10);
  const [poBalance, setPoBalance] = useState(0);
  const [buying, setBuying] = useState(false);
  /** 가입 시 자동 개설된 내 종목. 상장된 크리에이터가 없을 때의 대안 동선에 쓴다. */
  const [myStock, setMyStock] = useState(null);

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareholderCard, setShareholderCard] = useState(null);
  const [boughtStock, setBoughtStock] = useState(null);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const res = await api.get('/onboarding/state');
      const data = res.data || {};
      if (data.onboarded) {
        // 이미 완료한 사용자가 들어온 경우 바로 메인으로
        finishToMain();
        return;
      }
      setRecommended(data.recommended || []);
      setSuggestedShares(data.suggestedShares || 10);
      setPoBalance(data.poBalance || 0);
      setMyStock(data.myStock || null);
    } catch (e) {
      // 추천 로드 실패 시에도 건너뛰기 가능하게
      setRecommended([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePickAndBuy = async (item) => {
    if (buying) return;
    setBuying(true);
    try {
      const qty = Math.max(1, suggestedShares);
      await buyStock(item.stockId, qty);
      setBoughtStock(item);

      // 주주 인증 카드 (있으면 공유 유도)
      try {
        const card = await getShareholderCard(item.stockId);
        setShareholderCard(card);
        setShareModalVisible(true);
      } catch (e) {
        // 카드 실패는 무시
      }
    } catch (error) {
      const msg = error.response?.data?.error || '매수 중 오류가 발생했습니다';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('오류', msg);
    } finally {
      setBuying(false);
    }
  };

  const finishOnboarding = async () => {
    try {
      await api.post('/onboarding/complete');
    } catch (e) {
      // 완료 마킹 실패해도 진행 (다음 로그인 시 재시도됨)
    }
    // 로컬 user에 onboardedAt 반영 → 네비 게이트가 메인으로 보냄
    try {
      updateUser({ ...(user || {}), onboardedAt: new Date().toISOString() });
    } catch (e) {}
    finishToMain();
  };

  const finishToMain = () => {
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  const goToCommunity = async () => {
    setShareModalVisible(false);
    await finishOnboarding();
    // 주주 커뮤니티로 바로 진입 (ShareholderCommunityScreen은 stockId로 커뮤니티를 찾음)
    if (boughtStock) {
      navigation.navigate('ShareholderCommunity', {
        stockId: boughtStock.stockId,
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // 매수 완료 후 화면 (스텝 3)
  if (boughtStock) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ShareModal
          visible={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
          shareType="shareholder"
          data={shareholderCard}
        />
        <View style={styles.doneBox}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.title}>
            {boughtStock.displayName}의 주주가 되었어요!
          </Text>
          <Text style={styles.subtitle}>
            이제 주주 전용 공간에서 함께해요.
          </Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={goToCommunity}>
            <Text style={styles.primaryBtnText}>주주 커뮤니티 입장하기</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={finishOnboarding}>
            <Text style={styles.secondaryBtnText}>홈으로 가기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /**
   * 상장된 크리에이터가 아직 없을 때 (= 1호 상장 전).
   *
   * 텅 빈 목록에 "나중에 할게요"만 두면 첫인상이 빈 거래소가 된다.
   * 대신 지금 할 수 있는 두 가지를 준다.
   *   ① 내 종목 공유해 첫 주주 받기 — 가입 시 자동 개설되므로 누구나 가능
   *   ② 보고 싶은 사람 상장 요청 — 1호 섭외 우선순위 데이터가 된다
   */
  if (recommended.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>아직 상장된 크리에이터가 없어요</Text>
          <Text style={styles.subtitle}>
            HIPO는 본인이 직접 동의한 사람만 상장합니다.{'\n'}
            첫 크리에이터를 모시는 중이에요. 그동안 이런 걸 할 수 있어요.
          </Text>

          {myStock ? (
            <TouchableOpacity
              style={styles.optionCard}
              activeOpacity={0.85}
              onPress={async () => {
                await finishOnboarding();
                navigation.navigate('Invite');
              }}
            >
              <Text style={styles.optionEmoji}>🎫</Text>
              <View style={styles.cardInfo}>
                <Text style={styles.optionTitle}>내 종목에 첫 주주 초대하기</Text>
                <Text style={styles.optionDesc}>
                  가입과 동시에 당신의 종목도 열렸어요.{'\n'}
                  {myStock.sharePrice.toLocaleString()} PO · 현재 주주{' '}
                  {myStock.shareholderCount}명
                </Text>
              </View>
              <Text style={styles.cardCta}>공유</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.optionCard}
            activeOpacity={0.85}
            onPress={async () => {
              await finishOnboarding();
              navigation.navigate('CelebSuggestion');
            }}
          >
            <Text style={styles.optionEmoji}>🙋</Text>
            <View style={styles.cardInfo}>
              <Text style={styles.optionTitle}>보고 싶은 사람 상장 요청하기</Text>
              <Text style={styles.optionDesc}>
                기다리는 사람이 많을수록 먼저 섭외해요.
              </Text>
            </View>
            <Text style={styles.cardCta}>요청</Text>
          </TouchableOpacity>

          <View style={styles.balanceNote}>
            <Text style={styles.balanceNoteText}>
              보유 포인트 {poBalance.toLocaleString()} PO는 그대로 있어요.{'\n'}
              상장이 시작되면 알려드릴게요.
            </Text>
          </View>

          <TouchableOpacity style={styles.skip} onPress={finishOnboarding} disabled={buying}>
            <Text style={styles.skipText}>먼저 둘러볼게요</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // 종목 선택 (스텝 1~2)
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>누구의 주주가 될까요?</Text>
        <Text style={styles.subtitle}>
          한 명을 선택하면 바로 {suggestedShares}주의 주주가 됩니다.{'\n'}
          보유 PO: {poBalance.toLocaleString()} PO
        </Text>

        {recommended.map((item) => (
            <TouchableOpacity
              key={item.stockId}
              style={styles.card}
              disabled={buying}
              onPress={() => handlePickAndBuy(item)}
              activeOpacity={0.85}
            >
              <View style={styles.avatar}>
                {item.profileImage ? (
                  <Image source={{ uri: item.profileImage }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarText}>
                    {(item.displayName || 'C').charAt(0)}
                  </Text>
                )}
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.displayName}</Text>
                <Text style={styles.cardMeta}>
                  {item.sharePrice.toLocaleString()} PO · 주주 {item.shareholderCount}명
                </Text>
              </View>
              <Text style={styles.cardCta}>{buying ? '...' : '주주 되기'}</Text>
            </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.skip} onPress={finishOnboarding} disabled={buying}>
          <Text style={styles.skipText}>나중에 할게요</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.colors.background },
  scroll: { padding: 24, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '800', color: t.colors.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: t.colors.textSecondary, lineHeight: 20, marginBottom: 24 },
  empty: { fontSize: 14, color: t.colors.textSecondary, textAlign: 'center', marginVertical: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: t.colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14, overflow: 'hidden',
  },
  avatarImg: { width: 52, height: 52 },
  avatarText: { fontSize: 22, fontWeight: '700', color: t.colors.surface },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: t.colors.text },
  cardMeta: { fontSize: 13, color: t.colors.textSecondary, marginTop: 2 },
  cardCta: { fontSize: 14, fontWeight: '700', color: t.colors.primary },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  optionEmoji: { fontSize: 28, marginRight: 14 },
  optionTitle: { fontSize: 16, fontWeight: '700', color: t.colors.text },
  optionDesc: { fontSize: 13, color: t.colors.textSecondary, marginTop: 3, lineHeight: 18 },
  balanceNote: {
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: t.colors.surfaceSunken,
  },
  balanceNoteText: { fontSize: 13, color: t.colors.textSecondary, lineHeight: 19 },
  skip: { marginTop: 16, alignItems: 'center', padding: 12 },
  skipText: { fontSize: 14, color: t.colors.textTertiary },
  doneBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  doneEmoji: { fontSize: 64, marginBottom: 16 },
  primaryBtn: {
    backgroundColor: t.colors.primary,
    borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40,
    marginTop: 28, width: '100%', alignItems: 'center',
  },
  primaryBtnText: { color: t.colors.surface, fontSize: 16, fontWeight: '700' },
  secondaryBtn: { marginTop: 14, padding: 12 },
  secondaryBtnText: { color: t.colors.textSecondary, fontSize: 15 },
});
