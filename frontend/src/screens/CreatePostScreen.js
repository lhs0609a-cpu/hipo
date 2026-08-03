import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import useThemedStyles from '../hooks/useThemedStyles';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createPost, uploadImage } from '../api/posts';
import { COLORS } from '../constants/colors';

export default function CreatePostScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [visibilityType, setVisibilityType] = useState('PUBLIC');
  const [minimumShares, setMinimumShares] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        const message = '갤러리 접근 권한이 필요합니다';
        Platform.OS === 'web' ? alert(message) : Alert.alert('권한 필요', message);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0]);
      }
    } catch (error) {
      console.error('이미지 선택 오류:', error);
    }
  };

  const handlePost = async () => {
    if (!content && !image) {
      const message = '내용 또는 이미지를 입력해주세요';
      Platform.OS === 'web' ? alert(message) : Alert.alert('알림', message);
      return;
    }

    if (visibilityType === 'MINIMUM_SHARES' && (!minimumShares || parseInt(minimumShares) <= 0)) {
      const message = '최소 보유 주식 수를 입력해주세요';
      Platform.OS === 'web' ? alert(message) : Alert.alert('알림', message);
      return;
    }

    setLoading(true);
    try {
      let imageUrl = null;

      // 이미지 업로드
      if (image) {
        const formData = new FormData();
        const imageFile = {
          uri: image.uri,
          type: image.type || 'image/jpeg',
          name: image.fileName || 'post-image.jpg',
        };

        // 웹에서는 blob으로 처리
        if (Platform.OS === 'web') {
          const response = await fetch(image.uri);
          const blob = await response.blob();
          formData.append('image', blob, 'post-image.jpg');
        } else {
          formData.append('image', imageFile);
        }

        const uploadResponse = await uploadImage(formData);
        imageUrl = uploadResponse.imageUrl;
      }

      // 포스트 생성
      await createPost(
        content,
        imageUrl,
        visibilityType,
        visibilityType === 'MINIMUM_SHARES' ? parseInt(minimumShares) : 0
      );

      const message = '게시글이 작성되었습니다';
      Platform.OS === 'web' ? alert(message) : Alert.alert('성공', message);
      navigation.goBack();
    } catch (error) {
      console.error('게시글 작성 오류:', error);
      const message = error.response?.data?.error || '게시글 작성 중 오류가 발생했습니다';
      Platform.OS === 'web' ? alert(message) : Alert.alert('오류', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButton}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>새 게시물</Text>
        <TouchableOpacity onPress={handlePost} disabled={loading}>
          <Text style={[styles.postButton, loading && styles.postButtonDisabled]}>
            {loading ? '작성 중...' : '작성'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 이미지 선택 */}
        <TouchableOpacity style={styles.imagePickerButton} onPress={handlePickImage}>
          {image ? (
            <Image source={{ uri: image.uri }} style={styles.selectedImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderIcon}>📷</Text>
              <Text style={styles.imagePlaceholderText}>사진 추가</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* 내용 입력 */}
        <TextInput
          style={styles.contentInput}
          placeholder="무슨 생각을 하고 계신가요?"
          placeholderTextColor={theme.colors.textTertiary}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />

        {/* 공개 범위 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>공개 범위</Text>

          <TouchableOpacity
            style={[styles.optionCard, visibilityType === 'PUBLIC' && styles.optionCardSelected]}
            onPress={() => setVisibilityType('PUBLIC')}
          >
            <View style={styles.radioButton}>
              {visibilityType === 'PUBLIC' && <View style={styles.radioButtonSelected} />}
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>전체 공개</Text>
              <Text style={styles.optionDescription}>모든 사용자가 볼 수 있습니다</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, visibilityType === 'SHAREHOLDERS_ONLY' && styles.optionCardSelected]}
            onPress={() => setVisibilityType('SHAREHOLDERS_ONLY')}
          >
            <View style={styles.radioButton}>
              {visibilityType === 'SHAREHOLDERS_ONLY' && <View style={styles.radioButtonSelected} />}
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>주주 전용</Text>
              <Text style={styles.optionDescription}>내 주식을 보유한 사람만 볼 수 있습니다</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, visibilityType === 'MINIMUM_SHARES' && styles.optionCardSelected]}
            onPress={() => setVisibilityType('MINIMUM_SHARES')}
          >
            <View style={styles.radioButton}>
              {visibilityType === 'MINIMUM_SHARES' && <View style={styles.radioButtonSelected} />}
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>주식 수량 제한</Text>
              <Text style={styles.optionDescription}>내 주식을 일정 수량 이상 보유한 사람만 볼 수 있습니다</Text>
            </View>
          </TouchableOpacity>

          {visibilityType === 'MINIMUM_SHARES' && (
            <View style={styles.sharesInputContainer}>
              <TextInput
                style={styles.sharesInput}
                placeholder="최소 보유 주식 수"
                placeholderTextColor={theme.colors.textTertiary}
                value={minimumShares}
                onChangeText={setMinimumShares}
                keyboardType="numeric"
              />
              <Text style={styles.sharesInputUnit}>주 이상</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  cancelButton: {
    fontSize: 16,
    color: t.colors.textSecondary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: t.colors.text,
  },
  postButton: {
    fontSize: 16,
    fontWeight: '600',
    color: t.colors.primary,
  },
  postButtonDisabled: {
    color: t.colors.textTertiary,
  },
  content: {
    flex: 1,
  },
  imagePickerButton: {
    margin: 20,
    marginBottom: 0,
  },
  selectedImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: t.colors.background,
  },
  imagePlaceholder: {
    height: 200,
    borderRadius: 12,
    backgroundColor: t.colors.surface,
    borderWidth: 2,
    borderColor: t.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  imagePlaceholderText: {
    fontSize: 15,
    color: t.colors.textSecondary,
    fontWeight: '500',
  },
  contentInput: {
    margin: 20,
    padding: 16,
    minHeight: 120,
    fontSize: 16,
    color: t.colors.text,
    backgroundColor: t.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  section: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: t.colors.text,
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: t.colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: t.colors.border,
    marginBottom: 12,
  },
  optionCardSelected: {
    borderColor: t.colors.primary,
    backgroundColor: t.colors.surface,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: t.colors.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: t.colors.primary,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: t.colors.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: t.colors.textSecondary,
    lineHeight: 18,
  },
  sharesInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.colors.border,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  sharesInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: t.colors.text,
  },
  sharesInputUnit: {
    fontSize: 15,
    color: t.colors.textSecondary,
    marginLeft: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
