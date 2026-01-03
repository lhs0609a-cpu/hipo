const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const IPOEligibility = sequelize.define('IPOEligibility', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'user_id'
    },
    // === 자격 요건 충족 상태 ===
    followerRequirementMet: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'follower_requirement_met',
      comment: '팔로워 수 요건 충족'
    },
    activityPeriodMet: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'activity_period_met',
      comment: '활동 기간 요건 충족'
    },
    identityVerifiedMet: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'identity_verified_met',
      comment: '본인 인증 요건 충족'
    },
    contentScoreMet: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'content_score_met',
      comment: '콘텐츠 점수 요건 충족'
    },
    profileCompleteMet: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'profile_complete_met',
      comment: '프로필 완성도 요건 충족'
    },
    // === 현재 수치 ===
    currentFollowers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'current_followers',
      comment: '현재 팔로워 수'
    },
    accountAgeDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'account_age_days',
      comment: '계정 나이 (일)'
    },
    contentScore: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      field: 'content_score',
      comment: '콘텐츠 점수 (0-100)'
    },
    profileCompleteness: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'profile_completeness',
      comment: '프로필 완성도 (%)'
    },
    // === 요건 기준 (설정 가능) ===
    requiredFollowers: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
      field: 'required_followers',
      comment: '필요 팔로워 수'
    },
    requiredActivityDays: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      field: 'required_activity_days',
      comment: '필요 활동 기간 (일)'
    },
    requiredContentScore: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 50,
      field: 'required_content_score',
      comment: '필요 콘텐츠 점수'
    },
    requiredProfileCompleteness: {
      type: DataTypes.INTEGER,
      defaultValue: 80,
      field: 'required_profile_completeness',
      comment: '필요 프로필 완성도 (%)'
    },
    // === 종합 자격 상태 ===
    isEligible: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_eligible',
      comment: '상장 자격 충족 여부'
    },
    eligibleAt: {
      type: DataTypes.DATE,
      field: 'eligible_at',
      comment: '자격 충족 일시'
    },
    lastCheckedAt: {
      type: DataTypes.DATE,
      field: 'last_checked_at',
      comment: '마지막 자격 확인 일시'
    },
    // === SNS 연동 (선택) ===
    connectedSocials: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: 'connected_socials',
      comment: '연동된 SNS 목록 [{platform, username, verified, followerCount}]'
    },
    externalFollowerBonus: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'external_follower_bonus',
      comment: '외부 SNS 팔로워 보너스 점수'
    }
  }, {
    tableName: 'ipo_eligibilities',
    underscored: true,
    indexes: [
      { fields: ['user_id'], unique: true },
      { fields: ['is_eligible'] }
    ]
  });

  IPOEligibility.associate = (models) => {
    IPOEligibility.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return IPOEligibility;
};
