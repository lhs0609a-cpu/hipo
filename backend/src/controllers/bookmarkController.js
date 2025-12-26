const { Bookmark, Post, User } = require('../models');

/**
 * 북마크 토글 (추가/삭제)
 */
exports.toggleBookmark = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ error: '포스트를 찾을 수 없습니다' });
    }

    const existing = await Bookmark.findOne({
      where: { userId, postId }
    });

    if (existing) {
      // 북마크 삭제
      await existing.destroy();
      return res.json({
        message: '북마크를 취소했습니다',
        isBookmarked: false
      });
    } else {
      // 북마크 추가
      await Bookmark.create({ userId, postId });
      return res.json({
        message: '북마크에 추가했습니다',
        isBookmarked: true
      });
    }
  } catch (error) {
    console.error('북마크 토글 오류:', error);
    res.status(500).json({ error: '북마크 처리 중 오류가 발생했습니다' });
  }
};

/**
 * 북마크한 포스트 목록 조회
 */
exports.getBookmarkedPosts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const bookmarks = await Bookmark.findAll({
      where: { userId },
      include: [{
        model: Post,
        as: 'post',
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'profileImage']
        }]
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const posts = bookmarks.map(b => b.post);

    res.json({ posts });
  } catch (error) {
    console.error('북마크 목록 조회 오류:', error);
    res.status(500).json({ error: '북마크 목록 조회 중 오류가 발생했습니다' });
  }
};
