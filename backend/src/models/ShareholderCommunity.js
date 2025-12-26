const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ShareholderCommunity = sequelize.define('ShareholderCommunity', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    creatorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'creator_id',
      comment: '커뮤니티 소유자 (인플루언서)'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '커뮤니티 이름'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '커뮤니티 설명'
    },
    minSharesRequired: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
      field: 'min_shares_required',
      comment: '입장을 위한 최소 주식 수'
    },
    memberCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'member_count',
      comment: '현재 멤버 수'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
      comment: '커뮤니티 활성화 여부'
    },
    currentAdminId: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'current_admin_id',
      comment: '현재 방장 ID'
    },
    backgroundTheme: {
      type: DataTypes.STRING,
      defaultValue: 'default',
      field: 'background_theme',
      comment: '배경 테마'
    },
    customEmojis: {
      type: DataTypes.JSON,
      field: 'custom_emojis',
      comment: '전용 이모지 목록'
    },
    totalMessages: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_messages',
      comment: '총 메시지 수'
    },
    dailyMessages: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'daily_messages',
      comment: '오늘 메시지 수'
    },
    reportCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'report_count',
      comment: '미처리 신고 수'
    }
  }, {
    tableName: 'shareholder_communities',
    timestamps: true,
    indexes: [
      { fields: ['creator_id'] },
      { fields: ['min_shares_required'] }
    ]
  });

  ShareholderCommunity.associate = (models) => {
    ShareholderCommunity.belongsTo(models.User, {
      foreignKey: 'creatorId',
      as: 'creator'
    });

    ShareholderCommunity.belongsTo(models.User, {
      foreignKey: 'currentAdminId',
      as: 'currentAdmin'
    });

    ShareholderCommunity.hasMany(models.CommunityMessage, {
      foreignKey: 'communityId',
      as: 'messages'
    });

    ShareholderCommunity.hasMany(models.CommunityMember, {
      foreignKey: 'communityId',
      as: 'members'
    });

    ShareholderCommunity.hasMany(models.CommunityAdmin, {
      foreignKey: 'communityId',
      as: 'admins'
    });

    ShareholderCommunity.hasMany(models.CommunityWarning, {
      foreignKey: 'communityId',
      as: 'warnings'
    });

    ShareholderCommunity.hasMany(models.CommunityBan, {
      foreignKey: 'communityId',
      as: 'bans'
    });

    ShareholderCommunity.hasMany(models.CommunityPoll, {
      foreignKey: 'communityId',
      as: 'polls'
    });

    ShareholderCommunity.hasMany(models.CommunityNotice, {
      foreignKey: 'communityId',
      as: 'notices'
    });

    ShareholderCommunity.hasMany(models.ChatMessage, {
      foreignKey: 'communityId',
      as: 'chatMessages'
    });

    ShareholderCommunity.hasMany(models.UserLevel, {
      foreignKey: 'communityId',
      as: 'userLevels'
    });

    ShareholderCommunity.hasMany(models.ViceAdmin, {
      foreignKey: 'communityId',
      as: 'viceAdmins'
    });

    ShareholderCommunity.hasMany(models.ContentRequest, {
      foreignKey: 'communityId',
      as: 'contentRequests'
    });

    ShareholderCommunity.hasMany(models.CommunityAttendance, {
      foreignKey: 'communityId',
      as: 'attendances'
    });
  };

  return ShareholderCommunity;
};
