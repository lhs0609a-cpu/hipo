const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DMLimit = sequelize.define('DMLimit', {
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
      field: 'user_id',
      comment: 'DM을 보내는 사용자'
    },
    targetUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'target_user_id',
      comment: 'DM을 받는 사용자 (대상)'
    },
    month: {
      type: DataTypes.STRING(7),
      allowNull: false,
      comment: 'YYYY-MM 형식의 월'
    },
    dmCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'dm_count',
      comment: '해당 월에 보낸 DM 개수'
    }
  }, {
    tableName: 'dm_limits',
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'target_user_id', 'month']
      },
      { fields: ['user_id'] },
      { fields: ['target_user_id'] }
    ]
  });

  DMLimit.associate = (models) => {
    DMLimit.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'sender'
    });

    DMLimit.belongsTo(models.User, {
      foreignKey: 'targetUserId',
      as: 'receiver'
    });
  };

  return DMLimit;
};
