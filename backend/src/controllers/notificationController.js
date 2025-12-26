const { Notification, User, Post, Comment } = require('../models');

/**
 * 알림 생성 헬퍼 함수
 */
exports.createNotification = async (userId, actorId, type, data = {}) => {
  try {
    // 자기 자신에게는 알림을 보내지 않음
    if (userId === actorId) {
      return null;
    }

    const notification = await Notification.create({
      userId,
      actorId,
      type,
      postId: data.postId || null,
      commentId: data.commentId || null
    });

    return notification;
  } catch (error) {
    console.error('알림 생성 오류:', error);
    return null;
  }
};

/**
 * 알림 목록 조회
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const notifications = await Notification.findAll({
      where: { userId },
      include: [
        {
          model: User,
          as: 'actor',
          attributes: ['id', 'username', 'profileImage']
        },
        {
          model: Post,
          as: 'post',
          attributes: ['id', 'content', 'imageUrl']
        },
        {
          model: Comment,
          as: 'comment',
          attributes: ['id', 'content']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // 읽지 않은 알림 개수
    const unreadCount = await Notification.count({
      where: { userId, isRead: false }
    });

    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('알림 목록 조회 오류:', error);
    res.status(500).json({ error: '알림 목록 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 알림 읽음 처리
 */
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findByPk(notificationId);

    if (!notification) {
      return res.status(404).json({ error: '알림을 찾을 수 없습니다' });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ error: '권한이 없습니다' });
    }

    await notification.update({ isRead: true });

    res.json({ message: '알림을 읽음으로 표시했습니다' });
  } catch (error) {
    console.error('알림 읽음 처리 오류:', error);
    res.status(500).json({ error: '알림 읽음 처리 중 오류가 발생했습니다' });
  }
};

/**
 * 모든 알림 읽음 처리
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.update(
      { isRead: true },
      { where: { userId, isRead: false } }
    );

    res.json({ message: '모든 알림을 읽음으로 표시했습니다' });
  } catch (error) {
    console.error('모든 알림 읽음 처리 오류:', error);
    res.status(500).json({ error: '모든 알림 읽음 처리 중 오류가 발생했습니다' });
  }
};

/**
 * 알림 삭제
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findByPk(notificationId);

    if (!notification) {
      return res.status(404).json({ error: '알림을 찾을 수 없습니다' });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ error: '권한이 없습니다' });
    }

    await notification.destroy();

    res.json({ message: '알림이 삭제되었습니다' });
  } catch (error) {
    console.error('알림 삭제 오류:', error);
    res.status(500).json({ error: '알림 삭제 중 오류가 발생했습니다' });
  }
};
