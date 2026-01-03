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
    },
    // === 주주 등급별 설정 ===
    stockId: {
      type: DataTypes.UUID,
      references: {
        model: 'stocks',
        key: 'id'
      },
      field: 'stock_id',
      comment: '연결된 주식 ID'
    },
    vipMinShares: {
      type: DataTypes.INTEGER,
      defaultValue: 1000,
      field: 'vip_min_shares',
      comment: 'VIP 등급 최소 주식 수'
    },
    premiumMinShares: {
      type: DataTypes.INTEGER,
      defaultValue: 500,
      field: 'premium_min_shares',
      comment: '프리미엄 등급 최소 주식 수'
    },
    regularMinShares: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
      field: 'regular_min_shares',
      comment: '일반 등급 최소 주식 수'
    },
    // === 채팅 설정 ===
    chatEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'chat_enabled',
      comment: '채팅 활성화 여부'
    },
    slowModeSeconds: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'slow_mode_seconds',
      comment: '슬로우 모드 (초단위, 0=비활성)'
    },
    mediaAllowed: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'media_allowed',
      comment: '미디어 전송 허용'
    },
    linksAllowed: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'links_allowed',
      comment: '링크 전송 허용'
    },
    // === VIP 전용 채팅방 ===
    vipRoomEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'vip_room_enabled',
      comment: 'VIP 전용 채팅방 활성화'
    },
    vipRoomName: {
      type: DataTypes.STRING,
      defaultValue: 'VIP 라운지',
      field: 'vip_room_name',
      comment: 'VIP 채팅방 이름'
    },
    // === 주주 전용 콘텐츠 ===
    exclusiveContentEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'exclusive_content_enabled',
      comment: '주주 전용 콘텐츠 활성화'
    },
    // === 통계 ===
    totalShareholders: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_shareholders',
      comment: '총 주주 수'
    },
    vipCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'vip_count',
      comment: 'VIP 등급 주주 수'
    },
    lastActivityAt: {
      type: DataTypes.DATE,
      field: 'last_activity_at',
      comment: '마지막 활동 시간'
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

    ShareholderCommunity.belongsTo(models.Stock, {
      foreignKey: 'stockId',
      as: 'stock'
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
