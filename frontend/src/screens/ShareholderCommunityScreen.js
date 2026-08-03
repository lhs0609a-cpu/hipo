import React, { useState, useEffect, useRef, useCallback } from 'react';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { shareholderCommunityAPI } from '../services/api';
import shareholderSocketService from '../services/shareholderSocketService';
import { useAuth } from '../contexts/AuthContext';

// 티어 정보
const TIER_INFO = {
  VIP: { badge: '👑', color: '#D9A521', name: 'VIP', gradient: ['#D9A521', '#F59B00'] },
  PREMIUM: { badge: '⭐', color: '#9BA3AF', name: '프리미엄', gradient: ['#9BA3AF', '#A3ABBA'] },
  REGULAR: { badge: '🔹', color: '#B87333', name: '일반', gradient: ['#B87333', '#8A5626'] },
  NONE: { badge: '', color: '#5D6779', name: '비주주', gradient: ['#5D6779', '#454E5E'] },
};

export default function ShareholderCommunityScreen({ route, navigation }) {
  const styles = useThemedStyles(makeStyles);
  const { stockId, communityId: initialCommunityId } = route.params || {};
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [community, setCommunity] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [notices, setNotices] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('chat');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);

  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // 소켓 연결 및 이벤트 설정
  useEffect(() => {
    let cleanupFunctions = [];

    const setupSocket = async () => {
      try {
        await shareholderSocketService.connect();
        setSocketConnected(true);

        // 새 메시지 리스너
        const removeNewMessage = shareholderSocketService.addListener('new_message', (message) => {
          setMessages(prev => [...prev, message]);
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        });
        cleanupFunctions.push(removeNewMessage);

        // 접속자 수 리스너
        const removeOnlineCount = shareholderSocketService.addListener('online_count', (data) => {
          setOnlineCount(data.count);
        });
        cleanupFunctions.push(removeOnlineCount);

        // 타이핑 리스너
        const removeTyping = shareholderSocketService.addListener('typing', (data) => {
          if (data.isTyping) {
            setTypingUsers(prev => {
              if (!prev.find(u => u.userId === data.userId)) {
                return [...prev, { userId: data.userId, username: data.username, tier: data.tier }];
              }
              return prev;
            });
          } else {
            setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
          }
        });
        cleanupFunctions.push(removeTyping);

        // 사용자 입장/퇴장 리스너
        const removeUserJoined = shareholderSocketService.addListener('user_joined', (data) => {
          setOnlineCount(data.onlineCount);
        });
        cleanupFunctions.push(removeUserJoined);

        const removeUserLeft = shareholderSocketService.addListener('user_left', (data) => {
          setOnlineCount(data.onlineCount);
        });
        cleanupFunctions.push(removeUserLeft);

        // 시스템 메시지 리스너
        const removeSystem = shareholderSocketService.addListener('system', (data) => {
          // 시스템 메시지 처리 (경고, 퇴장 등)
          if (data.type === 'warning') {
            Alert.alert('경고', data.message);
          } else if (data.type === 'ban') {
            Alert.alert('퇴장', data.message);
            navigation.goBack();
          }
        });
        cleanupFunctions.push(removeSystem);

        // 공지사항 리스너
        const removeNotice = shareholderSocketService.addListener('new_notice', (notice) => {
          setNotices(prev => [notice, ...prev]);
          Alert.alert('새 공지', notice.title);
        });
        cleanupFunctions.push(removeNotice);

      } catch (error) {
        console.error('소켓 연결 실패:', error);
        setSocketConnected(false);
      }
    };

    setupSocket();

    return () => {
      cleanupFunctions.forEach(fn => fn());
      shareholderSocketService.leaveCommunity();
    };
  }, []);

  // 커뮤니티 로드 후 소켓 방 참여
  useEffect(() => {
    if (community && userInfo?.isMember && socketConnected) {
      const isVipRoom = activeTab === 'vip';
      shareholderSocketService.joinCommunity(community.id, isVipRoom);
    }
  }, [community, userInfo?.isMember, socketConnected, activeTab]);

  useEffect(() => {
    loadCommunity();
  }, [stockId, initialCommunityId]);

  const loadCommunity = async () => {
    try {
      setLoading(true);

      let communityData;
      if (initialCommunityId) {
        communityData = await shareholderCommunityAPI.getDetail(initialCommunityId);
      } else if (stockId) {
        const stockCommunity = await shareholderCommunityAPI.getByStock(stockId);
        if (stockCommunity?.data) {
          communityData = await shareholderCommunityAPI.getDetail(stockCommunity.data.id);
        }
      }

      if (communityData?.data) {
        setCommunity(communityData.data.community);
        setUserInfo(communityData.data.userInfo);

        if (communityData.data.userInfo?.canAccess) {
          await loadMessages(communityData.data.community.id);
          await loadNotices(communityData.data.community.id);
          await loadMembers(communityData.data.community.id);
        }
      }
    } catch (error) {
      console.error('Load community error:', error);
      Alert.alert('오류', '커뮤니티를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (communityId, isVipRoom = false) => {
    try {
      const response = await shareholderCommunityAPI.getMessages(communityId, { isVipRoom: isVipRoom ? 'true' : 'false' });
      setMessages(response.data || []);
    } catch (error) {
      console.error('Load messages error:', error);
    }
  };

  const loadNotices = async (communityId) => {
    try {
      const response = await shareholderCommunityAPI.getNotices(communityId, {});
      setNotices(response.data?.rows || []);
    } catch (error) {
      console.error('Load notices error:', error);
    }
  };

  const loadMembers = async (communityId) => {
    try {
      const response = await shareholderCommunityAPI.getMembers(communityId, {});
      setMembers(response.data?.members || []);
    } catch (error) {
      console.error('Load members error:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCommunity();
    setRefreshing(false);
  }, []);

  const handleTabChange = async (tab) => {
    setActiveTab(tab);

    if (tab === 'chat' || tab === 'vip') {
      const isVipRoom = tab === 'vip';

      // 이전 메시지 로드
      await loadMessages(community.id, isVipRoom);

      // 소켓 방 변경
      if (socketConnected) {
        shareholderSocketService.leaveCommunity();
        shareholderSocketService.joinCommunity(community.id, isVipRoom);
      }
    }
  };

  const handleJoin = async () => {
    try {
      await shareholderCommunityAPI.join(community.id);
      Alert.alert('성공', '커뮤니티에 가입했습니다');
      await loadCommunity();
    } catch (error) {
      Alert.alert('오류', error.response?.data?.error || '가입에 실패했습니다');
    }
  };

  const handleLeave = () => {
    Alert.alert(
      '커뮤니티 탈퇴',
      '정말 커뮤니티를 탈퇴하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: async () => {
            try {
              shareholderSocketService.leaveCommunity();
              await shareholderCommunityAPI.leave(community.id);
              Alert.alert('완료', '커뮤니티를 탈퇴했습니다');
              await loadCommunity();
            } catch (error) {
              Alert.alert('오류', error.response?.data?.error || '탈퇴에 실패했습니다');
            }
          },
        },
      ]
    );
  };

  // 메시지 입력 시 타이핑 표시
  const handleMessageChange = (text) => {
    setMessageText(text);

    // 타이핑 시작 알림
    if (text.length > 0) {
      shareholderSocketService.startTyping(user?.username, userInfo?.tier);

      // 기존 타이머 제거
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // 2초 후 타이핑 종료
      typingTimeoutRef.current = setTimeout(() => {
        shareholderSocketService.stopTyping();
      }, 2000);
    } else {
      shareholderSocketService.stopTyping();
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || sending) return;

    const content = messageText.trim();
    setMessageText('');
    shareholderSocketService.stopTyping();

    try {
      setSending(true);
      const isVipRoom = activeTab === 'vip';

      // 소켓으로 실시간 전송
      const sent = shareholderSocketService.sendMessage(
        content,
        {
          username: user?.username,
          displayName: user?.displayName || user?.username,
          profileImage: user?.profileImage
        },
        userInfo?.tier,
        userInfo?.tierBadge,
        userInfo?.tierColor,
        userInfo?.shares
      );

      // 소켓 전송 실패 시 API로 전송
      if (!sent) {
        await shareholderCommunityAPI.sendMessage(community.id, content, isVipRoom);
        await loadMessages(community.id, isVipRoom);
      }

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      Alert.alert('오류', error.response?.data?.error || '메시지 전송에 실패했습니다');
      setMessageText(content); // 실패 시 메시지 복구
    } finally {
      setSending(false);
    }
  };

  const renderTierBadge = (tier) => {
    const tierInfo = TIER_INFO[tier] || TIER_INFO.NONE;
    return (
      <View style={[styles.tierBadge, { backgroundColor: tierInfo.color + '30' }]}>
        <Text style={styles.tierBadgeText}>{tierInfo.badge} {tierInfo.name}</Text>
      </View>
    );
  };

  const renderMessage = ({ item }) => {
    const tierInfo = TIER_INFO[item.tier] || TIER_INFO.REGULAR;
    const isOwnMessage = item.author?.id === user?.id;

    return (
      <View style={[styles.messageContainer, isOwnMessage && styles.ownMessageContainer]}>
        {!isOwnMessage && (
          <Image
            source={{ uri: item.author?.profileImage || 'https://via.placeholder.com/40' }}
            style={styles.messageAvatar}
          />
        )}
        <View style={[styles.messageContent, isOwnMessage && styles.ownMessageContent]}>
          <View style={styles.messageHeader}>
            <Text style={[styles.messageName, { color: tierInfo.color }]}>
              {tierInfo.badge} {item.author?.displayName || item.author?.username}
            </Text>
            <Text style={styles.messageShares}>{item.shareholding?.toLocaleString()}주</Text>
          </View>
          <Text style={styles.messageText}>{item.content}</Text>
          <Text style={styles.messageTime}>
            {new Date(item.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {isOwnMessage && (
          <Image
            source={{ uri: user?.profileImage || 'https://via.placeholder.com/40' }}
            style={styles.messageAvatar}
          />
        )}
        {item.isPinned && (
          <View style={styles.pinnedBadge}>
            <Text style={styles.pinnedText}>📌</Text>
          </View>
        )}
      </View>
    );
  };

  const renderNotice = ({ item }) => (
    <TouchableOpacity style={styles.noticeCard}>
      <View style={styles.noticeHeader}>
        {item.isPinned && <Text style={styles.pinnedIcon}>📌</Text>}
        <Text style={styles.noticeTitle}>{item.title}</Text>
      </View>
      <Text style={styles.noticeContent} numberOfLines={2}>{item.content}</Text>
      <View style={styles.noticeFooter}>
        <Text style={styles.noticeAuthor}>{item.author?.displayName || item.author?.username}</Text>
        <Text style={styles.noticeDate}>
          {new Date(item.createdAt).toLocaleDateString('ko-KR')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderMember = ({ item }) => {
    const tierInfo = TIER_INFO[item.tier] || TIER_INFO.REGULAR;

    return (
      <View style={styles.memberCard}>
        <Image
          source={{ uri: item.user?.profileImage || 'https://via.placeholder.com/50' }}
          style={styles.memberAvatar}
        />
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={[styles.memberName, { color: tierInfo.color }]}>
              {tierInfo.badge} {item.user?.displayName || item.user?.username}
            </Text>
          </View>
          <Text style={styles.memberShares}>{item.currentShareholding?.toLocaleString()}주 보유</Text>
        </View>
        <View style={styles.memberStats}>
          <Text style={styles.memberStatText}>메시지 {item.messageCount}</Text>
          <Text style={styles.memberStatText}>활동점수 {item.activityScore}</Text>
        </View>
      </View>
    );
  };

  // 타이핑 표시 렌더링
  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;

    const names = typingUsers.map(u => u.username).join(', ');
    return (
      <View style={styles.typingContainer}>
        <Text style={styles.typingText}>
          {names}님이 입력 중...
        </Text>
        <View style={styles.typingDots}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00B368" />
          <Text style={styles.loadingText}>커뮤니티 로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!community) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏠</Text>
          <Text style={styles.emptyTitle}>커뮤니티 없음</Text>
          <Text style={styles.emptyText}>아직 이 크리에이터의 주주 커뮤니티가 없습니다</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!userInfo?.canAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#0E1219', '#182F68']} style={styles.accessDenied}>
          <Text style={styles.accessDeniedIcon}>🔒</Text>
          <Text style={styles.accessDeniedTitle}>주주 전용 커뮤니티</Text>
          <Text style={styles.accessDeniedText}>
            이 커뮤니티에 입장하려면 최소 {community.minSharesRequired}주를 보유해야 합니다
          </Text>
          <View style={styles.userSharesBox}>
            <Text style={styles.userSharesLabel}>내 보유량</Text>
            <Text style={styles.userSharesValue}>{userInfo?.shares?.toLocaleString() || 0}주</Text>
          </View>
          <View style={styles.tierRequirements}>
            <Text style={styles.tierReqTitle}>등급별 최소 보유량</Text>
            <View style={styles.tierReqRow}>
              <Text style={styles.tierReqLabel}>👑 VIP</Text>
              <Text style={styles.tierReqValue}>{community.vipMinShares?.toLocaleString()}주</Text>
            </View>
            <View style={styles.tierReqRow}>
              <Text style={styles.tierReqLabel}>⭐ 프리미엄</Text>
              <Text style={styles.tierReqValue}>{community.premiumMinShares?.toLocaleString()}주</Text>
            </View>
            <View style={styles.tierReqRow}>
              <Text style={styles.tierReqLabel}>🔹 일반</Text>
              <Text style={styles.tierReqValue}>{community.regularMinShares?.toLocaleString()}주</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.buyStockButton} onPress={() => navigation.navigate('StockDetail', { stockId })}>
            <Text style={styles.buyStockButtonText}>주식 구매하러 가기</Text>
          </TouchableOpacity>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{community.name}</Text>
          <View style={styles.headerStats}>
            {renderTierBadge(userInfo?.tier)}
            <Text style={styles.headerMemberCount}>{community.memberCount} 멤버</Text>
            {socketConnected && (
              <View style={styles.onlineIndicator}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineCount}>{onlineCount} 온라인</Text>
              </View>
            )}
          </View>
        </View>
        {userInfo?.isMember ? (
          <TouchableOpacity onPress={handleLeave} style={styles.leaveBtn}>
            <Text style={styles.leaveBtnText}>탈퇴</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleJoin} style={styles.joinBtn}>
            <Text style={styles.joinBtnText}>가입</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 연결 상태 표시 */}
      {!socketConnected && (
        <View style={styles.connectionWarning}>
          <Text style={styles.connectionWarningText}>⚠️ 실시간 연결 중...</Text>
        </View>
      )}

      {/* 탭 */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
          onPress={() => handleTabChange('chat')}
        >
          <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>💬 채팅</Text>
        </TouchableOpacity>
        {userInfo?.canAccessVipRoom && community.vipRoomEnabled && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'vip' && styles.activeTab]}
            onPress={() => handleTabChange('vip')}
          >
            <Text style={[styles.tabText, activeTab === 'vip' && styles.activeTabText]}>👑 VIP</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notice' && styles.activeTab]}
          onPress={() => setActiveTab('notice')}
        >
          <Text style={[styles.tabText, activeTab === 'notice' && styles.activeTabText]}>📢 공지</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'member' && styles.activeTab]}
          onPress={() => setActiveTab('member')}
        >
          <Text style={[styles.tabText, activeTab === 'member' && styles.activeTabText]}>👥 멤버</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
        keyboardVerticalOffset={100}
      >
        {/* 채팅 탭 */}
        {(activeTab === 'chat' || activeTab === 'vip') && (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item, index) => item.id || `msg-${index}`}
              renderItem={renderMessage}
              contentContainerStyle={styles.messageList}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00B368" />
              }
              ListEmptyComponent={
                <View style={styles.emptyMessages}>
                  <Text style={styles.emptyMessagesIcon}>💬</Text>
                  <Text style={styles.emptyMessagesText}>
                    {activeTab === 'vip' ? 'VIP 채팅방에 첫 메시지를 남겨보세요!' : '첫 메시지를 남겨보세요!'}
                  </Text>
                </View>
              }
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />

            {/* 타이핑 표시 */}
            {renderTypingIndicator()}

            {/* 메시지 입력 */}
            {userInfo?.isMember && community.chatEnabled && (
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.messageInput}
                  placeholder="메시지를 입력하세요..."
                  placeholderTextColor="#666"
                  value={messageText}
                  onChangeText={handleMessageChange}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
                  onPress={handleSendMessage}
                  disabled={!messageText.trim() || sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.sendButtonText}>전송</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* 공지사항 탭 */}
        {activeTab === 'notice' && (
          <FlatList
            data={notices}
            keyExtractor={(item) => item.id}
            renderItem={renderNotice}
            contentContainerStyle={styles.noticeList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00B368" />
            }
            ListEmptyComponent={
              <View style={styles.emptyNotices}>
                <Text style={styles.emptyNoticesIcon}>📢</Text>
                <Text style={styles.emptyNoticesText}>아직 공지사항이 없습니다</Text>
              </View>
            }
          />
        )}

        {/* 멤버 탭 */}
        {activeTab === 'member' && (
          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            renderItem={renderMember}
            contentContainerStyle={styles.memberList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00B368" />
            }
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.backgroundPure,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#aaa',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#333',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  accessDeniedIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  accessDeniedText: {
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 16,
  },
  userSharesBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  userSharesLabel: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
  },
  userSharesValue: {
    color: t.colors.success,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tierRequirements: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  tierReqTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  tierReqRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tierReqLabel: {
    color: '#ccc',
    fontSize: 15,
  },
  tierReqValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buyStockButton: {
    backgroundColor: t.colors.success,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  buyStockButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: t.colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backBtn: {
    padding: 8,
    marginRight: 12,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 24,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  tierBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  headerMemberCount: {
    color: '#888',
    fontSize: 12,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: t.colors.success,
    marginRight: 4,
  },
  onlineCount: {
    color: t.colors.success,
    fontSize: 12,
  },
  joinBtn: {
    backgroundColor: t.colors.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  leaveBtn: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  leaveBtnText: {
    color: '#999',
  },
  connectionWarning: {
    backgroundColor: t.colors.warning,
    padding: 8,
    alignItems: 'center',
  },
  connectionWarningText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: t.colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: t.colors.success,
  },
  tabText: {
    color: '#888',
    fontSize: 14,
  },
  activeTabText: {
    color: t.colors.success,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    paddingBottom: 80,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: t.colors.textPrimary,
    borderRadius: 12,
    padding: 12,
  },
  ownMessageContainer: {
    backgroundColor: '#0B2E22',
  },
  messageAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  messageContent: {
    flex: 1,
  },
  ownMessageContent: {
    marginRight: 12,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageName: {
    fontWeight: '600',
    marginRight: 8,
  },
  messageShares: {
    color: '#666',
    fontSize: 11,
  },
  messageText: {
    color: '#ddd',
    lineHeight: 20,
  },
  messageTime: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
  },
  pinnedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  pinnedText: {
    fontSize: 16,
  },
  emptyMessages: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyMessagesIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyMessagesText: {
    color: '#888',
    fontSize: 15,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: t.colors.textPrimary,
  },
  typingText: {
    color: '#888',
    fontSize: 12,
    marginRight: 8,
  },
  typingDots: {
    flexDirection: 'row',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: t.colors.success,
    marginHorizontal: 2,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: t.colors.textPrimary,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  messageInput: {
    flex: 1,
    backgroundColor: t.colors.surfaceOverlay,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: t.colors.success,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  noticeList: {
    padding: 16,
  },
  noticeCard: {
    backgroundColor: t.colors.textPrimary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pinnedIcon: {
    marginRight: 8,
  },
  noticeTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  noticeContent: {
    color: '#aaa',
    lineHeight: 20,
    marginBottom: 12,
  },
  noticeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noticeAuthor: {
    color: '#666',
    fontSize: 12,
  },
  noticeDate: {
    color: '#666',
    fontSize: 12,
  },
  emptyNotices: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyNoticesIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyNoticesText: {
    color: '#888',
    fontSize: 15,
  },
  memberList: {
    padding: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.textPrimary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  memberShares: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  memberStats: {
    alignItems: 'flex-end',
  },
  memberStatText: {
    color: '#666',
    fontSize: 11,
  },
});
