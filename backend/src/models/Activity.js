const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Activity = sequelize.define('Activity', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
    activityType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'activity_type'
      // 'login', 'post', 'comment', 'like', 'share'
    },
    poEarned: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'po_earned'
    },
    multiplierApplied: {
      type: DataTypes.DECIMAL(3, 2),
      field: 'multiplier_applied'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'activities',
    updatedAt: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['activity_type'] },
      { fields: ['created_at'] }
    ]
  });

  Activity.associate = (models) => {
    // 활동 사용자
    Activity.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // 이 활동으로 발생한 배당들
    Activity.hasMany(models.Dividend, {
      foreignKey: 'sourceActivityId',
      as: 'generatedDividends'
    });
  };

  return Activity;
};
