const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AdminReview = sequelize.define('AdminReview', {
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
    adminId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'admin_id',
      comment: '평가받는 방장'
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'reviewed_by',
      comment: '평가자 (상장인)'
    },
    month: {
      type: DataTypes.STRING(7),
      allowNull: false,
      comment: '평가 월 (YYYY-MM)'
    },
    communicationScore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'communication_score',
      comment: '소통 적극성 (1-5)'
    },
    managementScore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'management_score',
      comment: '방 관리 능력 (1-5)'
    },
    contributionScore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'contribution_score',
      comment: '공동체 기여 (1-5)'
    },
    totalScore: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_score',
      comment: '총점 (15점 만점)'
    },
    comment: {
      type: DataTypes.TEXT,
      comment: '한 마디'
    },
    bonusAwarded: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      field: 'bonus_awarded',
      comment: '지급된 보너스 (만점 시 500코인)'
    },
    isPerfect: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_perfect',
      comment: '만점 여부'
    }
  }, {
    tableName: 'admin_reviews',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['community_id'] },
      { fields: ['admin_id'] },
      { fields: ['reviewed_by'] },
      { fields: ['month'] },
      {
        unique: true,
        fields: ['community_id', 'month']
      }
    ]
  });

  AdminReview.associate = (models) => {
    AdminReview.belongsTo(models.ShareholderCommunity, {
      foreignKey: 'communityId',
      as: 'community'
    });

    AdminReview.belongsTo(models.User, {
      foreignKey: 'adminId',
      as: 'admin'
    });

    AdminReview.belongsTo(models.User, {
      foreignKey: 'reviewedBy',
      as: 'reviewer'
    });
  };

  return AdminReview;
};
