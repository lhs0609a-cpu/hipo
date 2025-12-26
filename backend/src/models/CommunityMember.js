const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunityMember = sequelize.define('CommunityMember', {
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
    shareholdingAtJoin: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'shareholding_at_join',
      comment: '가입 시점의 주식 보유량'
    },
    currentShareholding: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'current_shareholding',
      comment: '현재 주식 보유량'
    },
    joinedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'joined_at',
      comment: '가입 일시'
    },
    messageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'message_count',
      comment: '총 메시지 수'
    },
    activityScore: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'activity_score',
      comment: '활동 점수 (채팅, 좋아요 등)'
    },
    warningCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'warning_count',
      comment: '경고 횟수'
    },
    isBanned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_banned',
      comment: '강퇴 여부'
    },
    bannedUntil: {
      type: DataTypes.DATE,
      field: 'banned_until',
      comment: '강퇴 해제 일시 (48시간)'
    }
  }, {
    tableName: 'community_members',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['community_id', 'user_id']
      },
      { fields: ['community_id'] },
      { fields: ['user_id'] },
      { fields: ['current_shareholding'] },
      { fields: ['activity_score'] }
    ]
  });

  CommunityMember.associate = (models) => {
    CommunityMember.belongsTo(models.ShareholderCommunity, {
      foreignKey: 'communityId',
      as: 'community'
    });

    CommunityMember.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return CommunityMember;
};
