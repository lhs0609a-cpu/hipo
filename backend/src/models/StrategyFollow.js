const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StrategyFollow = sequelize.define('StrategyFollow', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      comment: '팔로워 사용자 ID',
      references: {
        model: 'users',
        key: 'id'
      }
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
    isAutoCopy: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_auto_copy',
      comment: '자동 복사 거래 여부'
    },
    copyPercentage: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
      field: 'copy_percentage',
      comment: '복사 비율 % (기본 100%)'
    },
    totalInvested: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_invested',
      comment: '총 투자 금액 (PO)'
    },
    currentReturn: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'current_return',
      comment: '현재 수익률 %'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at'
    }
  }, {
    tableName: 'strategy_follows',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'strategy_id'],
        name: 'unique_user_strategy'
      },
      { fields: ['user_id'] },
      { fields: ['strategy_id'] },
      { fields: ['is_auto_copy'] }
    ]
  });

  StrategyFollow.associate = (models) => {
    // 팔로워
    StrategyFollow.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // 전략
    StrategyFollow.belongsTo(models.InvestmentStrategy, {
      foreignKey: 'strategyId',
      as: 'strategy'
    });
  };

  return StrategyFollow;
};
