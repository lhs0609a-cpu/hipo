const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Wallet = sequelize.define('Wallet', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'user_id'
    },
    poBalance: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 1000.00, // 가입 보너스 1,000 PO
      allowNull: false,
      field: 'po_balance',
      comment: 'PO(포) 잔액 - 100PO = $0.10'
    },
    totalPOEarned: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      field: 'total_po_earned',
      comment: '총 획득한 PO (활동 보상)'
    },
    totalPOSpent: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      field: 'total_po_spent',
      comment: '총 사용한 PO (주식 구매 등)'
    },
    totalDividendReceived: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      field: 'total_dividend_received',
      comment: '총 수령한 배당 PO'
    },
    totalDividendPaid: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      field: 'total_dividend_paid',
      comment: '총 지급한 배당 PO (크리에이터)'
    },
    todayDividendReceived: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      field: 'today_dividend_received',
      comment: '오늘 수령한 배당'
    },
    totalPOWithdrawn: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      field: 'total_po_withdrawn',
      comment: '총 환전한 PO (실제 돈으로 전환)'
    },
    consecutiveLoginDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'consecutive_login_days',
      comment: '연속 출석 일수'
    },
    lastLoginDate: {
      type: DataTypes.DATEONLY,
      field: 'last_login_date',
      comment: '마지막 로그인 날짜'
    }
  }, {
    tableName: 'wallets',
    timestamps: true,
    indexes: [
      { fields: ['user_id'], unique: true }
    ]
  });

  Wallet.associate = (models) => {
    Wallet.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return Wallet;
};
