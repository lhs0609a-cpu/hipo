const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StockTransaction = sequelize.define('StockTransaction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    buyerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'buyer_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    sellerId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'seller_id',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '매도자 (시장가 매수시 null 가능)'
    },
    stockId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'stock_id',
      references: {
        model: 'stocks',
        key: 'id'
      },
      comment: '거래된 주식'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    pricePerShare: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'price_per_share',
      validate: {
        min: 0
      }
    },
    totalAmount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'total_amount'
    },
    fee: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '거래 수수료'
    },
    transactionType: {
      type: DataTypes.ENUM('buy', 'sell', 'transfer', 'grant', 'ipo'),
      allowNull: false,
      defaultValue: 'buy',
      field: 'transaction_type'
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'cancelled', 'failed'),
      defaultValue: 'completed',
      comment: '거래 상태'
    }
  }, {
    tableName: 'stock_transactions',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['buyer_id'] },
      { fields: ['seller_id'] },
      { fields: ['stock_id'] },
      { fields: ['created_at'] }
    ]
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

    StockTransaction.belongsTo(models.Stock, {
      foreignKey: 'stockId',
      as: 'stock'
    });
  };

  return StockTransaction;
};
