const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Referral = sequelize.define('Referral', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    referrerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'referrer_id',
      comment: '추천인'
    },
    referredUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'referred_user_id',
      comment: '피추천인'
    },
    referralCode: {
      type: DataTypes.STRING,
      unique: true,
      field: 'referral_code',
      comment: '추천 코드'
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'ACTIVE', 'COMPLETED'),
      defaultValue: 'PENDING',
      comment: '추천 상태: 대기(가입만), 활성(첫 거래), 완료'
    },
    totalCommission: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      field: 'total_commission',
      comment: '총 커미션 수익'
    },
    firstPurchaseAt: {
      type: DataTypes.DATE,
      field: 'first_purchase_at',
      comment: '피추천인의 첫 구매 일시'
    }
  }, {
    tableName: 'referrals',
    timestamps: true,
    indexes: [
      { fields: ['referrer_id'] },
      { fields: ['referred_user_id'] },
      { fields: ['referral_code'], unique: true },
      { fields: ['status'] }
    ]
  });

  Referral.associate = (models) => {
    Referral.belongsTo(models.User, {
      foreignKey: 'referrerId',
      as: 'referrer'
    });

    Referral.belongsTo(models.User, {
      foreignKey: 'referredUserId',
      as: 'referredUser'
    });
  };

  return Referral;
};
