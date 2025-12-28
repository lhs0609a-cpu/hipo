import api from './client';

/**
 * 대화 목록 조회
 */
export const getConversations = async () => {
  const response = await api.get('/messages/conversations');
  return response.data;
};

/**
 * 특정 사용자와의 대화 가져오기 또는 생성
 */
export const getOrCreateConversation = async (otherUserId) => {
  const response = await api.get(`/messages/conversations/${otherUserId}`);
  return response.data;
};

/**
 * 대화 내 메시지 조회
 */
export const getMessages = async (conversationId) => {
  const response = await api.get(`/messages/${conversationId}`);
  return response.data;
};

/**
 * 메시지 전송
 */
export const sendMessage = async (conversationId, content) => {
  const response = await api.post(`/messages/${conversationId}`, {
    content,
  });
  return response.data;
};

/**
 * 메시지 읽음 처리
 */
export const markAsRead = async (conversationId) => {
  const response = await api.put(`/messages/${conversationId}/read`);
  return response.data;
};
