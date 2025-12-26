const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      comment: '알림을 받는 사용자 ID'
    },
    actorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'actor_id',
      comment: '알림을 발생시킨 사용자 ID'
    },
    type: {
      type: DataTypes.ENUM('like', 'comment', 'follow', 'mention'),
      allowNull: false,
      comment: '알림 타입'
    },
    postId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'post_id',
      comment: '관련 포스트 ID (좋아요, 댓글인 경우)'
    },
    commentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'comment_id',
      comment: '관련 댓글 ID (댓글인 경우)'
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_read',
      comment: '읽음 여부'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at'
    }
  }, {
    tableName: 'notifications',
    underscored: true,
    timestamps: true
  });

  Notification.associate = (models) => {
    // 알림을 받는 사용자
    Notification.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // 알림을 발생시킨 사용자 (행위자)
    Notification.belongsTo(models.User, {
      foreignKey: 'actorId',
      as: 'actor'
    });

    // 관련 포스트
    Notification.belongsTo(models.Post, {
      foreignKey: 'postId',
      as: 'post'
    });

    // 관련 댓글
    Notification.belongsTo(models.Comment, {
      foreignKey: 'commentId',
      as: 'comment'
    });
  };

  return Notification;
};
