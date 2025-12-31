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
      type: DataTypes.ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'),
      defaultValue: 'BRONZE',
      comment: '주식 등급 (발행량 한도 결정)'
    },
    shareholderCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'shareholder_count',
      comment: '고유 주주 수 (티어 업그레이드 조건)'
    },
    transactionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'transaction_count',
      comment: '총 거래 횟수 (티어 업그레이드 조건)'
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
