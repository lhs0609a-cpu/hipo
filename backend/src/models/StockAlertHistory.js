const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StockAlertHistory = sequelize.define('StockAlertHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    alertId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'alert_id',
      comment: '알림 설정 ID',
      references: {
        model: 'stock_alerts',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      comment: '알림 받은 사용자 ID',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    stockId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'stock_id',
      comment: '주식 ID',
      references: {
        model: 'stocks',
        key: 'id'
      }
    },
    alertType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'alert_type',
      comment: '알림 유형'
    },
    triggerPrice: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'trigger_price',
      comment: '알림이 발생한 시점의 주가'
    },
    triggerValue: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'trigger_value',
      comment: '트리거 값 (퍼센트, 거래량 등)'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '알림 메시지'
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_read',
      comment: '읽음 여부'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    }
  }, {
    tableName: 'stock_alert_history',
    underscored: true,
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['alert_id'] },
      { fields: ['stock_id'] },
      { fields: ['is_read'] },
      { fields: ['created_at'] }
    ]
  });

  StockAlertHistory.associate = (models) => {
    // 알림 설정
    StockAlertHistory.belongsTo(models.StockAlert, {
      foreignKey: 'alertId',
      as: 'alert'
    });

    // 알림 받은 사용자
    StockAlertHistory.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // 주식
    StockAlertHistory.belongsTo(models.Stock, {
      foreignKey: 'stockId',
      as: 'stock'
    });
  };

  return StockAlertHistory;
};
