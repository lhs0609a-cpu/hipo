const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WalletTransaction = sequelize.define('WalletTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    comment: '사용자 ID'
  },
  paymentId: {
    type: DataTypes.INTEGER,
    field: 'payment_id',
    references: {
      model: 'payments',
      key: 'id'
    },
    comment: '결제 ID (충전인 경우)'
  },
  type: {
    type: DataTypes.ENUM('CHARGE', 'USE', 'REFUND', 'BONUS', 'ADMIN_ADJUSTMENT'),
    allowNull: false,
    comment: '거래 유형 (충전/사용/환불/보너스/관리자조정)'
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '거래 금액 (원) - 충전/환불/보너스는 양수, 사용은 음수'
  },
  balanceBefore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'balance_before',
    comment: '거래 전 잔액'
  },
  balanceAfter: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'balance_after',
    comment: '거래 후 잔액'
  },
  description: {
    type: DataTypes.STRING(500),
    comment: '거래 설명'
  },
  metadata: {
    type: DataTypes.JSON,
    comment: '추가 정보 (JSON)'
  }
}, {
  tableName: 'wallet_transactions',
  timestamps: true,
  underscored: false,
  updatedAt: false,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['type'] },
    { fields: ['created_at'] }
  ]
});

  WalletTransaction.associate = (models) => {
    // 사용자와의 관계
    WalletTransaction.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // Payment와의 관계
    WalletTransaction.belongsTo(models.Payment, {
      foreignKey: 'paymentId',
      as: 'payment'
    });
  };

  return WalletTransaction;
};
