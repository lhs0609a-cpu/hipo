const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserBadge = sequelize.define('UserBadge', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
    badgeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'badges',
        key: 'id'
      },
      field: 'badge_id'
    },
    targetUserId: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'target_user_id',
      comment: '주주 뱃지의 경우 대상 인플루언서 ID'
    },
    earnedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'earned_at',
      comment: '뱃지 획득 일시'
    },
    isDisplayed: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_displayed',
      comment: '프로필에 표시 여부'
    }
  }, {
    tableName: 'user_badges',
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'badge_id', 'target_user_id']
      },
      { fields: ['user_id'] },
      { fields: ['badge_id'] }
    ]
  });

  UserBadge.associate = (models) => {
    UserBadge.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    UserBadge.belongsTo(models.Badge, {
      foreignKey: 'badgeId',
      as: 'badge'
    });

    UserBadge.belongsTo(models.User, {
      foreignKey: 'targetUserId',
      as: 'targetUser'
    });
  };

  return UserBadge;
};
