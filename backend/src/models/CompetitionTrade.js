const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CompetitionTrade = sequelize.define('CompetitionTrade', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    competitionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'competition_id',
      comment: '대회 ID',
      references: {
        model: 'trading_competitions',
        key: 'id'
      }
    },
    participantId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'participant_id',
      comment: '참가자 ID',
      references: {
        model: 'competition_participants',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      comment: '사용자 ID',
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
    capitalAfterTrade: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'capital_after_trade',
      comment: '거래 후 자본'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    }
  }, {
    tableName: 'competition_trades',
    underscored: true,
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['competition_id'] },
      { fields: ['participant_id'] },
      { fields: ['user_id'] },
      { fields: ['stock_id'] },
      { fields: ['trade_type'] },
      { fields: ['created_at'] }
    ]
  });

  CompetitionTrade.associate = (models) => {
    // 대회
    CompetitionTrade.belongsTo(models.TradingCompetition, {
      foreignKey: 'competitionId',
      as: 'competition'
    });

    // 참가자
    CompetitionTrade.belongsTo(models.CompetitionParticipant, {
      foreignKey: 'participantId',
      as: 'participant'
    });

    // 사용자
    CompetitionTrade.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // 주식
    CompetitionTrade.belongsTo(models.Stock, {
      foreignKey: 'stockId',
      as: 'stock'
    });
  };

  return CompetitionTrade;
};
