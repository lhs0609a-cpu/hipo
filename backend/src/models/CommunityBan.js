const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunityBan = sequelize.define('CommunityBan', {
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
      comment: '강퇴된 유저'
    },
    bannedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'banned_by',
      comment: '강퇴한 방장'
    },
    reason: {
      type: DataTypes.ENUM('PROFANITY', 'SPAM', 'FRAUD', 'DEFAMATION', 'REPEATED_WARNINGS', 'OTHER'),
      allowNull: false,
      comment: '강퇴 사유'
    },
    reasonDetail: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'reason_detail',
      comment: '강퇴 상세 사유 (필수)'
    },
    bannedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'banned_at',
      comment: '강퇴 일시'
    },
    bannedUntil: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'banned_until',
      comment: '강퇴 해제 일시 (48시간 후)'
    },
    isReviewed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_reviewed',
      comment: '운영진 검토 여부'
    },
    reviewResult: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
      defaultValue: 'PENDING',
      field: 'review_result',
      comment: '검토 결과'
    },
    reviewedAt: {
      type: DataTypes.DATE,
      field: 'reviewed_at',
      comment: '검토 완료 일시'
    },
    reviewNotes: {
      type: DataTypes.TEXT,
      field: 'review_notes',
      comment: '검토 의견'
    }
  }, {
    tableName: 'community_bans',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['community_id'] },
      { fields: ['user_id'] },
      { fields: ['banned_by'] },
      { fields: ['banned_until'] },
      { fields: ['is_reviewed'] }
    ]
  });

  CommunityBan.associate = (models) => {
    CommunityBan.belongsTo(models.ShareholderCommunity, {
      foreignKey: 'communityId',
      as: 'community'
    });

    CommunityBan.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'bannedUser'
    });

    CommunityBan.belongsTo(models.User, {
      foreignKey: 'bannedBy',
      as: 'banner'
    });
  };

  return CommunityBan;
};
