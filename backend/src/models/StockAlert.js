const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StockAlert = sequelize.define('StockAlert', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      comment: '알림을 설정한 사용자 ID',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    stockId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'stock_id',
      comment: '모니터링할 주식 ID',
      references: {
        model: 'stocks',
        key: 'id'
      }
    },
    alertType: {
      type: DataTypes.ENUM(
        'PRICE_ABOVE',      // 가격이 목표가 이상
        'PRICE_BELOW',      // 가격이 목표가 이하
        'PERCENT_UP',       // 가격 상승률 % 이상
        'PERCENT_DOWN',     // 가격 하락률 % 이상
        'VOLUME_SPIKE',     // 거래량 급증
        'NEW_HIGH',         // 신고가
        'NEW_LOW',          // 신저가
        'DIVIDEND_PAID'     // 배당금 지급
      ),
      allowNull: false,
      field: 'alert_type',
      comment: '알림 유형'
    },
    targetPrice: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'target_price',
      comment: '목표 가격 (PRICE_ABOVE, PRICE_BELOW 타입)'
    },
    targetPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'target_percent',
      comment: '목표 변동률 % (PERCENT_UP, PERCENT_DOWN 타입)'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
      comment: '알림 활성화 여부'
    },
    isRecurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_recurring',
      comment: '반복 알림 여부 (false면 한 번만 알림 후 비활성화)'
    },
    lastTriggeredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_triggered_at',
      comment: '마지막 알림 발생 시간'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at'
    }
  }, {
    tableName: 'stock_alerts',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['stock_id'] },
      { fields: ['is_active'] },
      { fields: ['alert_type'] }
    ]
  });

  StockAlert.associate = (models) => {
    // 알림을 설정한 사용자
    StockAlert.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // 모니터링할 주식
    StockAlert.belongsTo(models.Stock, {
      foreignKey: 'stockId',
      as: 'stock'
    });

    // 알림 히스토리
    StockAlert.hasMany(models.StockAlertHistory, {
      foreignKey: 'alertId',
      as: 'history'
    });
  };

  return StockAlert;
};
