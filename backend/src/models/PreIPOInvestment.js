const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PreIPOInvestment = sequelize.define('PreIPOInvestment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    roundId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'pre_ipo_rounds',
        key: 'id'
      },
      field: 'round_id'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'user_id',
      comment: '투자자'
    },
    // === 투자 정보 ===
    shares: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '투자 수량'
    },
    pricePerShare: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'price_per_share',
      comment: '투자 시점 주당 가격'
    },
    totalAmount: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'total_amount',
      comment: '총 투자금액'
    },
    // === 보너스 ===
    bonusShares: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'bonus_shares',
      comment: '보너스 주식'
    },
    isEarlyBird: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_early_bird',
      comment: '얼리버드 투자자 여부'
    },
    discountApplied: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'discount_applied',
      comment: '적용된 할인율'
    },
    // === 최종 수량 ===
    finalShares: {
      type: DataTypes.INTEGER,
      field: 'final_shares',
      comment: '최종 배정 수량 (투자 + 보너스)'
    },
    // === 락업 ===
    lockupEndAt: {
      type: DataTypes.DATE,
      field: 'lockup_end_at',
      comment: '락업 해제일'
    },
    isLocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_locked',
      comment: '락업 상태'
    },
    // === 상태 ===
    status: {
      type: DataTypes.ENUM(
        'pending',     // 투자 대기 (확인 중)
        'confirmed',   // 투자 확정
        'converted',   // IPO 전환 완료
        'refunded',    // 환불됨
        'cancelled'    // 취소됨
      ),
      defaultValue: 'confirmed',
      comment: '투자 상태'
    },
    // === 전환 정보 ===
    convertedAt: {
      type: DataTypes.DATE,
      field: 'converted_at',
      comment: 'IPO 전환 일시'
    },
    holdingId: {
      type: DataTypes.UUID,
      field: 'holding_id',
      comment: '전환 후 Holding ID'
    },
    // === 메타 ===
    investmentOrder: {
      type: DataTypes.INTEGER,
      field: 'investment_order',
      comment: '투자 순서 (얼리버드 판단용)'
    },
    inviteCode: {
      type: DataTypes.STRING(20),
      field: 'invite_code',
      comment: '사용된 초대 코드'
    },
    note: {
      type: DataTypes.TEXT,
      comment: '메모'
    }
  }, {
    tableName: 'pre_ipo_investments',
    underscored: true,
    indexes: [
      { fields: ['round_id'] },
      { fields: ['user_id'] },
      { fields: ['status'] },
      { unique: true, fields: ['round_id', 'user_id'] } // 1인 1투자
    ],
    hooks: {
      beforeCreate: (investment) => {
        // 최종 수량 계산
        investment.finalShares = investment.shares + (investment.bonusShares || 0);
      }
    }
  });

  PreIPOInvestment.associate = (models) => {
    PreIPOInvestment.belongsTo(models.PreIPORound, {
      foreignKey: 'roundId',
      as: 'round'
    });

    PreIPOInvestment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'investor'
    });
  };

  return PreIPOInvestment;
};
