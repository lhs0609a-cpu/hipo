const { Story, User, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * 스토리 생성
 */
exports.createStory = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const userId = req.user.id;

    if (!imageUrl) {
      return res.status(400).json({ error: '이미지가 필요합니다' });
    }

    // 24시간 후 만료
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const story = await Story.create({
      userId,
      imageUrl,
      expiresAt
    });

    const storyWithAuthor = await Story.findByPk(story.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'profileImage']
      }]
    });

    res.status(201).json({
      message: '스토리가 생성되었습니다',
      story: storyWithAuthor
    });
  } catch (error) {
    console.error('스토리 생성 오류:', error);
    res.status(500).json({ error: '스토리 생성 중 오류가 발생했습니다' });
  }
};

/**
 * 활성 스토리 목록 조회 (팔로잉 사용자들)
 */
exports.getStories = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // 팔로잉하는 사용자들의 스토리 조회
    const stories = await Story.findAll({
      where: {
        expiresAt: { [Op.gt]: now }
      },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'profileImage']
      }],
      order: [['created_at', 'DESC']]
    });

    // 사용자별로 그룹화
    const storiesByUser = {};
    stories.forEach(story => {
      const authorId = story.userId;
      if (!storiesByUser[authorId]) {
        storiesByUser[authorId] = {
          author: story.author,
          stories: []
        };
      }
      storiesByUser[authorId].stories.push(story);
    });

    res.json({ stories: Object.values(storiesByUser) });
  } catch (error) {
    console.error('스토리 목록 조회 오류:', error);
    res.status(500).json({ error: '스토리 목록 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 특정 스토리 조회 및 조회수 증가
 */
exports.viewStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user.id;

    const story = await Story.findByPk(storyId, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'profileImage']
      }]
    });

    if (!story) {
      return res.status(404).json({ error: '스토리를 찾을 수 없습니다' });
    }

    // 만료된 스토리인지 확인
    if (new Date() > new Date(story.expiresAt)) {
      return res.status(410).json({ error: '만료된 스토리입니다' });
    }

    // 조회수 증가 (중복 체크는 story_views 테이블로 처리)
    const [view, created] = await sequelize.models.StoryView.findOrCreate({
      where: {
        storyId,
        userId
      }
    });

    if (created) {
      await story.update({
        viewsCount: story.viewsCount + 1
      });
    }

    res.json({ story });
  } catch (error) {
    console.error('스토리 조회 오류:', error);
    res.status(500).json({ error: '스토리 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 스토리 삭제
 */
exports.deleteStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user.id;

    const story = await Story.findByPk(storyId);

    if (!story) {
      return res.status(404).json({ error: '스토리를 찾을 수 없습니다' });
    }

    // 작성자만 삭제 가능
    if (story.userId !== userId) {
      return res.status(403).json({ error: '삭제 권한이 없습니다' });
    }

    await story.destroy();

    res.json({ message: '스토리가 삭제되었습니다' });
  } catch (error) {
    console.error('스토리 삭제 오류:', error);
    res.status(500).json({ error: '스토리 삭제 중 오류가 발생했습니다' });
  }
};

/**
 * 만료된 스토리 자동 삭제 (크론 작업용)
 */
exports.cleanupExpiredStories = async () => {
  try {
    const now = new Date();
    const deleted = await Story.destroy({
      where: {
        expiresAt: { [Op.lt]: now }
      }
    });

    console.log(`${deleted}개의 만료된 스토리가 삭제되었습니다`);
    return deleted;
  } catch (error) {
    console.error('만료된 스토리 삭제 오류:', error);
    throw error;
  }
};
