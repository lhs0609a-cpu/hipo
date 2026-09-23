import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPosts, likePost, getMyInvestmentNews } from '../api/posts';

const tabs = [{ id: 'investment', label: '응원 중' }, { id: 'all', label: '전체' }, { id: 'following', label: '팔로잉' }];

export default function CommunityScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [feedType, setFeedType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = feedType === 'investment' ? await getMyInvestmentNews() : await getPosts(1, 20, feedType === 'following' ? 'following' : null);
      setPosts(data.news || data.posts || []);
    } catch (_) {
      setPosts([]);
    } finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { setLoading(true); load(); }, [feedType]);

  const toggleLike = async item => {
    try { await likePost(item.id); setPosts(current => current.map(post => post.id === item.id ? { ...post, isLiked: !post.isLiked, likesCount: Number(post.likesCount || 0) + (post.isLiked ? -1 : 1) } : post)); } catch (_) {}
  };
  const formatDate = value => {
    if (!value) return '';
    const diff = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
    if (diff < 60) return '방금 전'; if (diff < 3600) return `${Math.floor(diff / 60)}분 전`; if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`; return new Date(value).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const renderPost = ({ item }) => {
    const author = item.author || item.user || {};
    return <Pressable style={styles.card} onPress={() => navigation.navigate('PostDetail', { postId: item.id })}>
      <View style={styles.cardHeader}>
        <Pressable style={styles.author} onPress={() => author.id && navigation.navigate('Profile', { userId: author.id })}>
          <View style={styles.avatar}>{author.profileImage ? <Image source={{ uri: author.profileImage }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{author.username?.[0]?.toUpperCase() || '?'}</Text>}</View>
          <View><View style={styles.nameRow}><Text style={styles.name}>{author.username || 'HIPO 크리에이터'}</Text>{author.isVerified && <Ionicons name="checkmark-circle" size={15} color="#2F6BFF" />}</View><Text style={styles.meta}>{formatDate(item.createdAt)} · {item.visibilityType === 'SHAREHOLDERS_ONLY' ? '주주에게만' : '모두에게'}</Text></View>
        </Pressable>
        <Ionicons name="ellipsis-horizontal" size={20} color="#A1AAB7" />
      </View>
      {item.contentLocked ? <View style={styles.locked}><View style={styles.lockIcon}><Ionicons name="lock-closed" size={18} color="#7656D6" /></View><Text style={styles.lockTitle}>주주에게 먼저 전한 소식이에요</Text><Text style={styles.lockText}>{item.content || '이 크리에이터를 보유하면 내용을 볼 수 있어요.'}</Text></View> : <>
        {!!item.content && <Text style={styles.content}>{item.content}</Text>}
        {!!item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.postImage} resizeMode="cover" />}
      </>}
      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={() => toggleLike(item)}><Ionicons name={item.isLiked ? 'heart' : 'heart-outline'} size={21} color={item.isLiked ? '#F04452' : '#6B7684'} /><Text style={[styles.actionText, item.isLiked && { color: '#F04452' }]}>{item.likesCount || 0}</Text></Pressable>
        <Pressable style={styles.action} onPress={() => navigation.navigate('PostDetail', { postId: item.id })}><Ionicons name="chatbubble-outline" size={20} color="#6B7684" /><Text style={styles.actionText}>{item.commentsCount || 0}</Text></Pressable>
        <View style={{ flex: 1 }} /><Pressable><Ionicons name="bookmark-outline" size={20} color="#6B7684" /></Pressable>
      </View>
    </Pressable>;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.shell}>
        <View style={styles.header}><View><Text style={styles.eyebrow}>PEOPLE'S STORY</Text><Text style={styles.title}>사람들의 지금</Text></View><Pressable style={styles.write} onPress={() => navigation.navigate('CreatePost')}><Ionicons name="create-outline" size={20} color="#FFFFFF" /><Text style={styles.writeText}>글쓰기</Text></Pressable></View>
        <View style={styles.tabs}>{tabs.map(tab => <Pressable key={tab.id} style={[styles.tab, feedType === tab.id && styles.tabOn]} onPress={() => setFeedType(tab.id)}><Text style={[styles.tabText, feedType === tab.id && styles.tabTextOn]}>{tab.label}</Text></Pressable>)}</View>
        {loading ? <View style={styles.center}><ActivityIndicator color="#2F6BFF" /></View> : <FlatList data={posts} renderItem={renderPost} keyExtractor={(item, index) => String(item.id || index)} showsVerticalScrollIndicator={false} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#2F6BFF" />} ListHeaderComponent={<View style={styles.intro}><View style={styles.introIcon}><Ionicons name="sparkles" size={18} color="#7656D6" /></View><View><Text style={styles.introTitle}>가격보다 먼저, 사람의 변화를</Text><Text style={styles.introText}>응원하는 크리에이터의 이야기를 가까이에서 만나보세요.</Text></View></View>} ListEmptyComponent={<View style={styles.empty}><Ionicons name="chatbubbles-outline" size={38} color="#B7C0CC" /><Text style={styles.emptyTitle}>아직 도착한 이야기가 없어요</Text><Text style={styles.emptyText}>새로운 사람을 발견하거나 첫 글을 남겨보세요.</Text><Pressable style={styles.emptyButton} onPress={() => navigation.navigate('StockMarket')}><Text style={styles.emptyButtonText}>사람 발견하기</Text></Pressable></View>} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F8FB' }, shell: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 17, paddingBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF' },
  eyebrow: { color: '#7656D6', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, title: { color: '#182335', fontSize: 25, fontWeight: '900', letterSpacing: -0.7, marginTop: 4 },
  write: { height: 40, borderRadius: 14, backgroundColor: '#2F6BFF', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }, writeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  tabs: { flexDirection: 'row', gap: 7, paddingHorizontal: 16, paddingBottom: 13, backgroundColor: '#FFFFFF' }, tab: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 12, backgroundColor: '#F2F4F7' }, tabOn: { backgroundColor: '#1C2B42' }, tabText: { color: '#7A8799', fontSize: 12, fontWeight: '700' }, tabTextOn: { color: '#FFFFFF' },
  list: { padding: 14, paddingBottom: 38 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  intro: { flexDirection: 'row', gap: 11, alignItems: 'center', backgroundColor: '#F1EDFF', borderRadius: 20, padding: 15, marginBottom: 11 }, introIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, introTitle: { color: '#493A81', fontSize: 13, fontWeight: '800' }, introText: { color: '#7B6DA9', fontSize: 10, marginTop: 4, maxWidth: 310 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 17, marginBottom: 11 }, cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, author: { flexDirection: 'row', alignItems: 'center', gap: 11 }, avatar: { width: 43, height: 43, borderRadius: 15, backgroundColor: '#EAF1FF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, avatarImage: { width: '100%', height: '100%' }, avatarText: { color: '#2F6BFF', fontSize: 16, fontWeight: '900' }, nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 }, name: { color: '#273447', fontSize: 13, fontWeight: '800' }, meta: { color: '#A1AAB7', fontSize: 9, marginTop: 4 },
  content: { color: '#394860', fontSize: 14, lineHeight: 22, marginTop: 16 }, postImage: { width: '100%', aspectRatio: 1.45, borderRadius: 18, marginTop: 14, backgroundColor: '#EDF0F4' },
  locked: { alignItems: 'center', backgroundColor: '#F7F5FF', borderRadius: 18, padding: 22, marginTop: 15 }, lockIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#EEE9FF', alignItems: 'center', justifyContent: 'center' }, lockTitle: { color: '#493A81', fontSize: 13, fontWeight: '800', marginTop: 10 }, lockText: { color: '#8C80B4', fontSize: 10, marginTop: 5, textAlign: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 13, borderTopWidth: 1, borderTopColor: '#F0F2F5' }, action: { flexDirection: 'row', alignItems: 'center', gap: 5, marginRight: 20 }, actionText: { color: '#6B7684', fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 70 }, emptyTitle: { color: '#536071', fontSize: 15, fontWeight: '800', marginTop: 13 }, emptyText: { color: '#9AA4B2', fontSize: 11, marginTop: 6 }, emptyButton: { backgroundColor: '#EAF1FF', borderRadius: 14, paddingHorizontal: 17, paddingVertical: 11, marginTop: 18 }, emptyButtonText: { color: '#2F6BFF', fontSize: 12, fontWeight: '800' },
});
