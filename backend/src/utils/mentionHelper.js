/**
 * 텍스트에서 멘션 추출
 * @param {string} text - 검색할 텍스트
 * @returns {Array<string>} - 멘션된 사용자명 배열
 */
function extractMentions(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // @username 패턴 매칭 (영문, 숫자, 언더스코어만 허용)
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const matches = text.matchAll(mentionRegex);

  const mentions = [];
  for (const match of matches) {
    const username = match[1];
    if (!mentions.includes(username)) {
      mentions.push(username);
    }
  }

  return mentions;
}

/**
 * 멘션된 사용자들에게 알림 생성
 * @param {Array<string>} usernames - 멘션된 사용자명 배열
 * @param {number} actorId - 멘션을 한 사용자 ID
 * @param {Object} data - 알림 데이터 (postId, commentId)
 * @param {Object} models - Sequelize 모델
 */
async function createMentionNotifications(usernames, actorId, data, models) {
  const { User } = models;
  const { createNotification } = require('../controllers/notificationController');

  for (const username of usernames) {
    try {
      // 사용자명으로 사용자 찾기
      const user = await User.findOne({
        where: { username },
        attributes: ['id']
      });

      if (!user) {
        console.log(`User not found: ${username}`);
        continue;
      }

      // 자기 자신에게는 알림 안 보냄
      if (user.id === actorId) {
        continue;
      }

      // 멘션 알림 생성
      await createNotification(user.id, actorId, 'mention', data);
      console.log(`Mention notification created for @${username}`);
    } catch (error) {
      console.error(`Failed to create mention notification for @${username}:`, error);
    }
  }
}

module.exports = {
  extractMentions,
  createMentionNotifications
};
