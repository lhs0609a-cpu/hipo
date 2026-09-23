import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';

const tabs = [{ id: 'all', label: '주목받는' }, { id: 'rising', label: '급상승' }, { id: 'falling', label: '새 기회' }, { id: 'volume', label: '거래 활발' }];
const compact = value => { const number = Number(value || 0); if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`; if (number >= 1000) return `${(number / 1000).toFixed(1)}K`; return number.toLocaleString(); };

export default function StockMarketScreen({ navigation }) {
  const [selectedTab, setSelectedTab] = useState('all');
  const [stocks, setStocks] = useState([]);
  const [market, setMarket] = useState({ totalVolume: 0, totalMarketCap: 0, activeTraders: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const sort = () => ({ rising: 'change', falling: 'changeAsc', volume: 'volume' }[selectedTab] || 'marketCap');
  const load = async () => {
    try {
      const [stockRes, overviewRes] = await Promise.all([api.get('/stocks', { params: { sortBy: sort(), direction: selectedTab, limit: 50 } }), api.get('/stock-market/overview')]);
      setStocks((stockRes.data.stocks || []).map(stock => ({ ...stock, person: stock.issuer || stock.user || {}, change: Number(stock.priceChangePercent || 0) })));
      setMarket({ totalVolume: overviewRes.data.todayVolume || 0, totalMarketCap: overviewRes.data.totalMarketCap || 0, activeTraders: overviewRes.data.todayTrades || 0 });
      setError('');
    } catch (_) { setError('시장 정보를 새로 불러오지 못했어요.'); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { setLoading(true); load(); const timer = setInterval(load, 10000); return () => clearInterval(timer); }, [selectedTab]);

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#2F6BFF" />} showsVerticalScrollIndicator={false}><View style={styles.shell}>
    <View style={styles.header}><View><Text style={styles.eyebrow}>DISCOVER</Text><Text style={styles.title}>사람 발견</Text><Text style={styles.subtitle}>지금 관심이 모이는 사람을 살펴보세요</Text></View><Pressable style={styles.search} onPress={() => navigation.navigate('Search')}><Ionicons name="search" size={21} color="#273447" /></Pressable></View>

    <View style={styles.insight}>
      <View style={styles.insightTop}><View><Text style={styles.insightLabel}>오늘의 HIPO 마켓</Text><Text style={styles.insightTitle}>새로운 가능성이{`\n`}계속 발견되고 있어요</Text></View><View style={styles.pulse}><View style={styles.pulseDot} /><Text style={styles.pulseText}>LIVE</Text></View></View>
      <View style={styles.stats}><View style={styles.stat}><Text style={styles.statLabel}>전체 가치</Text><Text style={styles.statValue}>{compact(market.totalMarketCap)} <Text style={styles.statUnit}>PO</Text></Text></View><View style={styles.statLine} /><View style={styles.stat}><Text style={styles.statLabel}>오늘 거래</Text><Text style={styles.statValue}>{compact(market.activeTraders)} <Text style={styles.statUnit}>건</Text></Text></View><View style={styles.statLine} /><View style={styles.stat}><Text style={styles.statLabel}>거래량</Text><Text style={styles.statValue}>{compact(market.totalVolume)}</Text></View></View>
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>{tabs.map(tab => <Pressable key={tab.id} style={[styles.tab, selectedTab === tab.id && styles.tabOn]} onPress={() => setSelectedTab(tab.id)}><Text style={[styles.tabText, selectedTab === tab.id && styles.tabTextOn]}>{tab.label}</Text></Pressable>)}</ScrollView>
    <View style={styles.listHeader}><Text style={styles.listTitle}>{tabs.find(tab => tab.id === selectedTab)?.label} 크리에이터</Text><Text style={styles.listCaption}>10초마다 업데이트</Text></View>
    {!!error && <View style={styles.error}><Ionicons name="cloud-offline-outline" size={17} color="#F06D55" /><Text style={styles.errorText}>{error}</Text><Pressable onPress={load}><Text style={styles.retry}>다시 시도</Text></Pressable></View>}
    {loading ? <ActivityIndicator color="#2F6BFF" style={{ marginVertical: 60 }} /> : <View style={styles.list}>{stocks.map((stock, index) => <Pressable key={stock.id || index} style={[styles.row, index === stocks.length - 1 && { borderBottomWidth: 0 }]} onPress={() => navigation.navigate('StockDetail', { stockId: stock.id })}>
      <Text style={styles.rank}>{index + 1}</Text><View style={styles.avatar}><Text style={styles.avatarText}>{stock.person.username?.[0]?.toUpperCase() || '?'}</Text></View><View style={styles.info}><View style={styles.nameRow}><Text style={styles.name} numberOfLines={1}>{stock.person.username || '크리에이터'}</Text>{stock.person.isVerified && <Ionicons name="checkmark-circle" size={14} color="#2F6BFF" />}</View><Text style={styles.meta}>시가총액 {compact(stock.marketCapTotal || stock.marketCap)} PO</Text></View><View style={styles.value}><Text style={styles.price}>{Number(stock.sharePrice || 0).toLocaleString()} PO</Text><Text style={[styles.change, { color: stock.change >= 0 ? '#F04452' : '#2F6BFF' }]}>{stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%</Text></View>
    </Pressable>)}{!stocks.length && <View style={styles.empty}><Ionicons name="telescope-outline" size={38} color="#B7C0CC" /><Text style={styles.emptyTitle}>발견할 사람을 찾고 있어요</Text><Text style={styles.emptyText}>마켓이 열리면 가장 먼저 알려드릴게요.</Text></View>}</View>}
    <View style={styles.guide}><Ionicons name="information-circle-outline" size={18} color="#7A8799" /><Text style={styles.guideText}>사람의 인기와 성장 가능성은 언제든 달라질 수 있어요. 숫자뿐 아니라 활동과 이야기도 함께 살펴보세요.</Text></View>
  </View></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F8FB' }, page: { alignItems: 'center', paddingBottom: 36 }, shell: { width: '100%', maxWidth: 680 },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 18, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, eyebrow: { color: '#2F6BFF', fontSize: 9, fontWeight: '900', letterSpacing: 1.3 }, title: { color: '#182335', fontSize: 27, fontWeight: '900', letterSpacing: -0.8, marginTop: 3 }, subtitle: { color: '#8B95A1', fontSize: 11, marginTop: 5 }, search: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#F3F5F8', alignItems: 'center', justifyContent: 'center' },
  insight: { backgroundColor: '#172640', margin: 16, borderRadius: 26, padding: 21 }, insightTop: { flexDirection: 'row', justifyContent: 'space-between' }, insightLabel: { color: '#91A6C8', fontSize: 10, fontWeight: '700' }, insightTitle: { color: '#FFFFFF', fontSize: 20, lineHeight: 28, fontWeight: '900', marginTop: 7 }, pulse: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.09)', height: 27, borderRadius: 12, paddingHorizontal: 9 }, pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#5AE0A7' }, pulseText: { color: '#A9F0D2', fontSize: 8, fontWeight: '900' }, stats: { flexDirection: 'row', alignItems: 'center', marginTop: 22, paddingTop: 17, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.09)' }, stat: { flex: 1 }, statLabel: { color: '#8395B0', fontSize: 9 }, statValue: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', marginTop: 5 }, statUnit: { color: '#8FADE8', fontSize: 9 }, statLine: { width: 1, height: 27, backgroundColor: 'rgba(255,255,255,0.09)', marginHorizontal: 12 },
  tabs: { paddingHorizontal: 16, gap: 8 }, tab: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10 }, tabOn: { backgroundColor: '#2F6BFF' }, tabText: { color: '#7A8799', fontSize: 12, fontWeight: '700' }, tabTextOn: { color: '#FFFFFF' },
  listHeader: { marginTop: 27, marginBottom: 11, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, listTitle: { color: '#273447', fontSize: 17, fontWeight: '900' }, listCaption: { color: '#A1AAB7', fontSize: 9 }, list: { backgroundColor: '#FFFFFF', marginHorizontal: 16, borderRadius: 24, paddingHorizontal: 15 }, row: { minHeight: 78, borderBottomWidth: 1, borderBottomColor: '#F0F2F5', flexDirection: 'row', alignItems: 'center' }, rank: { width: 25, color: '#8B95A1', fontSize: 11, fontWeight: '800' }, avatar: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#EAF1FF', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#2F6BFF', fontSize: 16, fontWeight: '900' }, info: { flex: 1, marginLeft: 11 }, nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 }, name: { color: '#273447', fontSize: 14, fontWeight: '800', maxWidth: 150 }, meta: { color: '#A1AAB7', fontSize: 9, marginTop: 4 }, value: { alignItems: 'flex-end' }, price: { color: '#273447', fontSize: 13, fontWeight: '800' }, change: { fontSize: 10, fontWeight: '800', marginTop: 4 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, backgroundColor: '#FFF4F1', padding: 13, borderRadius: 15 }, errorText: { flex: 1, color: '#8F6159', fontSize: 10 }, retry: { color: '#F06D55', fontSize: 10, fontWeight: '800' }, empty: { alignItems: 'center', paddingVertical: 48 }, emptyTitle: { color: '#536071', fontSize: 14, fontWeight: '800', marginTop: 12 }, emptyText: { color: '#9AA4B2', fontSize: 10, marginTop: 5 }, guide: { flexDirection: 'row', gap: 9, margin: 20, alignItems: 'flex-start' }, guideText: { flex: 1, color: '#8B95A1', fontSize: 10, lineHeight: 16 },
});
