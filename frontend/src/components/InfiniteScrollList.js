import React, { useState, useCallback, useRef } from 'react';
import {
  FlatList,
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  RefreshControl,
} from 'react-native';

/**
 * InfiniteScrollList Component
 *
 * Features:
 * - Automatic pagination on scroll
 * - Pull-to-refresh
 * - Loading states
 * - End of list detection
 * - Error handling
 * - Configurable threshold
 */
const InfiniteScrollList = ({
  data,
  renderItem,
  onLoadMore,
  onRefresh,
  loading = false,
  refreshing = false,
  hasMore = true,
  ListHeaderComponent,
  ListEmptyComponent,
  ListFooterComponent,
  keyExtractor,
  threshold = 0.5, // Load more when 50% from bottom
  ...props
}) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingRef = useRef(false);

  const handleLoadMore = useCallback(async () => {
    // Prevent multiple simultaneous loads
    if (loadingRef.current || !hasMore || loading) {
      return;
    }

    loadingRef.current = true;
    setIsLoadingMore(true);

    try {
      await onLoadMore?.();
    } catch (error) {
      console.error('Error loading more:', error);
    } finally {
      loadingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [hasMore, loading, onLoadMore]);

  const handleRefresh = useCallback(async () => {
    try {
      await onRefresh?.();
    } catch (error) {
      console.error('Error refreshing:', error);
    }
  }, [onRefresh]);

  const renderFooter = () => {
    if (!hasMore && data.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>더 이상 항목이 없습니다</Text>
        </View>
      );
    }

    if (isLoadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color="#4caf50" />
        </View>
      );
    }

    return ListFooterComponent || null;
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#4caf50" />
        </View>
      );
    }

    return (
      ListEmptyComponent || (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>항목이 없습니다</Text>
        </View>
      )
    );
  };

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor || ((item, index) => `item-${index}`)}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={threshold}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4caf50']}
            tintColor="#4caf50"
          />
        ) : undefined
      }
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      removeClippedSubviews={true} // Performance optimization
      maxToRenderPerBatch={10} // Render 10 items per batch
      updateCellsBatchingPeriod={50} // Update every 50ms
      initialNumToRender={10} // Render 10 items initially
      windowSize={10} // Keep 10 screens worth of items in memory
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default InfiniteScrollList;
