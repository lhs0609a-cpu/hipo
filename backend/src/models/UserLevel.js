const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserLevel = sequelize.define('UserLevel', {
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
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: '현재 레벨 (1~50)'
    },
    experiencePoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'experience_points',
      comment: '누적 경험치 (XP)'
    },
    messageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'message_count',
      comment: '총 메시지 수 (1메시지 = 1XP)'
    },
    likesReceived: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'likes_received',
      comment: '받은 좋아요 수 (1좋아요 = 5XP)'
    },
    bestMemberBadge: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'best_member_badge',
      comment: 'Lv.10 달성 시 "방 내 베스트 멤버" 뱃지'
    },
    eliteMemberBadge: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'elite_member_badge',
      comment: 'Lv.20 달성 시 "엘리트 멤버" 뱃지'
    },
    legendMemberBadge: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'legend_member_badge',
      comment: 'Lv.30 달성 시 "레전드 멤버" 뱃지'
    },
    lastLevelUpAt: {
      type: DataTypes.DATE,
      field: 'last_level_up_at',
      comment: '마지막 레벨업 일시'
    },
    isViceAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_vice_admin',
      comment: '부방장 여부'
    }
  }, {
    tableName: 'user_levels',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['community_id', 'user_id']
      },
      { fields: ['community_id', 'level'] },
      { fields: ['community_id', 'experience_points'] },
      { fields: ['is_vice_admin'] }
    ]
  });

  UserLevel.associate = (models) => {
    UserLevel.belongsTo(models.ShareholderCommunity, {
      foreignKey: 'communityId',
      as: 'community'
    });

    UserLevel.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  // 레벨업 계산 로직
  UserLevel.prototype.calculateLevel = function() {
    // 레벨 공식: level = floor(sqrt(XP / 100))
    // Lv.1: 0-99 XP, Lv.2: 100-399 XP, Lv.3: 400-899 XP, ...
    const calculatedLevel = Math.floor(Math.sqrt(this.experiencePoints / 100)) + 1;
    return Math.min(calculatedLevel, 50); // 최대 레벨 50
  };

  // 경험치 추가 및 레벨업 체크
  UserLevel.prototype.addExperience = async function(xp) {
    const oldLevel = this.level;
    this.experiencePoints += xp;

    const newLevel = this.calculateLevel();

    if (newLevel > oldLevel) {
      this.level = newLevel;
      this.lastLevelUpAt = new Date();

      // 뱃지 자동 부여
      if (newLevel >= 10 && !this.bestMemberBadge) {
        this.bestMemberBadge = true;
      }
      if (newLevel >= 20 && !this.eliteMemberBadge) {
        this.eliteMemberBadge = true;
      }
      if (newLevel >= 30 && !this.legendMemberBadge) {
        this.legendMemberBadge = true;
      }
    }

    await this.save();

    return {
      leveledUp: newLevel > oldLevel,
      oldLevel,
      newLevel: this.level,
      totalXP: this.experiencePoints
    };
  };

  return UserLevel;
};
