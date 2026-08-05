const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const HoldingBonus = sequelize.define('HoldingBonus', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      field: 'user_id',
    },
    stockId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'stocks',
        key: 'id',
      },
      field: 'stock_id',
    },
    holdingId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'holdings',
        key: 'id',
      },
      field: 'holding_id',
    },
    milestoneDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'milestone_days',
      comment: '달성한 마일스톤 (7, 30, 90, 180, 365일)',
    },
    bonusAmount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'bonus_amount',
      comment: '지급된 보너스 PO',
    },
    bonusRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      field: 'bonus_rate',
      comment: '보너스 비율 (%)',
    },
    holdingValue: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'holding_value',
      comment: '보너스 계산 시점의 보유 가치',
    },
    sharesHeld: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'shares_held',
      comment: '보유 주식 수',
    },
    claimedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'claimed_at',
    },
  }, {
    tableName: 'holding_bonuses',
    timestamps: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['stock_id'] },
      { fields: ['holding_id'] },
      { fields: ['milestone_days'] },
      { fields: ['user_id', 'stock_id', 'milestone_days'], unique: true },
    ],
  });

  HoldingBonus.associate = (models) => {
    HoldingBonus.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
    HoldingBonus.belongsTo(models.Stock, {
      foreignKey: 'stockId',
      as: 'stock',
    });
    HoldingBonus.belongsTo(models.Holding, {
      foreignKey: 'holdingId',
      as: 'holding',
    });
  };

  // 마일스톤별 보너스 비율 (%)
  HoldingBonus.getMilestones = () => {
    return [
      { days: 7, rate: 0.5, label: '1주일 홀더', description: '7일 연속 보유', icon: 'calendar-outline', color: '#4CAF50' },
      { days: 30, rate: 1.5, label: '1개월 홀더', description: '30일 연속 보유', icon: 'medal-outline', color: '#2196F3' },
      { days: 90, rate: 3.0, label: '분기 홀더', description: '90일 연속 보유', icon: 'star-outline', color: '#9C27B0' },
      { days: 180, rate: 5.0, label: '반년 홀더', description: '180일 연속 보유', icon: 'trophy-outline', color: '#FF9800' },
      { days: 365, rate: 10.0, label: '연간 홀더', description: '365일 연속 보유', icon: 'diamond-outline', color: '#E91E63' },
    ];
  };

  // 보유 기간에 따른 다음 마일스톤 계산
  HoldingBonus.getNextMilestone = (holdingDays) => {
    const milestones = HoldingBonus.getMilestones();
    return milestones.find(m => m.days > holdingDays) || null;
  };

  // 보유 기간에 따른 달성한 마일스톤 목록
  HoldingBonus.getAchievedMilestones = (holdingDays) => {
    const milestones = HoldingBonus.getMilestones();
    return milestones.filter(m => m.days <= holdingDays);
  };

  return HoldingBonus;
};
