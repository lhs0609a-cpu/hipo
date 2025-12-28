import api from './client';

/**
 * 사용자 프로필 조회
 */
export const getUserProfile = async (userId) => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

/**
 * 팔로우/언팔로우 토글
 */
export const followUser = async (userId) => {
  const response = await api.post(`/users/${userId}/follow`);
  return response.data;
};

/**
 * 팔로워 목록 조회
 */
export const getFollowers = async (userId) => {
  const response = await api.get(`/users/${userId}/followers`);
  return response.data;
};

/**
 * 팔로잉 목록 조회
 */
export const getFollowing = async (userId) => {
  const response = await api.get(`/users/${userId}/following`);
  return response.data;
};

/**
 * 프로필 수정
 */
export const updateProfile = async (userId, profileData) => {
  const response = await api.put(`/users/${userId}`, profileData);
  return response.data;
};

/**
 * 사용자 검색
 */
export const searchUsers = async (query) => {
  const response = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
  return response.data;
};

/**
 * 특정 사용자의 포스트 목록 조회
 */
export const getUserPosts = async (userId, page = 1, limit = 20) => {
  const response = await api.get(`/users/${userId}/posts?page=${page}&limit=${limit}`);
  return response.data;
};

/**
 * 카테고리별 트렌딩 인플루언서 조회
 */
export const getTrendingByCategories = async (limit = 10) => {
  const response = await api.get(`/users/trending/categories?limit=${limit}`);
  return response.data;
};
