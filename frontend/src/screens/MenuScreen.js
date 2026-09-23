import React, { useEffect, useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { walletAPI } from '../services/api';

const growth = require('../../assets/brand/growth-steps.png');

const Item = ({ icon, title, sub, onPress, accent = '#EFF3F8', color = '#59687C', badge }) => (
  <Pressable style={({ pressed }) => [styles.item, pressed && styles.pressed]} onPress={onPress}>
    <View style={[styles.itemIcon, { backgroundColor: accent }]}><Ionicons name={icon} size={20} color={color} /></View>
    <View style={styles.itemCopy}><View style={styles.itemTitleRow}><Text style={styles.itemTitle}>{title}</Text>{badge && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}</View>{sub && <Text style={styles.itemSub}>{sub}</Text>}</View>
    <Ionicons name="chevron-forward" size={17} color="#B0B8C1" />
  </Pressable>
);

export default function MenuScreen({ navigation }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [balance, setBalance] = useState(Number(user?.poBalance || 0));

  useEffect(() => {
    if (!isAuthenticated) return;
    walletAPI.getBalance().then(r => setBalance(Number(r.data.availableBalance ?? r.data.balance ?? 0))).catch(() => {});
  }, [isAuthenticated]);

  const signOut = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  if (!isAuthenticated) {
    return <SafeAreaView style={styles.safe}><View style={styles.guestPage}><Text style={styles.wordmark}>HIPO.</Text><Image source={growth} style={styles.guestImage} resizeMode="contain" /><Text style={styles.guestTitle}>나만의 발견을{`\n`}저장해보세요</Text><Text style={styles.guestBody}>관심 있는 사람, 포트폴리오, 커뮤니티 소식을{`\n`}한곳에서 이어볼 수 있어요.</Text><Pressable style={styles.primary} onPress={() => navigation.navigate('Register')}><Text style={styles.primaryText}>무료로 시작하기</Text></Pressable><Pressable style={styles.loginLink} onPress={() => navigation.navigate('Login')}><Text style={styles.loginLinkText}>이미 계정이 있어요</Text></Pressable></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.shell}>
          <View style={styles.header}><View><Text style={styles.headerEyebrow}>MY HIPO</Text><Text style={styles.headerTitle}>내 HIPO</Text></View><Pressable style={styles.settings} onPress={() => navigation.navigate('NotificationSettings')}><Ionicons name="settings-outline" size={21} color="#425169" /></Pressable></View>

          <Pressable style={styles.profile} onPress={() => navigation.navigate('Profile', { userId: user?.id })}>
            <View style={styles.avatar}>{user?.profileImage ? <Image source={{ uri: user.profileImage }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{user?.username?.[0]?.toUpperCase() || 'H'}</Text>}</View>
            <View style={styles.profileCopy}><View style={styles.nameRow}><Text style={styles.name}>{user?.username}</Text>{user?.isVerified && <Ionicons name="checkmark-circle" size={17} color="#2F6BFF" />}</View><Text style={styles.email}>{user?.email}</Text></View><Ionicons name="chevron-forward" size={18} color="#A1AAB7" />
          </Pressable>

          <Pressable style={styles.wallet} onPress={() => navigation.navigate('Wallet')}>
            <View><Text style={styles.walletLabel}>바로 쓸 수 있는 PO</Text><Text style={styles.walletValue}>{balance.toLocaleString()} <Text style={styles.walletUnit}>PO</Text></Text><View style={styles.walletLink}><Text style={styles.walletLinkText}>내역과 예약금 보기</Text><Ionicons name="arrow-forward" size={13} color="#AABDE9" /></View></View><Image source={growth} style={styles.walletImage} resizeMode="contain" />
          </Pressable>

          <View style={styles.quickRow}>
            {[['add-circle-outline', '충전', 'POCharge'], ['paper-plane-outline', '송금', 'Transfer'], ['receipt-outline', '거래내역', 'TransactionHistory'], ['star-outline', '관심목록', 'Watchlist']].map(([icon, label, route]) => <Pressable key={label} style={styles.quick} onPress={() => navigation.navigate(route)}><View style={styles.quickIcon}><Ionicons name={icon} size={21} color="#2F6BFF" /></View><Text style={styles.quickText}>{label}</Text></Pressable>)}
          </View>

          <Text style={styles.sectionTitle}>투자와 성장</Text>
          <View style={styles.group}>
            <Item icon="pie-chart-outline" title="내 포트폴리오" sub="보유한 사람과 수익 흐름" color="#7656D6" accent="#F2EEFF" onPress={() => navigation.navigate('Portfolio')} />
            <Item icon="rocket-outline" title="공개 전 기회" sub="IPO와 Pre-IPO 한눈에" color="#F06D55" accent="#FFF0ED" badge="NEW" onPress={() => navigation.navigate('IPOList')} />
            <Item icon="analytics-outline" title="포트폴리오 분석" sub="내 응원과 자산의 균형" color="#15A06D" accent="#EAF8F3" onPress={() => navigation.navigate('PortfolioAnalysis')} />
          </View>

          <Text style={styles.sectionTitle}>혜택과 활동</Text>
          <View style={styles.group}>
            <Item icon="calendar-outline" title="매일 출석" sub="꾸준히 방문하고 PO 받기" onPress={() => navigation.navigate('Attendance')} />
            <Item icon="gift-outline" title="친구 초대" sub="함께 시작하면 1,500 PO" badge="혜택" onPress={() => navigation.navigate('Invite')} />
            <Item icon="trophy-outline" title="랭킹과 대회" sub="새로운 사람과 전략 발견" onPress={() => navigation.navigate('Competition')} />
          </View>

          <Text style={styles.sectionTitle}>설정과 안내</Text>
          <View style={styles.group}>
            <Item icon="shield-checkmark-outline" title="보안과 인증" sub="로그인 기록·본인 인증 관리" onPress={() => navigation.navigate('SecuritySettings')} />
            <Item icon="notifications-outline" title="알림 설정" sub="원하는 소식만 받아보기" onPress={() => navigation.navigate('NotificationSettings')} />
            <Item icon="document-text-outline" title="약관과 개인정보" sub="서비스 정책 확인" onPress={() => navigation.navigate('Terms')} />
          </View>

          {user?.role === 'admin' && <><Text style={styles.sectionTitle}>운영</Text><View style={styles.group}><Item icon="speedometer-outline" title="관리자 대시보드" sub="검토와 운영 지표" onPress={() => navigation.navigate('AdminDashboard')} /></View></>}

          <Pressable style={styles.logout} onPress={signOut}><Text style={styles.logoutText}>로그아웃</Text></Pressable>
          <Text style={styles.version}>HIPO 1.0.0 · 사람의 가능성을 발견하는 마켓</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F8FB' },
  page: { alignItems: 'center', paddingBottom: 38 },
  shell: { width: '100%', maxWidth: 680, paddingHorizontal: 16 },
  header: { paddingHorizontal: 4, paddingTop: 18, paddingBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerEyebrow: { color: '#2F6BFF', fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  headerTitle: { color: '#182335', fontSize: 27, fontWeight: '900', letterSpacing: -0.8, marginTop: 4 },
  settings: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  profile: { minHeight: 88, borderRadius: 24, backgroundColor: '#FFFFFF', padding: 16, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 54, height: 54, borderRadius: 19, backgroundColor: '#EAF1FF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#2F6BFF', fontSize: 21, fontWeight: '900' },
  profileCopy: { flex: 1, marginLeft: 13 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: '#202B3C', fontSize: 17, fontWeight: '900' },
  email: { color: '#9AA4B2', fontSize: 11, marginTop: 5 },
  wallet: { minHeight: 148, borderRadius: 25, backgroundColor: '#16243A', padding: 20, marginTop: 12, overflow: 'hidden' },
  walletLabel: { color: '#99A9BF', fontSize: 12, fontWeight: '700' },
  walletValue: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginTop: 8 },
  walletUnit: { color: '#8FB0FF', fontSize: 14 },
  walletLink: { flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 13 },
  walletLinkText: { color: '#AABDE9', fontSize: 10, fontWeight: '700' },
  walletImage: { position: 'absolute', right: 2, bottom: -20, width: 142, height: 142, opacity: 0.88 },
  quickRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 24, marginTop: 12, paddingVertical: 16, justifyContent: 'space-around' },
  quick: { alignItems: 'center', minWidth: 65 },
  quickIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#EDF3FF', alignItems: 'center', justifyContent: 'center' },
  quickText: { color: '#526075', fontSize: 11, fontWeight: '700', marginTop: 7 },
  sectionTitle: { color: '#536071', fontSize: 12, fontWeight: '800', marginTop: 28, marginBottom: 10, marginLeft: 5 },
  group: { borderRadius: 24, backgroundColor: '#FFFFFF', paddingHorizontal: 15 },
  item: { minHeight: 76, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F2F5' },
  itemIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemCopy: { flex: 1, marginLeft: 12 },
  itemTitleRow: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  itemTitle: { color: '#273447', fontSize: 14, fontWeight: '800' },
  itemSub: { color: '#9AA4B2', fontSize: 10, marginTop: 4 },
  badge: { backgroundColor: '#FFF0ED', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  badgeText: { color: '#F06D55', fontSize: 8, fontWeight: '900' },
  logout: { alignItems: 'center', paddingVertical: 22, marginTop: 14 },
  logoutText: { color: '#8B95A1', fontSize: 13, fontWeight: '700' },
  version: { color: '#B0B8C1', fontSize: 9, textAlign: 'center' },
  pressed: { opacity: 0.7 },
  guestPage: { flex: 1, width: '100%', maxWidth: 500, alignSelf: 'center', paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
  wordmark: { position: 'absolute', top: 25, left: 24, color: '#121926', fontSize: 22, fontWeight: '900' },
  guestImage: { width: 230, height: 230 },
  guestTitle: { color: '#182335', fontSize: 28, lineHeight: 37, fontWeight: '900', textAlign: 'center', letterSpacing: -0.8, marginTop: 14 },
  guestBody: { color: '#7A8799', fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 12 },
  primary: { width: '100%', height: 57, borderRadius: 18, backgroundColor: '#2F6BFF', alignItems: 'center', justifyContent: 'center', marginTop: 34 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  loginLink: { padding: 18 },
  loginLinkText: { color: '#6B7684', fontSize: 13, fontWeight: '700' },
});
