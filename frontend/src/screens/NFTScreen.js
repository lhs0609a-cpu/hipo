import React, { useState, useEffect } from 'react';
import useThemedStyles from '../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { nftAPI } from '../services/api';

const NFTScreen = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('market');

  useEffect(() => {
    fetchNFTs();
  }, [activeTab]);

  const fetchNFTs = async () => {
    try {
      const response = activeTab === 'my'
        ? await nftAPI.getMyNFTs()
        : await nftAPI.getAll();
      setNfts(response.data.nfts || []);
    } catch (error) {
      console.error('Error fetching NFTs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderNFTItem = ({ item }) => (
    <TouchableOpacity
      style={styles.nftCard}
      onPress={() => navigation.navigate('NFTDetail', { nftId: item.id })}
    >
      <View style={styles.nftImageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.nftImage} />
        ) : (
          <View style={styles.nftImagePlaceholder}>
            <Text style={styles.nftEmoji}>🎨</Text>
          </View>
        )}
        {item.rarity && (
          <View style={[styles.rarityBadge, styles[`rarity${item.rarity}`]]}>
            <Text style={styles.rarityText}>{item.rarity}</Text>
          </View>
        )}
      </View>

      <View style={styles.nftInfo}>
        <Text style={styles.nftName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.nftCreator}>
          by {item.creator?.displayName || item.creator?.username || '크리에이터'}
        </Text>
        <View style={styles.nftPriceRow}>
          <Text style={styles.nftPrice}>{(item.price || 0).toLocaleString()}원</Text>
          {item.isOnSale && (
            <View style={styles.saleBadge}>
              <Text style={styles.saleText}>판매중</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2B5FE3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>NFT</Text>
        <Text style={styles.headerSubtitle}>디지털 컬렉션</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'market' && styles.activeTab]}
          onPress={() => setActiveTab('market')}
        >
          <Text style={[styles.tabText, activeTab === 'market' && styles.activeTabText]}>
            마켓플레이스
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && styles.activeTab]}
          onPress={() => setActiveTab('my')}
        >
          <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>
            내 NFT
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={nfts}
        renderItem={renderNFTItem}
        keyExtractor={(item) => item.id?.toString()}
        numColumns={2}
        contentContainerStyle={styles.nftList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchNFTs} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🖼️</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'my' ? '보유한 NFT가 없습니다' : 'NFT가 없습니다'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#8B5CF6',
    paddingTop: 10,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 4,
    margin: 16,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  nftList: {
    padding: 8,
  },
  nftCard: {
    flex: 1,
    margin: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nftImageContainer: {
    aspectRatio: 1,
    position: 'relative',
  },
  nftImage: {
    width: '100%',
    height: '100%',
  },
  nftImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: t.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nftEmoji: {
    fontSize: 48,
  },
  rarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rarityCommon: {
    backgroundColor: t.colors.textTertiary,
  },
  rarityRare: {
    backgroundColor: t.colors.primary,
  },
  rarityEpic: {
    backgroundColor: '#8B5CF6',
  },
  rarityLegendary: {
    backgroundColor: t.colors.warning,
  },
  rarityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  nftInfo: {
    padding: 12,
  },
  nftName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  nftCreator: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  nftPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  nftPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  saleBadge: {
    backgroundColor: t.colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  saleText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
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
  },
});

export default NFTScreen;
