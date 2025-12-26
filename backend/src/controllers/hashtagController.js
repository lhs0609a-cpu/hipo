const { Hashtag, Post, User } = require('../models');
const { Op } = require('sequelize');

/**
 * 해시태그로 포스트 검색
 */
exports.searchByHashtag = async (req, res) => {
  try {
    const { tag } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const hashtag = await Hashtag.findOne({
      where: { name: tag.toLowerCase() }
    });

    if (!hashtag) {
      return res.json({ posts: [], count: 0 });
    }

    const posts = await hashtag.getPosts({
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'profileImage']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      posts,
      count: hashtag.count,
      hashtag: hashtag.name
    });
  } catch (error) {
    console.error('해시태그 검색 오류:', error);
    res.status(500).json({ error: '해시태그 검색 중 오류가 발생했습니다' });
  }
};

/**
 * 인기 해시태그 조회
 */
exports.getTrendingHashtags = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const hashtags = await Hashtag.findAll({
      where: {
        count: { [Op.gt]: 0 }
      },
      order: [['count', 'DESC']],
      limit: parseInt(limit),
      attributes: ['name', 'count']
    });

    res.json({ hashtags });
  } catch (error) {
    console.error('인기 해시태그 조회 오류:', error);
    res.status(500).json({ error: '인기 해시태그 조회 중 오류가 발생했습니다' });
  }
};
