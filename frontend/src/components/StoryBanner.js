import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { FadeIn } from './Animated';
import theme from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STORY_SIZE = 70;

/**
 * StoryBanner Component
 *
 * Instagram-style story banner for creators
 * - Horizontal scrolling
 * - Gradient borders for unviewed stories
 * - Avatar thumbnails
 * - Creator names
 */
const StoryBanner = ({ stories = [], onStoryPress, style }) => {
  if (!stories || stories.length === 0) {
    return null;
  }

  const renderStory = (story, index) => {
    const hasUnviewed = story.hasUnviewed !== false;

    return (
      <FadeIn key={story.id || index} delay={index * 50}>
        <TouchableOpacity
          style={styles.storyContainer}
          onPress={() => onStoryPress?.(story)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.storyAvatarContainer,
            hasUnviewed && styles.storyAvatarContainerUnviewed
          ]}>
            <View style={styles.storyAvatar}>
              {story.profileImage ? (
                <Image
                  source={{ uri: story.profileImage }}
                  style={styles.storyImage}
                />
              ) : (
                <View style={[styles.storyImage, styles.storyImagePlaceholder]}>
                  <Text style={styles.storyImagePlaceholderText}>
                    {story.username?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.storyUsername} numberOfLines={1}>
            {story.username}
          </Text>
        </TouchableOpacity>
      </FadeIn>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {stories.map(renderStory)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.md,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.base,
    gap: theme.spacing.md,
  },
  storyContainer: {
    alignItems: 'center',
    width: STORY_SIZE,
  },
  storyAvatarContainer: {
    width: STORY_SIZE,
    height: STORY_SIZE,
    borderRadius: STORY_SIZE / 2,
    padding: 3,
    marginBottom: theme.spacing.xs,
  },
  storyAvatarContainerUnviewed: {
    background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  storyAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: STORY_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: theme.colors.white,
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  storyImagePlaceholder: {
    backgroundColor: theme.colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyImagePlaceholderText: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.gray500,
  },
  storyUsername: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: STORY_SIZE,
  },
});

export default StoryBanner;
