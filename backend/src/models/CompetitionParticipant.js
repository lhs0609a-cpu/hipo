const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CompetitionParticipant = sequelize.define('CompetitionParticipant', {
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      comment: '참가자 ID',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    initialCapital: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'initial_capital',
      comment: '초기 자본 (가상)'
    },
    currentCapital: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'current_capital',
      comment: '현재 자본'
    },
    totalProfit: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_profit',
      comment: '총 수익 (PO)'
    },
    profitRate: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'profit_rate',
      comment: '수익률 %'
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
    winRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      field: 'win_rate',
      comment: '승률 %'
    },
    currentRank: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'current_rank',
      comment: '현재 순위'
    },
    finalRank: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'final_rank',
      comment: '최종 순위'
    },
    prizeAmount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'prize_amount',
      comment: '상금 (PO 코인)'
    },
    portfolio: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '현재 포트폴리오 (JSON)'
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
    tableName: 'competition_participants',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['competition_id', 'user_id'],
        name: 'unique_competition_user'
      },
      { fields: ['competition_id'] },
      { fields: ['user_id'] },
      { fields: ['current_rank'] },
      { fields: ['profit_rate'] }
    ]
  });

  CompetitionParticipant.associate = (models) => {
    // 대회
    CompetitionParticipant.belongsTo(models.TradingCompetition, {
      foreignKey: 'competitionId',
      as: 'competition'
    });

    // 참가자
    CompetitionParticipant.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // 대회 거래
    CompetitionParticipant.hasMany(models.CompetitionTrade, {
      foreignKey: 'participantId',
      as: 'trades'
    });
  };

  return CompetitionParticipant;
};
