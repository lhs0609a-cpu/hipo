import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { storyAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

const StoryScreen = ({ navigation }) => {
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
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
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
          <View style={styles.storyHeader}>
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
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addStoryButton: {
    alignItems: 'center',
    padding: 16,
  },
  addStoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  plusIcon: {
    fontSize: 32,
    color: '#007AFF',
  },
  addStoryText: {
    fontSize: 12,
    color: '#666',
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
    backgroundColor: '#007AFF',
  },
  viewedRing: {
    backgroundColor: '#ccc',
  },
  storyAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: '#fff',
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
    fontWeight: 'bold',
    color: '#007AFF',
  },
  storyUsername: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  storyModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
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
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  storyUserAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  storyUserName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    fontSize: 24,
    color: '#fff',
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
    color: '#fff',
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
    backgroundColor: '#fff',
  },
});

export default StoryScreen;
