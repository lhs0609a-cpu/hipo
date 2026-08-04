import React, { useState, useEffect } from 'react';
import { getAppWidth, getAppHeight } from '../utils/appWidth';
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
  Modal,
} from 'react-native';
import { storyAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const width = getAppWidth();
const height = getAppHeight();

const StoryScreen = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState(null);
  const [storyIndex, setStoryIndex] = useState(0);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const response = await storyAPI.getAll();
      setStories(response.data.stories || []);
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStoryPress = (story, index) => {
    setSelectedStory(story);
    setStoryIndex(index);
    storyAPI.view(story.id).catch(() => {});
  };

  const handleNextStory = () => {
    if (storyIndex < stories.length - 1) {
      const nextIndex = storyIndex + 1;
      setStoryIndex(nextIndex);
      setSelectedStory(stories[nextIndex]);
      storyAPI.view(stories[nextIndex].id).catch(() => {});
    } else {
      setSelectedStory(null);
    }
  };

  const renderStoryItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.storyItem}
      onPress={() => handleStoryPress(item, index)}
    >
      <View style={[styles.storyRing, item.viewed ? styles.viewedRing : styles.unviewedRing]}>
        <View style={styles.storyAvatar}>
          {item.user?.profileImage ? (
            <Image source={{ uri: item.user.profileImage }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {(item.user?.displayName || item.user?.username || 'U').charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
      </View>
      <Text style={styles.storyUsername} numberOfLines={1}>
        {item.user?.displayName || item.user?.username || '사용자'}
      </Text>
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
        <Text style={styles.headerTitle}>스토리</Text>
      </View>

      {isAuthenticated && (
        <TouchableOpacity style={styles.addStoryButton}>
          <View style={styles.addStoryIcon}>
            <Text style={styles.plusIcon}>+</Text>
          </View>
          <Text style={styles.addStoryText}>내 스토리</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={stories}
        renderItem={renderStoryItem}
        keyExtractor={(item) => item.id?.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>스토리가 없습니다</Text>
          </View>
        }
      />

      <Modal
        visible={!!selectedStory}
        animationType="fade"
        onRequestClose={() => setSelectedStory(null)}
      >
        <TouchableOpacity
          style={styles.storyModal}
          activeOpacity={1}
          onPress={handleNextStory}
        >
          <View style={[styles.storyHeader, { paddingTop: insets.top + 10 }]}>
            <View style={styles.storyUserInfo}>
              <View style={styles.storyUserAvatar}>
                <Text style={styles.storyUserAvatarText}>
                  {(selectedStory?.user?.displayName || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.storyUserName}>
                {selectedStory?.user?.displayName || selectedStory?.user?.username}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedStory(null)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.storyContent}>
            {selectedStory?.image ? (
              <Image source={{ uri: selectedStory.image }} style={styles.storyImage} />
            ) : (
              <View style={styles.storyTextContainer}>
                <Text style={styles.storyText}>{selectedStory?.content}</Text>
              </View>
            )}
          </View>

          <View style={styles.progressBar}>
            {stories.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressSegment,
                  i <= storyIndex && styles.progressSegmentActive,
                ]}
              />
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
    backgroundColor: t.colors.primary,
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.surface,
  },
  addStoryButton: {
    alignItems: 'center',
    padding: 16,
  },
  addStoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: t.colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  plusIcon: {
    fontSize: 28,
    fontFamily: t.fonts.regular,
    color: t.colors.primary,
  },
  addStoryText: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  storiesList: {
    paddingHorizontal: 16,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 72,
  },
  storyRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 3,
    marginBottom: 6,
  },
  unviewedRing: {
    backgroundColor: t.colors.primary,
  },
  viewedRing: {
    backgroundColor: t.colors.borderDark,
  },
  storyAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: t.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  avatarText: {
    fontSize: 24,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.primary,
  },
  storyUsername: {
    fontSize: 12,
    fontFamily: t.fonts.regular,
    color: t.colors.textPrimary,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 17,
    fontFamily: t.fonts.regular,
    color: t.colors.textSecondary,
  },
  storyModal: {
    flex: 1,
    backgroundColor: t.colors.textPrimary,
  },
  storyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  storyUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  storyUserAvatarText: {
    fontSize: 17,
    fontFamily: t.fonts.bold,
    fontWeight: 'bold',
    color: t.colors.primary,
  },
  storyUserName: {
    fontSize: 15,
    fontFamily: t.fonts.semibold,
    fontWeight: '600',
    color: t.colors.surface,
  },
  closeButton: {
    fontSize: 24,
    fontFamily: t.fonts.regular,
    color: t.colors.surface,
    padding: 8,
  },
  storyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyImage: {
    width: width,
    height: height * 0.7,
    resizeMode: 'contain',
  },
  storyTextContainer: {
    padding: 40,
  },
  storyText: {
    fontSize: 24,
    fontFamily: t.fonts.regular,
    color: t.colors.surface,
    textAlign: 'center',
    lineHeight: 36,
  },
  progressBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 4,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  progressSegmentActive: {
    backgroundColor: t.colors.surface,
  },
});

export default StoryScreen;
