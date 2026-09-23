import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';

export default function EditProfileScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!username.trim()) return Alert.alert('확인 필요', '사용자명을 입력해주세요.');
    try {
      setSaving(true);
      const response = await userAPI.updateProfile(user.id, {
        username: username.trim(), bio: bio.trim(), profileImage: profileImage.trim() || null,
      });
      updateUser({ ...user, ...response.data.user });
      Alert.alert('저장 완료', '프로필이 수정되었습니다.', [{ text: '확인', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('저장 실패', error.response?.data?.error || '프로필을 수정하지 못했습니다.');
    } finally { setSaving(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#111827" /></TouchableOpacity>
        <Text style={styles.headerTitle}>프로필 수정</Text><View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.avatar}><Text style={styles.avatarText}>{username.charAt(0).toUpperCase() || '?'}</Text></View>
        <Text style={styles.label}>사용자명</Text>
        <TextInput style={styles.input} value={username} onChangeText={setUsername} maxLength={30} autoCapitalize="none" />
        <Text style={styles.label}>소개</Text>
        <TextInput style={[styles.input, styles.multiline]} value={bio} onChangeText={setBio} maxLength={300} multiline placeholder="나를 소개해주세요" />
        <Text style={styles.label}>프로필 이미지 URL</Text>
        <TextInput style={styles.input} value={profileImage} onChangeText={setProfileImage} autoCapitalize="none" keyboardType="url" placeholder="https://" />
        <TouchableOpacity style={[styles.button, saving && styles.disabled]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>변경사항 저장</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  header: { padding: 18, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E8EB' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#191F28' }, spacer: { width: 24 },
  content: { padding: 20, paddingBottom: 40 }, avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#3182F6', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 18 },
  avatarText: { color: '#FFFFFF', fontSize: 34, fontWeight: '900' }, label: { fontSize: 14, color: '#4E5968', fontWeight: '700', marginBottom: 8, marginTop: 10 },
  input: { minHeight: 50, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D6DB', borderRadius: 13, paddingHorizontal: 14, fontSize: 16, color: '#191F28' },
  multiline: { minHeight: 112, paddingTop: 14, textAlignVertical: 'top' }, button: { minHeight: 54, borderRadius: 14, backgroundColor: '#3182F6', alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' }, disabled: { opacity: 0.55 },
});
