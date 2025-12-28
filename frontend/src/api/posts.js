import api from './client';

/**
 * 포스트 목록 조회 (피드)
 * @param {number} page - 페이지 번호
 * @param {number} limit - 페이지당 포스트 수
 * @param {string} feed - 피드 타입 ('following' = 팔로우한 사용자만)
 */
export const getPosts = async (page = 1, limit = 20, feed = null) => {
  let url = `/posts?page=${page}&limit=${limit}`;
  if (feed) {
    url += `&feed=${feed}`;
  }
  const response = await api.get(url);
  return response.data;
};

/**
 * 내 투자 뉴스 조회 (내가 주식을 보유한 사람들의 소식)
 */
export const getMyInvestmentNews = async (page = 1, limit = 20) => {
  const response = await api.get(`/posts/news?page=${page}&limit=${limit}`);
  return response.data;
};

/**
 * 트렌딩/핫한 피드 조회
 */
export const getTrendingPosts = async (page = 1, limit = 20, timeframe = '24h') => {
  const response = await api.get(`/posts/trending?page=${page}&limit=${limit}&timeframe=${timeframe}`);
  return response.data;
};

/**
 * 포스트 생성
 */
export const createPost = async (content, imageUrl, visibilityType = 'PUBLIC', minimumShares = 0) => {
  const response = await api.post('/posts', {
    content,
    imageUrl,
    visibilityType,
    minimumShares,
  });
  return response.data;
};

/**
 * 포스트 삭제
 */
export const deletePost = async (postId) => {
  const response = await api.delete(`/posts/${postId}`);
  return response.data;
};

/**
 * 포스트 좋아요/취소
 */
export const likePost = async (postId) => {
  const response = await api.post(`/posts/${postId}/like`);
  return response.data;
};

/**
 * 이미지 업로드
 */
export const uploadImage = async (imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await api.post('/upload/post', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * 댓글 목록 조회
 */
export const getComments = async (postId, page = 1, limit = 20) => {
  const response = await api.get(`/posts/${postId}/comments?page=${page}&limit=${limit}`);
  return response.data;
};

/**
 * 댓글 추가
 */
export const addComment = async (postId, content) => {
  const response = await api.post(`/posts/${postId}/comments`, { content });
  return response.data;
};
