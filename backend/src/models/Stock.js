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
