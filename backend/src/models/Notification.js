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
      // 시스템 알림(배당, 티어 변경, 미션 등)은 행위자가 없음
      allowNull: true,
      field: 'actor_id',
      comment: '알림을 발생시킨 사용자 ID (시스템 알림이면 null)'
    },
    type: {
      // ENUM 대신 문자열: 소셜 알림(like/comment/follow/mention) 외에
      // DIVIDEND_RECEIVED, REFERRAL, STOCK_PURCHASED, BADGE_EARNED,
      // MISSION_COMPLETE, tier_change, VICE_ADMIN_APPOINTED 등 도메인 알림이 계속 늘어남
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '알림 타입'
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '알림 제목 (목록 화면에 표시)'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '알림 본문 (목록 화면에 표시)'
    },
    relatedId: {
      // 커뮤니티 ID, 콘텐츠 요청 ID, 크리에이터 ID 등 타입별로 대상이 다름
      type: DataTypes.STRING,
      allowNull: true,
      field: 'related_id',
      comment: '알림 타입별 연관 리소스 ID'
    },
    data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '알림 타입별 부가 데이터'
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
    timestamps: true,
    indexes: [
      { fields: ['user_id', 'is_read'] },
      { fields: ['user_id', 'created_at'] }
    ]
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
