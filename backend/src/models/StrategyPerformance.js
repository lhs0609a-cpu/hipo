const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StrategyPerformance = sequelize.define('StrategyPerformance', {
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: '날짜'
    },
    portfolioValue: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'portfolio_value',
      comment: '포트폴리오 가치 (PO)'
    },
    dailyReturn: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'daily_return',
      comment: '일일 수익률 %'
    },
    cumulativeReturn: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'cumulative_return',
      comment: '누적 수익률 %'
    },
    totalTrades: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_trades',
      comment: '총 거래 수'
    },
    winningTrades: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'winning_trades',
      comment: '수익 거래 수'
    },
    losingTrades: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'losing_trades',
      comment: '손실 거래 수'
    },
    sharpeRatio: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
      field: 'sharpe_ratio',
      comment: '샤프 비율'
    },
    maxDrawdown: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'max_drawdown',
      comment: '최대 낙폭 %'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    }
  }, {
    tableName: 'strategy_performance',
    underscored: true,
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['strategy_id', 'date'],
        name: 'unique_strategy_date'
      },
      { fields: ['strategy_id'] },
      { fields: ['date'] }
    ]
  });

  StrategyPerformance.associate = (models) => {
    // 전략
    StrategyPerformance.belongsTo(models.InvestmentStrategy, {
      foreignKey: 'strategyId',
      as: 'strategy'
    });
  };

  return StrategyPerformance;
};
