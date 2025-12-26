const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StockTrade = sequelize.define('StockTrade', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    buyOrderId: {
      type: DataTypes.UUID,
      references: {
        model: 'stock_orders',
        key: 'id'
      },
      field: 'buy_order_id',
      comment: '매수 주문 ID'
    },
    sellOrderId: {
      type: DataTypes.UUID,
      references: {
        model: 'stock_orders',
        key: 'id'
      },
      field: 'sell_order_id',
      comment: '매도 주문 ID'
    },
    buyerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'buyer_id'
    },
    sellerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'seller_id'
    },
    targetUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'target_user_id',
      comment: '주식 대상 (인플루언서)'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '체결 수량'
    },
    pricePerShare: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'price_per_share',
      comment: '체결 가격'
    },
    totalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'total_amount',
      comment: '총 거래 금액'
    }
  }, {
    tableName: 'stock_trades',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['buyer_id'] },
      { fields: ['seller_id'] },
      { fields: ['target_user_id'] },
      { fields: ['created_at'] }
    ]
  });

  StockTrade.associate = (models) => {
    StockTrade.belongsTo(models.StockOrder, {
      foreignKey: 'buyOrderId',
      as: 'buyOrder'
    });

    StockTrade.belongsTo(models.StockOrder, {
      foreignKey: 'sellOrderId',
      as: 'sellOrder'
    });

    StockTrade.belongsTo(models.User, {
      foreignKey: 'buyerId',
      as: 'buyer'
    });

    StockTrade.belongsTo(models.User, {
      foreignKey: 'sellerId',
      as: 'seller'
    });

    StockTrade.belongsTo(models.User, {
      foreignKey: 'targetUserId',
      as: 'targetUser'
    });
  };

  return StockTrade;
};
