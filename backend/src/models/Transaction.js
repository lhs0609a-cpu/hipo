const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    buyerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'buyer_id'
    },
    sellerId: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'seller_id'
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
      validate: {
        min: 1
      }
    },
    pricePerShare: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'price_per_share'
    },
    totalAmount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'total_amount'
    },
    transactionType: {
      type: DataTypes.ENUM('buy', 'sell'),
      allowNull: false,
      field: 'transaction_type'
    }
  }, {
    tableName: 'transactions',
    underscored: true,
    updatedAt: false,
    indexes: [
      { fields: ['buyer_id'] },
      { fields: ['seller_id'] },
      { fields: ['stock_id'] },
      { fields: ['created_at'] }
    ]
  });

  Transaction.associate = (models) => {
    // 구매자
    Transaction.belongsTo(models.User, {
      foreignKey: 'buyerId',
      as: 'buyer'
    });

    // 판매자
    Transaction.belongsTo(models.User, {
      foreignKey: 'sellerId',
      as: 'seller'
    });

    // 주식
    Transaction.belongsTo(models.Stock, {
      foreignKey: 'stockId',
      as: 'stock'
    });
  };

  return Transaction;
};
