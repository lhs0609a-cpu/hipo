import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { liveStreamAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const LiveStreamScreen = ({ navigation }) => {
  const { isAuthenticated } = useAuth();
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStreams();
  }, []);

  const fetchStreams = async () => {
    try {
      const response = await liveStreamAPI.getAll();
      setStreams(response.data.streams || []);
    } catch (error) {
      console.error('Error fetching streams:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderStreamItem = ({ item }) => {
    const hostName = item.host?.displayName || item.host?.username || '크리에이터';

    return (
      <TouchableOpacity
        style={styles.streamCard}
        onPress={() => navigation.navigate('LiveStreamDetail', { streamId: item.id })}
      >
        <View style={styles.thumbnailContainer}>
          {item.thumbnail ? (
            <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Text style={styles.thumbnailEmoji}>🎥</Text>
            </View>
          )}
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
          <View style={styles.viewerCount}>
            <Text style={styles.viewerCountText}>👁 {item.viewerCount || 0}</Text>
          </View>
        </View>

        <View style={styles.streamInfo}>
          <View style={styles.hostAvatar}>
            <Text style={styles.hostAvatarText}>
              {hostName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.streamDetails}>
            <Text style={styles.streamTitle} numberOfLines={2}>
              {item.title || '라이브 방송'}
            </Text>
            <Text style={styles.hostName}>{hostName}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>라이브</Text>
        <Text style={styles.headerSubtitle}>실시간 방송</Text>
      </View>

      {isAuthenticated && (
        <TouchableOpacity style={styles.startStreamButton}>
          <Text style={styles.startStreamIcon}>📹</Text>
          <Text style={styles.startStreamText}>라이브 시작하기</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={streams}
        renderItem={renderStreamItem}
        keyExtractor={(item) => item.id?.toString()}
        numColumns={2}
        contentContainerStyle={styles.streamsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchStreams} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📺</Text>
            <Text style={styles.emptyText}>진행 중인 라이브가 없습니다</Text>
            <Text style={styles.emptySubtext}>나중에 다시 확인해주세요</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#e74c3c',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  startStreamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e74c3c',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  startStreamIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  startStreamText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  streamsList: {
    padding: 8,
  },
  streamCard: {
    flex: 1,
    margin: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnailContainer: {
    position: 'relative',
    aspectRatio: 16 / 9,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailEmoji: {
    fontSize: 40,
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#e74c3c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  viewerCount: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  viewerCountText: {
    color: '#fff',
    fontSize: 12,
  },
  streamInfo: {
    flexDirection: 'row',
    padding: 12,
  },
  hostAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  hostAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  streamDetails: {
    flex: 1,
  },
  streamTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  hostName: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
});

export default LiveStreamScreen;
