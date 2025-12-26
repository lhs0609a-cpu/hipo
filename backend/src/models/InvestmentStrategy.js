const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InvestmentStrategy = sequelize.define('InvestmentStrategy', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      comment: '전략 작성자 ID',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '전략 제목'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '전략 설명'
    },
    strategyType: {
      type: DataTypes.ENUM(
        'GROWTH',           // 성장주 투자
        'VALUE',            // 가치 투자
        'DIVIDEND',         // 배당 투자
        'MOMENTUM',         // 모멘텀 투자
        'SWING',            // 스윙 트레이딩
        'DAY_TRADING',      // 데이 트레이딩
        'LONG_TERM',        // 장기 투자
        'CUSTOM'            // 커스텀 전략
      ),
      allowNull: false,
      field: 'strategy_type',
      comment: '전략 유형'
    },
    riskLevel: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
      allowNull: false,
      defaultValue: 'MEDIUM',
      field: 'risk_level',
      comment: '위험도'
    },
    targetReturn: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'target_return',
      comment: '목표 수익률 %'
    },
    rules: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '전략 규칙 (JSON 형식)'
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_public',
      comment: '공개 여부'
    },
    isPremium: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_premium',
      comment: '프리미엄 전략 여부 (유료)'
    },
    subscriptionFee: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'subscription_fee',
      comment: '월 구독료 (PO 코인)'
    },
    followerCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'follower_count',
      comment: '팔로워 수'
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'view_count',
      comment: '조회 수'
    },
    totalReturn: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'total_return',
      comment: '누적 수익률 %'
    },
    winRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      field: 'win_rate',
      comment: '승률 %'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
      comment: '활성화 여부'
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
    tableName: 'investment_strategies',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['strategy_type'] },
      { fields: ['is_public'] },
      { fields: ['follower_count'] },
      { fields: ['total_return'] }
    ]
  });

  InvestmentStrategy.associate = (models) => {
    // 전략 작성자
    InvestmentStrategy.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'creator'
    });

    // 팔로워
    InvestmentStrategy.hasMany(models.StrategyFollow, {
      foreignKey: 'strategyId',
      as: 'followers'
    });

    // 전략 거래 내역
    InvestmentStrategy.hasMany(models.StrategyTrade, {
      foreignKey: 'strategyId',
      as: 'trades'
    });

    // 성과 기록
    InvestmentStrategy.hasMany(models.StrategyPerformance, {
      foreignKey: 'strategyId',
      as: 'performance'
    });
  };

  return InvestmentStrategy;
};
