const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ChatMessage = sequelize.define('ChatMessage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    communityId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'shareholder_communities',
        key: 'id'
      },
      field: 'community_id',
      onDelete: 'CASCADE'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'user_id'
    },
    messageType: {
      type: DataTypes.ENUM('TEXT', 'IMAGE', 'VIDEO', 'FILE', 'STICKER', 'SYSTEM'),
      defaultValue: 'TEXT',
      field: 'message_type',
      comment: '메시지 타입'
    },
    content: {
      type: DataTypes.TEXT,
      comment: '메시지 내용'
    },
    mediaUrl: {
      type: DataTypes.STRING,
      field: 'media_url',
      comment: '미디어 URL (이미지, 동영상, 파일)'
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_deleted',
      comment: '삭제 여부'
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_pinned',
      comment: '고정 여부 (방장 권한)'
    },
    replyToId: {
      type: DataTypes.UUID,
      field: 'reply_to_id',
      references: {
        model: 'chat_messages',
        key: 'id'
      },
      comment: '답장 대상 메시지 ID'
    },
    likeCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'like_count',
      comment: '좋아요 수 (경험치 계산용)'
    },
    isFilteredByAI: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_filtered_by_ai',
      comment: 'AI 필터링 적용 여부 (금융 키워드, 사기 의심)'
    },
    filteredKeywords: {
      type: DataTypes.JSON,
      field: 'filtered_keywords',
      comment: '필터링된 키워드 목록'
    }
  }, {
    tableName: 'chat_messages',
    timestamps: true,
    indexes: [
      { fields: ['community_id', 'created_at'] },
      { fields: ['user_id'] },
      { fields: ['is_pinned'] },
      { fields: ['reply_to_id'] }
    ]
  });

  ChatMessage.associate = (models) => {
    ChatMessage.belongsTo(models.ShareholderCommunity, {
      foreignKey: 'communityId',
      as: 'community'
    });

    ChatMessage.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'sender'
    });

    ChatMessage.belongsTo(models.ChatMessage, {
      foreignKey: 'replyToId',
      as: 'replyTo'
    });

    ChatMessage.hasMany(models.ChatMessage, {
      foreignKey: 'replyToId',
      as: 'replies'
    });

    ChatMessage.hasMany(models.ChatReport, {
      foreignKey: 'messageId',
      as: 'reports'
    });
  };

  return ChatMessage;
};
