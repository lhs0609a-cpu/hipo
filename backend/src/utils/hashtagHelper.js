/**
 * 텍스트에서 해시태그 추출
 * @param {string} text - 파싱할 텍스트
 * @returns {Array<string>} 해시태그 배열 (# 제외)
 */
exports.extractHashtags = (text) => {
  if (!text) return [];

  // #으로 시작하고 공백이 아닌 문자가 1개 이상인 패턴
  const hashtagPattern = /#([^\s#]+)/g;
  const hashtags = [];
  let match;

  while ((match = hashtagPattern.exec(text)) !== null) {
    hashtags.push(match[1].toLowerCase());
  }

  // 중복 제거
  return [...new Set(hashtags)];
};

/**
 * 포스트에 해시태그 추가
 * @param {Object} post - Post 인스턴스
 * @param {Array<string>} hashtagNames - 해시태그 이름 배열
 * @param {Object} models - Sequelize models
 */
exports.addHashtagsToPost = async (post, hashtagNames, models) => {
  if (!hashtagNames || hashtagNames.length === 0) return;

  const { Hashtag } = models;
  const hashtagInstances = [];

  for (const name of hashtagNames) {
    // 해시태그 찾거나 생성
    let [hashtag, created] = await Hashtag.findOrCreate({
      where: { name },
      defaults: { count: 0 }
    });

    // 카운트 증가 (새로 생성된 경우가 아니라면)
    if (!created) {
      await hashtag.increment('count');
    } else {
      await hashtag.update({ count: 1 });
    }

    hashtagInstances.push(hashtag);
  }

  // 포스트와 해시태그 연결
  await post.setHashtags(hashtagInstances);
};

/**
 * 포스트에서 해시태그 제거 및 카운트 감소
 * @param {Object} post - Post 인스턴스
 * @param {Object} models - Sequelize models
 */
exports.removeHashtagsFromPost = async (post, models) => {
  const { Hashtag } = models;

  // 현재 해시태그 가져오기
  const currentHashtags = await post.getHashtags();

  // 카운트 감소
  for (const hashtag of currentHashtags) {
    await hashtag.decrement('count');
    // 카운트가 0이 되면 삭제
    if (hashtag.count <= 1) {
      await hashtag.destroy();
    }
  }

  // 연결 제거
  await post.setHashtags([]);
};
