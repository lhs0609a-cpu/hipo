const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Holding = sequelize.define('Holding', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
    stockId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'stocks',
        key: 'id'
      },
      field: 'stock_id'
    },
    shares: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    averagePrice: {
      type: DataTypes.INTEGER,
      field: 'average_price'
    },
    acquiredAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'acquired_at'
    }
  }, {
    tableName: 'holdings',
    indexes: [
      { fields: ['holder_id'] },
      { fields: ['stock_id'] },
      { unique: true, fields: ['holder_id', 'stock_id'] }
    ]
  });

  Holding.associate = (models) => {
    // 보유자
    Holding.belongsTo(models.User, {
      foreignKey: 'holderId',
      as: 'holder'
    });

    // 주식
    Holding.belongsTo(models.Stock, {
      foreignKey: 'stockId',
      as: 'stock'
    });
  };

  return Holding;
};
