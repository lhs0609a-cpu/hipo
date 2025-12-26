const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PriceHistory = sequelize.define('PriceHistory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    stockId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'stocks',
        key: 'id'
      }
    },
    // OHLC 데이터 (Open, High, Low, Close)
    open: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    high: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    low: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    close: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    // 거래량
    volume: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    // 시간 단위 (1m, 5m, 15m, 1h, 1d, 1w, 1M)
    timeframe: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: '1d'
    },
    // 타임스탬프
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'price_histories',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['stock_id', 'timeframe', 'timestamp']
      }
    ]
  });

  PriceHistory.associate = (models) => {
    PriceHistory.belongsTo(models.Stock, {
      foreignKey: 'stockId',
      as: 'stock'
    });
  };

  return PriceHistory;
};
