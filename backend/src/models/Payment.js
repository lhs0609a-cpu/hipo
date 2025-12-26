const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
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
  orderId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'order_id',
    comment: '주문 ID (토스페이먼츠 orderId)'
  },
  paymentKey: {
    type: DataTypes.STRING(200),
    field: 'payment_key',
    comment: '토스페이먼츠 결제 키'
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '결제 금액 (원)'
  },
  bonusAmount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'bonus_amount',
    comment: '보너스 금액 (원)'
  },
  totalAmount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'total_amount',
    comment: '실제 받는 금액 (결제금액 + 보너스)'
  },
  paymentMethod: {
    type: DataTypes.ENUM('CARD', 'TRANSFER', 'TOSS', 'NAVERPAY', 'KAKAOPAY', 'PAYCO', 'SAMSUNGPAY', 'OTHER'),
    allowNull: false,
    field: 'payment_method',
    comment: '결제 수단'
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'),
    defaultValue: 'PENDING',
    allowNull: false,
    comment: '결제 상태'
  },
  failureReason: {
    type: DataTypes.TEXT,
    field: 'failure_reason',
    comment: '결제 실패 사유'
  },
  tossResponse: {
    type: DataTypes.JSON,
    field: 'toss_response',
    comment: '토스페이먼츠 응답 전체 (JSON)'
  },
  requestedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'requested_at',
    comment: '결제 요청 시각'
  },
  completedAt: {
    type: DataTypes.DATE,
    field: 'completed_at',
    comment: '결제 완료 시각'
  }
}, {
  tableName: 'payments',
  timestamps: true,
  underscored: false,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['order_id'], unique: true },
    { fields: ['status'] },
    { fields: ['created_at'] }
  ]
});

  Payment.associate = (models) => {
    // 사용자와의 관계
    Payment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // WalletTransaction과의 관계
    Payment.hasMany(models.WalletTransaction, {
      foreignKey: 'paymentId',
      as: 'walletTransactions'
    });
  };

  return Payment;
};
