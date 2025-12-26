const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StrategyTrade = sequelize.define('StrategyTrade', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    strategyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'strategy_id',
      comment: '전략 ID',
      references: {
        model: 'investment_strategies',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      comment: '거래한 사용자 ID',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    stockId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'stock_id',
      comment: '주식 ID',
      references: {
        model: 'stocks',
        key: 'id'
      }
    },
    tradeType: {
      type: DataTypes.ENUM('BUY', 'SELL'),
      allowNull: false,
      field: 'trade_type',
      comment: '거래 유형'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '거래 수량'
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '거래 가격'
    },
    totalAmount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'total_amount',
      comment: '총 거래 금액'
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '거래 이유'
    },
    profitLoss: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'profit_loss',
      comment: '손익 (매도 시)'
    },
    profitLossPercent: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'profit_loss_percent',
      comment: '손익률 % (매도 시)'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    }
  }, {
    tableName: 'strategy_trades',
    underscored: true,
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['strategy_id'] },
      { fields: ['user_id'] },
      { fields: ['stock_id'] },
      { fields: ['trade_type'] },
      { fields: ['created_at'] }
    ]
  });

  StrategyTrade.associate = (models) => {
    // 전략
    StrategyTrade.belongsTo(models.InvestmentStrategy, {
      foreignKey: 'strategyId',
      as: 'strategy'
    });

    // 사용자
    StrategyTrade.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // 주식
    StrategyTrade.belongsTo(models.Stock, {
      foreignKey: 'stockId',
      as: 'stock'
    });
  };

  return StrategyTrade;
};
