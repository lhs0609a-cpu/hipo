const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StockOrder = sequelize.define('StockOrder', {
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
      comment: '주문자'
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
    orderType: {
      type: DataTypes.ENUM('BUY', 'SELL'),
      allowNull: false,
      field: 'order_type',
      comment: '매수/매도'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '주문 수량'
    },
    pricePerShare: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'price_per_share',
      comment: '주당 가격 (HIPO 코인)'
    },
    totalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'total_amount',
      comment: '총 주문 금액'
    },
    filledQuantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'filled_quantity',
      comment: '체결된 수량'
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'PARTIAL', 'FILLED', 'CANCELLED'),
      defaultValue: 'PENDING',
      comment: '주문 상태: 대기, 부분체결, 전체체결, 취소'
    },
    expiresAt: {
      type: DataTypes.DATE,
      field: 'expires_at',
      comment: '주문 만료 시간'
    }
  }, {
    tableName: 'stock_orders',
    timestamps: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['target_user_id'] },
      { fields: ['order_type'] },
      { fields: ['status'] },
      { fields: ['created_at'] }
    ]
  });

  StockOrder.associate = (models) => {
    StockOrder.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'buyer'
    });

    StockOrder.belongsTo(models.User, {
      foreignKey: 'targetUserId',
      as: 'targetUser'
    });

    StockOrder.hasMany(models.StockTrade, {
      foreignKey: 'orderId',
      as: 'trades'
    });
  };

  return StockOrder;
};
