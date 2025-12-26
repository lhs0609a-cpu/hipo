const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunityMessage = sequelize.define('CommunityMessage', {
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
      field: 'user_id',
      comment: '메시지 작성자'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '메시지 내용'
    },
    shareholding: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '작성 시점의 주식 보유량'
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_pinned',
      comment: '고정 메시지 여부 (커뮤니티 소유자)'
    }
  }, {
    tableName: 'community_messages',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['community_id'] },
      { fields: ['user_id'] },
      { fields: ['created_at'] }
    ]
  });

  CommunityMessage.associate = (models) => {
    CommunityMessage.belongsTo(models.ShareholderCommunity, {
      foreignKey: 'communityId',
      as: 'community'
    });

    CommunityMessage.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'author'
    });
  };

  return CommunityMessage;
};
