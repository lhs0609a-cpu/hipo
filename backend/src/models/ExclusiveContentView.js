const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ExclusiveContentView = sequelize.define('ExclusiveContentView', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    contentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'exclusive_contents', key: 'id' },
      field: 'content_id'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      field: 'user_id'
    },
    shareholdingAtView: {
      type: DataTypes.INTEGER,
      field: 'shareholding_at_view',
      comment: '시청 시점의 보유 주식 수'
    }
  }, {
    tableName: 'exclusive_content_views',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { unique: true, fields: ['content_id', 'user_id'] },
      { fields: ['user_id'] }
    ]
  });

  ExclusiveContentView.associate = (models) => {
    ExclusiveContentView.belongsTo(models.ExclusiveContent, { foreignKey: 'contentId', as: 'content' });
    ExclusiveContentView.belongsTo(models.User, { foreignKey: 'userId', as: 'viewer' });
  };

  return ExclusiveContentView;
};
