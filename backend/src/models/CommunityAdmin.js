const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunityAdmin = sequelize.define('CommunityAdmin', {
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
      comment: '방장 유저 ID'
    },
    shareholdingAtAppointment: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'shareholding_at_appointment',
      comment: '방장 임명 시 주식 보유량'
    },
    appointedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'appointed_at',
      comment: '방장 임명 일시'
    },
    removedAt: {
      type: DataTypes.DATE,
      field: 'removed_at',
      comment: '방장 해임 일시'
    },
    removalReason: {
      type: DataTypes.ENUM('AUTO_REPLACED', 'VOLUNTARY', 'SUSPENSION', 'ABUSE'),
      field: 'removal_reason',
      comment: '해임 사유'
    },
    daysServed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'days_served',
      comment: '방장 재임 일수'
    },
    totalRewards: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      field: 'total_rewards',
      comment: '총 방장 보상'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
      comment: '현재 방장 여부'
    },
    suspendedUntil: {
      type: DataTypes.DATE,
      field: 'suspended_until',
      comment: '권한 정지 해제 일시'
    }
  }, {
    tableName: 'community_admins',
    timestamps: true,
    indexes: [
      { fields: ['community_id'] },
      { fields: ['user_id'] },
      { fields: ['is_active'] },
      {
        unique: true,
        fields: ['community_id'],
        where: { is_active: true },
        name: 'unique_active_admin_per_community'
      }
    ]
  });

  CommunityAdmin.associate = (models) => {
    CommunityAdmin.belongsTo(models.ShareholderCommunity, {
      foreignKey: 'communityId',
      as: 'community'
    });

    CommunityAdmin.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'admin'
    });
  };

  return CommunityAdmin;
};
