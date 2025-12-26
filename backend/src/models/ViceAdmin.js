const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ViceAdmin = sequelize.define('ViceAdmin', {
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
      comment: '부방장 유저 ID'
    },
    appointedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'appointed_by',
      comment: '임명한 방장 ID'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
      comment: '활성 상태'
    },
    removedAt: {
      type: DataTypes.DATE,
      field: 'removed_at',
      comment: '부방장 해제 일시'
    },
    removalReason: {
      type: DataTypes.TEXT,
      field: 'removal_reason',
      comment: '해제 사유'
    },
    permissions: {
      type: DataTypes.JSON,
      defaultValue: {
        canWarn: true,
        canKick: false, // 기본적으로 강퇴 권한 없음
        canPin: true,
        canDeleteMessages: true,
        canCreatePolls: true
      },
      comment: '부방장 권한 설정'
    },
    warningsIssued: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'warnings_issued',
      comment: '발급한 경고 수'
    },
    messagesDeleted: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'messages_deleted',
      comment: '삭제한 메시지 수'
    }
  }, {
    tableName: 'vice_admins',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['community_id', 'user_id'],
        where: { is_active: true },
        name: 'unique_active_vice_admin'
      },
      { fields: ['community_id'] },
      { fields: ['user_id'] },
      { fields: ['appointed_by'] }
    ]
  });

  ViceAdmin.associate = (models) => {
    ViceAdmin.belongsTo(models.ShareholderCommunity, {
      foreignKey: 'communityId',
      as: 'community'
    });

    ViceAdmin.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'viceAdmin'
    });

    ViceAdmin.belongsTo(models.User, {
      foreignKey: 'appointedBy',
      as: 'appointedByAdmin'
    });
  };

  return ViceAdmin;
};
