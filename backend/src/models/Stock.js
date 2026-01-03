const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Stock = sequelize.define('Stock', {
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
    totalShares: {
      type: DataTypes.INTEGER,
      defaultValue: 100000,
      field: 'total_shares'
    },
    issuedShares: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'issued_shares'
    },
    availableShares: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '현재 매수 가능한 주식 수량 (초기 공모 + 추가 발행)',
      field: 'available_shares'
    },
    sharePrice: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
      field: 'share_price'
    },
    marketCapTotal: {
      type: DataTypes.BIGINT,
      field: 'market_cap_total'
    },
    dividendRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 20.0,
      field: 'dividend_rate'
    },
    priceChangePercent: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      field: 'price_change_percent'
    },
    yesterdayDividend: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'yesterday_dividend'
    },
    tier: {
      type: DataTypes.ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'LEGEND'),
      defaultValue: 'BRONZE',
      comment: '주식 등급'
    },
    tierScore: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'tier_score',
      comment: '티어 점수 (종합 평가)'
    },
    tierUpdatedAt: {
      type: DataTypes.DATE,
      field: 'tier_updated_at',
      comment: '마지막 티어 업데이트 시간'
    },
    tierProtectedUntil: {
      type: DataTypes.DATE,
      field: 'tier_protected_until',
      comment: '강등 보호 기간 (이 시간까지 강등 불가)'
    },
    shareholderCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'shareholder_count',
      comment: '고유 주주 수'
    },
    transactionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'transaction_count',
      comment: '총 거래 횟수'
    },
    weeklyVolume: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      field: 'weekly_volume',
      comment: '주간 거래량 (금액)'
    },
    monthlyVolume: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      field: 'monthly_volume',
      comment: '월간 거래량 (금액)'
    },
    averageDailyVolume: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      field: 'average_daily_volume',
      comment: '평균 일일 거래량'
    },
    peakMarketCap: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      field: 'peak_market_cap',
      comment: '최고 시가총액 (역대)'
    },
    listingDate: {
      type: DataTypes.DATE,
      field: 'listing_date',
      comment: '상장일'
    },
    // === 새로운 필드들 ===
    status: {
      type: DataTypes.ENUM('active', 'suspended', 'delisted', 'ipo_pending'),
      defaultValue: 'active',
      comment: '주식 상태: 활성, 거래정지, 상장폐지, IPO대기'
    },
    ipoApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'ipo_approved',
      comment: 'IPO 심사 승인 여부'
    },
    lockupEndDate: {
      type: DataTypes.DATE,
      field: 'lockup_end_date',
      comment: '락업 종료일 (이 날짜까지 발행자 매도 불가)'
    },
    dailyPriceLimit: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 30.00,
      field: 'daily_price_limit',
      comment: '일일 가격 제한 퍼센트 (상한가/하한가)'
    },
    previousClose: {
      type: DataTypes.INTEGER,
      field: 'previous_close',
      comment: '전일 종가'
    },
    dayOpen: {
      type: DataTypes.INTEGER,
      field: 'day_open',
      comment: '당일 시가'
    },
    dayHigh: {
      type: DataTypes.INTEGER,
      field: 'day_high',
      comment: '당일 고가'
    },
    dayLow: {
      type: DataTypes.INTEGER,
      field: 'day_low',
      comment: '당일 저가'
    },
    dayVolume: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'day_volume',
      comment: '당일 거래량'
    },
    circuitBreakerTriggered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'circuit_breaker_triggered',
      comment: '서킷브레이커 발동 여부'
    },
    circuitBreakerEndTime: {
      type: DataTypes.DATE,
      field: 'circuit_breaker_end_time',
      comment: '서킷브레이커 종료 시간'
    },
    tradingFeeRate: {
      type: DataTypes.DECIMAL(5, 4),
      defaultValue: 0.0025,
      field: 'trading_fee_rate',
      comment: '거래 수수료율 (0.25% 기본)'
    },
    category: {
      type: DataTypes.ENUM('entertainment', 'sports', 'influencer', 'business', 'creator', 'other'),
      defaultValue: 'other',
      comment: '주식 카테고리/섹터'
    },
    treasuryShares: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'treasury_shares',
      comment: '자사주 (발행자가 재매입한 주식)'
    }
  }, {
    tableName: 'stocks',
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['share_price'] },
      { fields: ['market_cap_total'] }
    ],
    hooks: {
      beforeSave: async (stock) => {
        // 시가총액 자동 계산
        stock.marketCapTotal = stock.sharePrice * stock.issuedShares;
      }
    }
  });

  Stock.associate = (models) => {
    // 주식 발행자
    Stock.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'issuer'
    });

    // 보유자들
    Stock.hasMany(models.Holding, {
      foreignKey: 'stockId',
      as: 'holdings'
    });

    // 거래 내역
    Stock.hasMany(models.Transaction, {
      foreignKey: 'stockId',
      as: 'transactions'
    });

    // 배당 내역
    Stock.hasMany(models.Dividend, {
      foreignKey: 'stockId',
      as: 'dividends'
    });
  };

  return Stock;
};
