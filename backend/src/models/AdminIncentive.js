const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AdminIncentive = sequelize.define('AdminIncentive', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    adminRecordId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'community_admins',
        key: 'id'
      },
      field: 'admin_record_id',
      onDelete: 'CASCADE'
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
    month: {
      type: DataTypes.STRING(7),
      allowNull: false,
      comment: '보상 월 (YYYY-MM)'
    },
    baseReward: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      field: 'base_reward',
      comment: '기본 월 보상'
    },
    activityBonus: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      field: 'activity_bonus',
      comment: '활성도 보너스'
    },
    zeroReportBonus: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      field: 'zero_report_bonus',
      comment: '신고 0건 보너스 (100코인)'
    },
    satisfactionBonus: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      field: 'satisfaction_bonus',
      comment: '상장인 만족도 보너스 (200코인)'
    },
    totalReward: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      field: 'total_reward',
      comment: '총 보상'
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_paid',
      comment: '지급 완료 여부'
    },
    paidAt: {
      type: DataTypes.DATE,
      field: 'paid_at',
      comment: '지급 일시'
    },
    tierLevel: {
      type: DataTypes.ENUM('EXCELLENT', 'MAJOR', 'LARGEST'),
      field: 'tier_level',
      comment: '방 등급 (우량/대주주/최대주주)'
    }
  }, {
    tableName: 'admin_incentives',
    timestamps: true,
    indexes: [
      { fields: ['admin_record_id'] },
      { fields: ['community_id'] },
      { fields: ['user_id'] },
      { fields: ['month'] },
      { fields: ['is_paid'] },
      {
        unique: true,
        fields: ['admin_record_id', 'month']
      }
    ]
  });

  AdminIncentive.associate = (models) => {
    AdminIncentive.belongsTo(models.CommunityAdmin, {
      foreignKey: 'adminRecordId',
      as: 'adminRecord'
    });

    AdminIncentive.belongsTo(models.ShareholderCommunity, {
      foreignKey: 'communityId',
      as: 'community'
    });

    AdminIncentive.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'admin'
    });
  };

  return AdminIncentive;
};
