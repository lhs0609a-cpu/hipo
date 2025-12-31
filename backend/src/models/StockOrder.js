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
    },
    // === 지정가/예약 주문 확장 ===
    stockId: {
      type: DataTypes.UUID,
      references: {
        model: 'stocks',
        key: 'id'
      },
      field: 'stock_id',
      comment: '주식 ID'
    },
    orderMode: {
      type: DataTypes.ENUM('market', 'limit', 'stop_loss', 'take_profit', 'stop_limit'),
      defaultValue: 'market',
      field: 'order_mode',
      comment: '주문 유형: 시장가, 지정가, 손절, 익절, 스탑리밋'
    },
    limitPrice: {
      type: DataTypes.INTEGER,
      field: 'limit_price',
      comment: '지정가 (이 가격에 체결)'
    },
    stopPrice: {
      type: DataTypes.INTEGER,
      field: 'stop_price',
      comment: '스탑 가격 (이 가격 도달시 주문 발동)'
    },
    triggerCondition: {
      type: DataTypes.ENUM('gte', 'lte'),
      field: 'trigger_condition',
      comment: '트리거 조건: 이상(gte), 이하(lte)'
    },
    isTriggered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_triggered',
      comment: '스탑 주문 발동 여부'
    },
    triggeredAt: {
      type: DataTypes.DATE,
      field: 'triggered_at',
      comment: '발동 시간'
    },
    fee: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '거래 수수료'
    },
    cancelReason: {
      type: DataTypes.STRING(255),
      field: 'cancel_reason',
      comment: '취소 사유'
    },
    cancelledAt: {
      type: DataTypes.DATE,
      field: 'cancelled_at',
      comment: '취소 시간'
    },
    filledAt: {
      type: DataTypes.DATE,
      field: 'filled_at',
      comment: '완전 체결 시간'
    },
    averageFilledPrice: {
      type: DataTypes.INTEGER,
      field: 'average_filled_price',
      comment: '평균 체결가'
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

    StockOrder.belongsTo(models.Stock, {
      foreignKey: 'stockId',
      as: 'stock'
    });

    StockOrder.hasMany(models.StockTrade, {
      foreignKey: 'orderId',
      as: 'trades'
    });
  };

  return StockOrder;
};
