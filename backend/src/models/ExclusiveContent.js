const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ExclusiveContent = sequelize.define('ExclusiveContent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    creatorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      field: 'creator_id'
    },
    contentType: {
      type: DataTypes.ENUM('BEHIND_SCENE', 'HONEST_THOUGHT', 'REVENUE_DISCLOSURE', 'DELETED_SCENE', 'ONE_ON_ONE', 'PREVIEW'),
      allowNull: false,
      field: 'content_type'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    mediaUrl: {
      type: DataTypes.STRING,
      field: 'media_url'
    },
    minSharesRequired: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'min_shares_required',
      comment: '최소 보유 주식 수'
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'view_count'
    },
    isLimited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_limited',
      comment: '한정판 (선착순 제한)'
    },
    maxViewers: {
      type: DataTypes.INTEGER,
      field: 'max_viewers',
      comment: '최대 시청자 수 (한정판일 경우)'
    },
    expiresAt: {
      type: DataTypes.DATE,
      field: 'expires_at',
      comment: '만료 일시'
    }
  }, {
    tableName: 'exclusive_contents',
    timestamps: true,
    indexes: [
      { fields: ['creator_id'] },
      { fields: ['content_type'] },
      { fields: ['min_shares_required'] }
    ]
  });

  ExclusiveContent.associate = (models) => {
    ExclusiveContent.belongsTo(models.User, { foreignKey: 'creatorId', as: 'creator' });
    ExclusiveContent.hasMany(models.ExclusiveContentView, { foreignKey: 'contentId', as: 'views' });
  };

  return ExclusiveContent;
};
