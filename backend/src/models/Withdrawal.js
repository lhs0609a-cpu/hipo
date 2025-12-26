const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Withdrawal = sequelize.define('Withdrawal', {
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
      field: 'user_id'
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: 'HIPO 코인 환전 금액'
    },
    feePercentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 15.00,
      field: 'fee_percentage',
      comment: '수수료 비율 (%)'
    },
    feeAmount: {
      type: DataTypes.DECIMAL(15, 2),
      field: 'fee_amount',
      comment: '수수료 금액'
    },
    netAmount: {
      type: DataTypes.DECIMAL(15, 2),
      field: 'net_amount',
      comment: '실제 지급 금액 (수수료 제외)'
    },
    bankInfo: {
      type: DataTypes.JSON,
      field: 'bank_info',
      comment: '은행 계좌 정보'
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED'),
      defaultValue: 'PENDING',
      comment: '환전 상태'
    },
    processedAt: {
      type: DataTypes.DATE,
      field: 'processed_at',
      comment: '처리 완료 시간'
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      field: 'rejection_reason',
      comment: '거부 사유'
    }
  }, {
    tableName: 'withdrawals',
    timestamps: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['status'] },
      { fields: ['created_at'] }
    ]
  });

  Withdrawal.associate = (models) => {
    Withdrawal.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return Withdrawal;
};
