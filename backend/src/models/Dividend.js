const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Dividend = sequelize.define('Dividend', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    stockId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'stocks',
        key: 'id'
      },
      field: 'stock_id'
    },
    holderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'holder_id'
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    sourceActivityId: {
      type: DataTypes.UUID,
      references: {
        model: 'activities',
        key: 'id'
      },
      field: 'source_activity_id'
    },
    paidAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'paid_at'
    }
  }, {
    tableName: 'dividends',
    updatedAt: false,
    indexes: [
      { fields: ['stock_id'] },
      { fields: ['holder_id'] },
      { fields: ['paid_at'] }
    ]
  });

  Dividend.associate = (models) => {
    // 주식
    Dividend.belongsTo(models.Stock, {
      foreignKey: 'stockId',
      as: 'stock'
    });

    // 배당 받은 사람
    Dividend.belongsTo(models.User, {
      foreignKey: 'holderId',
      as: 'holder'
    });

    // 배당을 발생시킨 활동
    Dividend.belongsTo(models.Activity, {
      foreignKey: 'sourceActivityId',
      as: 'sourceActivity'
    });
  };

  return Dividend;
};
