const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PreIPORound = sequelize.define('PreIPORound', {
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
      field: 'user_id',
      comment: '상장 예정자 (발행자)'
    },
    // === 라운드 정보 ===
    roundName: {
      type: DataTypes.STRING(100),
      defaultValue: 'Pre-IPO',
      field: 'round_name',
      comment: '라운드 이름 (예: Seed, Series A)'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '라운드 설명'
    },
    // === 가격 및 물량 ===
    pricePerShare: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'price_per_share',
      comment: 'Pre-IPO 주당 가격'
    },
    expectedIPOPrice: {
      type: DataTypes.INTEGER,
      field: 'expected_ipo_price',
      comment: '예상 IPO 공모가'
    },
    discountRate: {
      type: DataTypes.DECIMAL(5, 2),
      field: 'discount_rate',
      comment: '할인율 (%)'
    },
    totalShares: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'total_shares',
      comment: '총 Pre-IPO 물량'
    },
    soldShares: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'sold_shares',
      comment: '판매된 물량'
    },
    remainingShares: {
      type: DataTypes.INTEGER,
      field: 'remaining_shares',
      comment: '남은 물량'
    },
    // === 투자 제한 ===
    minInvestmentShares: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      field: 'min_investment_shares',
      comment: '최소 투자 수량'
    },
    maxInvestmentShares: {
      type: DataTypes.INTEGER,
      field: 'max_investment_shares',
      comment: '1인당 최대 투자 수량'
    },
    maxInvestors: {
      type: DataTypes.INTEGER,
      field: 'max_investors',
      comment: '최대 투자자 수 (null = 무제한)'
    },
    currentInvestors: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'current_investors',
      comment: '현재 투자자 수'
    },
    // === 참여 자격 ===
    eligibilityType: {
      type: DataTypes.ENUM('public', 'followers_only', 'vip_only', 'invited_only'),
      defaultValue: 'followers_only',
      field: 'eligibility_type',
      comment: '참여 자격: 전체공개, 팔로워만, VIP만, 초대만'
    },
    minFollowerDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'min_follower_days',
      comment: '최소 팔로우 기간 (일)'
    },
    minTrustLevel: {
      type: DataTypes.ENUM('bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'legend'),
      field: 'min_trust_level',
      comment: '최소 신뢰 등급'
    },
    // === 일정 ===
    startAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'start_at',
      comment: '투자 시작일'
    },
    endAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'end_at',
      comment: '투자 마감일'
    },
    // === 락업 ===
    lockupDays: {
      type: DataTypes.INTEGER,
      defaultValue: 90,
      field: 'lockup_days',
      comment: '락업 기간 (일) - 상장 후부터'
    },
    // === 상태 ===
    status: {
      type: DataTypes.ENUM(
        'draft',        // 작성 중
        'pending',      // 승인 대기
        'approved',     // 승인됨 (시작 전)
        'active',       // 진행 중
        'completed',    // 완료 (물량 소진 또는 기간 종료)
        'cancelled',    // 취소됨
        'converted'     // IPO로 전환됨
      ),
      defaultValue: 'draft',
      comment: 'Pre-IPO 상태'
    },
    // === 연결 정보 ===
    ipoOfferingId: {
      type: DataTypes.UUID,
      field: 'ipo_offering_id',
      comment: '연결된 IPO 공모 ID'
    },
    // === 보너스/혜택 ===
    bonusShares: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'bonus_shares',
      comment: '보너스 주식 (총 투자 기준)'
    },
    earlyBirdBonus: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      field: 'early_bird_bonus',
      comment: '얼리버드 추가 할인율 (%)'
    },
    earlyBirdLimit: {
      type: DataTypes.INTEGER,
      field: 'early_bird_limit',
      comment: '얼리버드 인원 제한'
    },
    // === 통계 ===
    totalRaised: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      field: 'total_raised',
      comment: '총 모금액'
    },
    targetAmount: {
      type: DataTypes.BIGINT,
      field: 'target_amount',
      comment: '목표 모금액'
    }
  }, {
    tableName: 'pre_ipo_rounds',
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['status'] },
      { fields: ['start_at'] },
      { fields: ['end_at'] }
    ],
    hooks: {
      beforeSave: (round) => {
        // 남은 물량 자동 계산
        round.remainingShares = round.totalShares - round.soldShares;
        // 할인율 계산
        if (round.expectedIPOPrice && round.pricePerShare) {
          round.discountRate = ((round.expectedIPOPrice - round.pricePerShare) / round.expectedIPOPrice * 100).toFixed(2);
        }
      }
    }
  });

  PreIPORound.associate = (models) => {
    PreIPORound.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'issuer'
    });

    PreIPORound.hasMany(models.PreIPOInvestment, {
      foreignKey: 'roundId',
      as: 'investments'
    });

    PreIPORound.belongsTo(models.IPOOffering, {
      foreignKey: 'ipoOfferingId',
      as: 'ipoOffering'
    });
  };

  return PreIPORound;
};
