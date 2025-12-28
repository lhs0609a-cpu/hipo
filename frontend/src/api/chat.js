import api from './client';

/**
 * 커뮤니티 채팅 메시지 전송
 */
export const sendCommunityMessage = async (communityId, content, messageType = 'TEXT', replyToId = null) => {
  const response = await api.post(`/chat/${communityId}/messages`, {
    content,
    messageType,
    replyToId,
  });
  return response.data;
};

/**
 * 커뮤니티 채팅 메시지 목록 조회
 */
export const getCommunityMessages = async (communityId, limit = 50, before = null) => {
  const response = await api.get(`/chat/${communityId}/messages`, {
    params: { limit, before },
  });
  return response.data;
};

/**
 * 메시지 고정/고정 해제
 */
export const pinMessage = async (messageId) => {
  const response = await api.patch(`/chat/messages/${messageId}/pin`);
  return response.data;
};

/**
 * 메시지 삭제
 */
export const deleteMessage = async (messageId) => {
  const response = await api.delete(`/chat/messages/${messageId}`);
  return response.data;
};

/**
 * 메시지 좋아요
 */
export const likeMessage = async (messageId) => {
  const response = await api.post(`/chat/messages/${messageId}/like`);
  return response.data;
};

/**
 * 메시지 신고
 */
export const reportMessage = async (messageId, reportReason, reasonDetail) => {
  const response = await api.post(`/chat/messages/${messageId}/report`, {
    reportReason,
    reasonDetail,
  });
  return response.data;
};

/**
 * 고정된 메시지 목록
 */
export const getPinnedMessages = async (communityId) => {
  const response = await api.get(`/chat/${communityId}/messages/pinned`);
  return response.data;
};

/**
 * 커뮤니티 레벨 랭킹
 */
export const getLevelRanking = async (communityId) => {
  const response = await api.get(`/chat/${communityId}/level/ranking`);
  return response.data;
};

/**
 * 내 레벨 정보
 */
export const getMyLevel = async (communityId) => {
  const response = await api.get(`/chat/${communityId}/level/me`);
  return response.data;
};

/**
 * 부방장 임명
 */
export const appointViceAdmin = async (communityId, targetUserId) => {
  const response = await api.post(`/chat/${communityId}/vice-admin/${targetUserId}`);
  return response.data;
};

/**
 * 부방장 해제
 */
export const removeViceAdmin = async (communityId, targetUserId) => {
  const response = await api.delete(`/chat/${communityId}/vice-admin/${targetUserId}`);
  return response.data;
};

/**
 * 부방장 목록
 */
export const getViceAdmins = async (communityId) => {
  const response = await api.get(`/chat/${communityId}/vice-admins`);
  return response.data;
};

/**
 * 콘텐츠 요청 생성
 */
export const createContentRequest = async (communityId, data) => {
  const response = await api.post(`/chat/${communityId}/content-request`, data);
  return response.data;
};

/**
 * 콘텐츠 요청 투표
 */
export const voteContentRequest = async (requestId, voteType) => {
  const response = await api.post(`/chat/content-request/${requestId}/vote`, {
    voteType,
  });
  return response.data;
};

/**
 * 콘텐츠 요청 목록
 */
export const getContentRequests = async (communityId) => {
  const response = await api.get(`/chat/${communityId}/content-requests`);
  return response.data;
};
