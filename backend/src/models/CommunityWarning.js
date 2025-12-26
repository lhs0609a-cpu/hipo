const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunityWarning = sequelize.define('CommunityWarning', {
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
      comment: '경고 받은 유저'
    },
    issuedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'issued_by',
      comment: '경고 발행한 방장'
    },
    reason: {
      type: DataTypes.ENUM('PROFANITY', 'SPAM', 'FRAUD', 'DEFAMATION', 'OTHER'),
      allowNull: false,
      comment: '경고 사유'
    },
    reasonDetail: {
      type: DataTypes.TEXT,
      field: 'reason_detail',
      comment: '경고 상세 사유'
    },
    relatedMessageId: {
      type: DataTypes.UUID,
      field: 'related_message_id',
      comment: '관련 메시지 ID'
    },
    isAcknowledged: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_acknowledged',
      comment: '유저 확인 여부'
    }
  }, {
    tableName: 'community_warnings',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['community_id'] },
      { fields: ['user_id'] },
      { fields: ['issued_by'] },
      { fields: ['created_at'] }
    ]
  });

  CommunityWarning.associate = (models) => {
    CommunityWarning.belongsTo(models.ShareholderCommunity, {
      foreignKey: 'communityId',
      as: 'community'
    });

    CommunityWarning.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'warnedUser'
    });

    CommunityWarning.belongsTo(models.User, {
      foreignKey: 'issuedBy',
      as: 'issuer'
    });
  };

  return CommunityWarning;
};
