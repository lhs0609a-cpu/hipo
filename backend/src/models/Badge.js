const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Badge = sequelize.define('Badge', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: '뱃지 이름'
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'display_name',
      comment: '표시 이름 (예: "김OO의 최대주주")'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '뱃지 설명'
    },
    iconUrl: {
      type: DataTypes.STRING,
      field: 'icon_url',
      comment: '뱃지 아이콘 URL'
    },
    badgeType: {
      type: DataTypes.ENUM('SHAREHOLDER', 'ACHIEVEMENT', 'SPECIAL', 'REFERRAL'),
      allowNull: false,
      field: 'badge_type',
      comment: '뱃지 유형: 주주, 업적, 특별, 추천'
    },
    tier: {
      type: DataTypes.ENUM('GENERAL', 'EXCELLENT', 'MAJOR', 'LARGEST'),
      comment: '주주 등급 (주주 뱃지인 경우)'
    },
    color: {
      type: DataTypes.STRING,
      comment: '뱃지 색상 코드'
    },
    minSharesRequired: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'min_shares_required',
      comment: '뱃지 획득을 위한 최소 주식 수'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
      comment: '뱃지 활성화 여부'
    }
  }, {
    tableName: 'badges',
    timestamps: true,
    indexes: [
      { fields: ['name'], unique: true },
      { fields: ['badge_type'] },
      { fields: ['tier'] }
    ]
  });

  Badge.associate = (models) => {
    Badge.hasMany(models.UserBadge, {
      foreignKey: 'badgeId',
      as: 'userBadges'
    });
  };

  return Badge;
};
