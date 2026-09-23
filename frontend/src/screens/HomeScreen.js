import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStocks, getRecommendedStocks } from '../api/stocks';
import { getSavedUser } from '../api/auth';

const hero = require('../../assets/brand/home-discovery.png');
const growth = require('../../assets/brand/growth-steps.png');

const money = value => Number(value || 0).toLocaleString('ko-KR');
const creator = item => item?.issuer || item?.user || {};

function Avatar({ item, size = 46 }) {
  const person = creator(item);
  if (person.profileImage) return <Image source={{ uri: person.profileImage }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}><Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{person.username?.[0]?.toUpperCase() || '?'}</Text></View>;
}

export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [recommended, setRecommended] = useState({ trending: [], popular: [], newest: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [stockData, recommendedData, savedUser] = await Promise.all([
        getStocks().catch(() => ({ stocks: [] })),
        getRecommendedStocks().catch(() => ({ trending: [], popular: [], newest: [] })),
        getSavedUser(),
      ]);
      setStocks(stockData?.stocks || []);
      setRecommended(recommendedData || { trending: [], popular: [], newest: [] });
      setUser(savedUser);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const spotlight = useMemo(() => {
    const merged = [...(recommended.trending || []), ...(recommended.popular || []), ...stocks];
    return [...new Map(merged.map(item => [item.id, item])).values()].slice(0, 6);
  }, [recommended, stocks]);

  const quickActions = [
    { label: '사람 찾기', sub: '새로운 가능성', icon: 'search', tint: '#EAF1FF', color: '#2F6BFF', route: 'StockMarket' },
    { label: 'PO 송금', sub: '빠르고 간편하게', icon: 'paper-plane', tint: '#EDF9F5', color: '#15A06D', route: 'Transfer' },
    { label: '내 포트폴리오', sub: '성장 한눈에', icon: 'pie-chart', tint: '#F3EEFF', color: '#7656D6', route: 'Portfolio' },
    { label: '새 소식', sub: '응원하는 사람', icon: 'chatbubble-ellipses', tint: '#FFF0ED', color: '#F06D55', route: 'Community' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#2F6BFF" />} showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
        <View style={styles.shell}>
          <View style={styles.header}>
            <View><Text style={styles.wordmark}>HIPO.</Text><Text style={styles.headerCaption}>{user ? `${user.username}님의 발견` : '사람을 발견하는 새로운 방법'}</Text></View>
            <View style={styles.headerActions}>
              <Pressable style={styles.roundButton} onPress={() => navigation.navigate('Search')}><Ionicons name="search-outline" size={21} color="#273447" /></Pressable>
              <Pressable style={styles.roundButton} onPress={() => navigation.navigate('Notification')}><Ionicons name="notifications-outline" size={21} color="#273447" /><View style={styles.notificationDot} /></Pressable>
            </View>
          </View>

          <Pressable style={({ pressed }) => [styles.heroCard, pressed && styles.pressed]} onPress={() => navigation.navigate('StockMarket')}>
            <Image source={hero} style={styles.heroImage} resizeMode="cover" />
            <View style={styles.heroShade} />
            <View style={styles.heroCopy}>
              <View style={styles.heroBadge}><View style={styles.heroBadgeDot} /><Text style={styles.heroBadgeText}>오늘의 발견</Text></View>
              <Text style={styles.heroTitle}>다음 주인공을{`\n`}가장 먼저 만나보세요</Text>
              <Text style={styles.heroText}>사람의 가능성을 보고 응원하는 마켓</Text>
              <View style={styles.heroLink}><Text style={styles.heroLinkText}>둘러보기</Text><Ionicons name="arrow-forward" size={15} color="#FFFFFF" /></View>
            </View>
          </Pressable>

          {user ? (
            <Pressable style={styles.assetCard} onPress={() => navigation.navigate('Wallet')}>
              <View style={styles.assetCopy}><Text style={styles.assetLabel}>내가 가진 PO</Text><Text style={styles.assetValue}>{money(user.poBalance)} <Text style={styles.assetUnit}>PO</Text></Text><Text style={styles.assetHint}>오늘도 좋아하는 사람의 가능성을 발견해보세요</Text></View>
              <Image source={growth} style={styles.growthImage} resizeMode="contain" />
              <View style={styles.assetArrow}><Ionicons name="chevron-forward" size={17} color="#6F7E92" /></View>
            </Pressable>
          ) : (
            <Pressable style={styles.guestCard} onPress={() => navigation.navigate('Register')}>
              <View style={styles.guestIcon}><Ionicons name="gift" size={20} color="#2F6BFF" /></View><View style={styles.guestCopy}><Text style={styles.guestTitle}>10,000 PO로 가볍게 시작해요</Text><Text style={styles.guestText}>가입하면 바로 사람 주식을 경험할 수 있어요</Text></View><Ionicons name="chevron-forward" size={18} color="#7A8799" />
            </Pressable>
          )}

          <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>바로가기</Text><Text style={styles.sectionSub}>자주 찾는 기능을 모았어요</Text></View></View>
          <View style={styles.quickGrid}>{quickActions.map(action => (
            <Pressable key={action.label} style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]} onPress={() => navigation.navigate(action.route)}>
              <View style={[styles.quickIcon, { backgroundColor: action.tint }]}><Ionicons name={action.icon} size={21} color={action.color} /></View><View><Text style={styles.quickLabel}>{action.label}</Text><Text style={styles.quickSub}>{action.sub}</Text></View>
            </Pressable>
          ))}</View>

          <View style={styles.sectionHeader}><View><View style={styles.titleRow}><Text style={styles.sectionTitle}>지금 떠오르는 사람</Text><View style={styles.liveBadge}><Text style={styles.liveText}>LIVE</Text></View></View><Text style={styles.sectionSub}>관심과 거래가 빠르게 늘고 있어요</Text></View><Pressable onPress={() => navigation.navigate('StockMarket')}><Text style={styles.more}>전체보기</Text></Pressable></View>
          {loading ? <ActivityIndicator style={{ marginVertical: 40 }} color="#2F6BFF" /> : spotlight.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.spotlightList}>
              {spotlight.map((item, index) => {
                const change = Number(item.priceChangePercent ?? item.priceChange ?? 0);
                return <Pressable key={item.id || index} style={({ pressed }) => [styles.creatorCard, pressed && styles.pressed]} onPress={() => navigation.navigate('StockDetail', { stockId: item.id })}>
                  <View style={styles.rank}><Text style={styles.rankText}>{index + 1}</Text></View><Avatar item={item} size={58} /><Text style={styles.creatorName} numberOfLines={1}>{creator(item).username || '새 크리에이터'}</Text><Text style={styles.creatorPrice}>{money(item.sharePrice)} PO</Text><Text style={[styles.creatorChange, { color: change >= 0 ? '#F04452' : '#2F6BFF' }]}>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</Text>
                </Pressable>;
              })}
            </ScrollView>
          ) : <View style={styles.empty}><Ionicons name="sparkles-outline" size={24} color="#91A0B5" /><Text style={styles.emptyTitle}>곧 새로운 사람을 소개할게요</Text><Text style={styles.emptyText}>첫 번째 크리에이터를 기다리고 있어요.</Text></View>}

          <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>오늘의 마켓</Text><Text style={styles.sectionSub}>가격보다 사람의 변화를 먼저 살펴보세요</Text></View><Pressable onPress={() => navigation.navigate('Watchlist')}><Ionicons name="star-outline" size={21} color="#6B7684" /></Pressable></View>
          <View style={styles.marketCard}>{stocks.slice(0, 5).map((item, index) => {
            const change = Number(item.priceChangePercent ?? item.priceChange ?? 0);
            return <Pressable key={item.id || index} style={[styles.marketRow, index === Math.min(stocks.length, 5) - 1 && styles.marketRowLast]} onPress={() => navigation.navigate('StockDetail', { stockId: item.id })}>
              <Avatar item={item} /><View style={styles.marketInfo}><Text style={styles.marketName}>{creator(item).username || '크리에이터'}</Text><Text style={styles.marketMeta}>{money(item.totalVolume)}주가 오갔어요</Text></View><View style={styles.marketValue}><Text style={styles.marketPrice}>{money(item.sharePrice)} PO</Text><Text style={[styles.marketChange, { color: change >= 0 ? '#F04452' : '#2F6BFF' }]}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</Text></View>
            </Pressable>;
          })}{!stocks.length && !loading && <Text style={styles.marketEmpty}>아직 표시할 마켓 데이터가 없어요.</Text>}</View>

          <Pressable style={styles.communityBanner} onPress={() => navigation.navigate('Community')}>
            <View><Text style={styles.communityEyebrow}>HIPO COMMUNITY</Text><Text style={styles.communityTitle}>응원하는 사람의{`\n`}진짜 이야기를 만나보세요</Text><Text style={styles.communityLink}>피드 보러가기  →</Text></View>
            <View style={styles.bubbleBack}><Ionicons name="chatbubbles" size={42} color="#FFFFFF" /></View>
          </Pressable>
          <Text style={styles.disclaimer}>HIPO의 시세와 PO는 서비스 내 경험을 위한 가상 정보이며 실제 투자 상품이 아니에요.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F8FB' },
  page: { alignItems: 'center', paddingBottom: 36 },
  shell: { width: '100%', maxWidth: 760 },
  header: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 17, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF' },
  wordmark: { color: '#121926', fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  headerCaption: { color: '#8B95A1', fontSize: 11, fontWeight: '600', marginTop: 3 },
  headerActions: { flexDirection: 'row', gap: 8 },
  roundButton: { width: 41, height: 41, borderRadius: 15, backgroundColor: '#F3F5F8', alignItems: 'center', justifyContent: 'center' },
  notificationDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6B5F', top: 9, right: 10, borderWidth: 1, borderColor: '#F3F5F8' },
  heroCard: { height: 246, margin: 16, borderRadius: 27, overflow: 'hidden', backgroundColor: '#DCE8FF' },
  heroImage: { width: '100%', height: '100%' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24,52,105,0.12)' },
  heroCopy: { position: 'absolute', left: 21, top: 22, bottom: 20, justifyContent: 'flex-start', maxWidth: '58%' },
  heroBadge: { alignSelf: 'flex-start', flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6B5F' },
  heroBadgeText: { color: '#394860', fontSize: 10, fontWeight: '800' },
  heroTitle: { color: '#17243B', fontSize: 23, lineHeight: 31, fontWeight: '900', letterSpacing: -0.8, marginTop: 18 },
  heroText: { color: '#5A6D89', fontSize: 11, lineHeight: 17, fontWeight: '600', marginTop: 8 },
  heroLink: { marginTop: 'auto', backgroundColor: '#2F6BFF', borderRadius: 14, height: 38, paddingHorizontal: 14, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroLinkText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  assetCard: { minHeight: 143, marginHorizontal: 16, borderRadius: 24, backgroundColor: '#111C2D', padding: 20, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' },
  assetCopy: { zIndex: 2, flex: 1 },
  assetLabel: { color: '#92A2B8', fontSize: 12, fontWeight: '700' },
  assetValue: { color: '#FFFFFF', fontSize: 27, fontWeight: '900', letterSpacing: -0.6, marginTop: 7 },
  assetUnit: { color: '#8EB1FF', fontSize: 14, fontWeight: '800' },
  assetHint: { color: '#8290A4', fontSize: 10, lineHeight: 15, marginTop: 9, maxWidth: 220 },
  growthImage: { position: 'absolute', right: 20, bottom: -8, width: 122, height: 122, opacity: 0.88 },
  assetArrow: { position: 'absolute', right: 14, top: 13 },
  guestCard: { marginHorizontal: 16, minHeight: 84, borderRadius: 22, backgroundColor: '#FFFFFF', paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 13 },
  guestIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#EAF1FF', justifyContent: 'center', alignItems: 'center' },
  guestCopy: { flex: 1 },
  guestTitle: { color: '#273447', fontSize: 14, fontWeight: '800' },
  guestText: { color: '#8B95A1', fontSize: 11, marginTop: 4 },
  sectionHeader: { marginTop: 32, marginBottom: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: '#182335', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  sectionSub: { color: '#8B95A1', fontSize: 11, fontWeight: '500', marginTop: 5 },
  more: { color: '#6B7684', fontSize: 12, fontWeight: '700' },
  liveBadge: { backgroundColor: '#FFF0ED', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  liveText: { color: '#F06D55', fontSize: 8, fontWeight: '900' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  quickItem: { width: '48.5%', minHeight: 78, borderRadius: 20, backgroundColor: '#FFFFFF', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  quickIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { color: '#273447', fontSize: 13, fontWeight: '800' },
  quickSub: { color: '#9AA4B2', fontSize: 10, marginTop: 4 },
  spotlightList: { paddingHorizontal: 16, gap: 10 },
  creatorCard: { width: 142, minHeight: 180, borderRadius: 23, backgroundColor: '#FFFFFF', padding: 15, alignItems: 'center' },
  rank: { position: 'absolute', left: 12, top: 12, width: 23, height: 23, borderRadius: 9, backgroundColor: '#EFF3F9', alignItems: 'center', justifyContent: 'center' },
  rankText: { color: '#617087', fontSize: 10, fontWeight: '900' },
  avatar: { backgroundColor: '#EAF1FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#2F6BFF', fontWeight: '900' },
  creatorName: { color: '#273447', fontSize: 14, fontWeight: '800', marginTop: 12, maxWidth: '100%' },
  creatorPrice: { color: '#5E6A7B', fontSize: 11, fontWeight: '700', marginTop: 7 },
  creatorChange: { fontSize: 11, fontWeight: '800', marginTop: 4 },
  empty: { marginHorizontal: 16, borderRadius: 22, backgroundColor: '#FFFFFF', padding: 28, alignItems: 'center' },
  emptyTitle: { color: '#394860', fontSize: 14, fontWeight: '800', marginTop: 10 },
  emptyText: { color: '#9AA4B2', fontSize: 11, marginTop: 5 },
  marketCard: { marginHorizontal: 16, borderRadius: 24, backgroundColor: '#FFFFFF', paddingHorizontal: 16 },
  marketRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F2F5' },
  marketRowLast: { borderBottomWidth: 0 },
  marketInfo: { flex: 1, marginLeft: 12 },
  marketName: { color: '#273447', fontSize: 14, fontWeight: '800' },
  marketMeta: { color: '#A1AAB7', fontSize: 10, marginTop: 4 },
  marketValue: { alignItems: 'flex-end' },
  marketPrice: { color: '#273447', fontSize: 13, fontWeight: '800' },
  marketChange: { fontSize: 11, fontWeight: '800', marginTop: 4 },
  marketEmpty: { color: '#9AA4B2', fontSize: 12, textAlign: 'center', paddingVertical: 30 },
  communityBanner: { minHeight: 174, borderRadius: 26, backgroundColor: '#6B52D9', margin: 16, marginTop: 32, padding: 22, overflow: 'hidden' },
  communityEyebrow: { color: '#CFC5FF', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  communityTitle: { color: '#FFFFFF', fontSize: 20, lineHeight: 28, fontWeight: '900', marginTop: 10 },
  communityLink: { color: '#E5DFFF', fontSize: 11, fontWeight: '800', marginTop: 15 },
  bubbleBack: { position: 'absolute', width: 112, height: 112, borderRadius: 56, backgroundColor: 'rgba(255,255,255,0.13)', right: -3, bottom: -9, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { color: '#A1AAB7', fontSize: 10, lineHeight: 16, textAlign: 'center', marginHorizontal: 40, marginTop: 10 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
});
