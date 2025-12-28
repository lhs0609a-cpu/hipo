import api from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 회원가입
 */
export const register = async (email, username, password) => {
  const response = await api.post('/auth/register', {
    email,
    username,
    password,
  });
  return response.data;
};

/**
 * 로그인
 */
export const login = async (email, password) => {
  const response = await api.post('/auth/login', {
    email,
    password,
  });

  const { token, user } = response.data;

  // 토큰과 사용자 정보 저장
  await AsyncStorage.setItem('token', token);
  await AsyncStorage.setItem('user', JSON.stringify(user));

  return response.data;
};

/**
 * 로그아웃
 */
export const logout = async () => {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('user');
};

/**
 * 내 정보 조회
 */
export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

/**
 * 저장된 사용자 정보 가져오기
 */
export const getSavedUser = async () => {
  const userStr = await AsyncStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

/**
 * 토큰 확인
 */
export const isAuthenticated = async () => {
  const token = await AsyncStorage.getItem('token');
  return !!token;
};
