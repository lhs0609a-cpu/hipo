const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StockTransaction = sequelize.define('StockTransaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    buyerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    sellerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    targetUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '주식의 대상이 되는 사용자 (누구의 주식인지)'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    pricePerShare: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    transactionType: {
      type: DataTypes.ENUM('buy', 'sell', 'transfer', 'grant'),
      allowNull: false,
      defaultValue: 'buy'
    }
  }, {
    tableName: 'stock_transactions',
    underscored: true,
    timestamps: true
  });

  StockTransaction.associate = (models) => {
    StockTransaction.belongsTo(models.User, {
      foreignKey: 'buyerId',
      as: 'buyer'
    });

    StockTransaction.belongsTo(models.User, {
      foreignKey: 'sellerId',
      as: 'seller'
    });

    StockTransaction.belongsTo(models.User, {
      foreignKey: 'targetUserId',
      as: 'targetUser'
    });
  };

  return StockTransaction;
};
