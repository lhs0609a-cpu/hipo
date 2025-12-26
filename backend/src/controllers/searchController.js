const { User, Post, Hashtag } = require('../models');
const { Op } = require('sequelize');

/**
 * 통합 검색
 */
exports.search = async (req, res) => {
  try {
    const { q, type = 'all' } = req.query;

    if (!q || q.trim() === '') {
      return res.json({ users: [], posts: [], hashtags: [] });
    }

    const query = q.trim();
    const results = {};

    // 사용자 검색
    if (type === 'all' || type === 'users') {
      results.users = await User.findAll({
        where: {
          username: { [Op.like]: `%${query}%` }
        },
        attributes: ['id', 'username', 'profileImage', 'bio'],
        limit: 10
      });
    }

    // 포스트 검색 (내용 기반)
    if (type === 'all' || type === 'posts') {
      results.posts = await Post.findAll({
        where: {
          content: { [Op.like]: `%${query}%` }
        },
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'profileImage']
        }],
        order: [['created_at', 'DESC']],
        limit: 10
      });
    }

    // 해시태그 검색
    if (type === 'all' || type === 'hashtags') {
      results.hashtags = await Hashtag.findAll({
        where: {
          name: { [Op.like]: `%${query}%` }
        },
        attributes: ['name', 'count'],
        order: [['count', 'DESC']],
        limit: 10
      });
    }

    res.json(results);
  } catch (error) {
    console.error('통합 검색 오류:', error);
    res.status(500).json({ error: '검색 중 오류가 발생했습니다' });
  }
};
