const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EventTicket = sequelize.define('EventTicket', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'events',
        key: 'id'
      },
      field: 'event_id',
      onDelete: 'CASCADE'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'user_id',
      comment: '티켓 소유자'
    },
    ticketType: {
      type: DataTypes.ENUM('GENERAL', 'VIP', 'BACKSTAGE', 'SHAREHOLDER_ONLY'),
      allowNull: false,
      field: 'ticket_type',
      comment: '티켓 유형: 일반, VIP, 백스테이지, 주주 전용'
    },
    ticketNumber: {
      type: DataTypes.STRING,
      unique: true,
      field: 'ticket_number',
      comment: '티켓 고유 번호'
    },
    qrCode: {
      type: DataTypes.TEXT,
      field: 'qr_code',
      comment: 'QR 코드 데이터'
    },
    shareholdingAtPurchase: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'shareholding_at_purchase',
      comment: '구매 당시 보유 주식 수'
    },
    isUsed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_used',
      comment: '사용 여부 (입장 완료)'
    },
    usedAt: {
      type: DataTypes.DATE,
      field: 'used_at',
      comment: '사용 일시'
    },
    purchasePrice: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'purchase_price',
      comment: '구매 가격'
    }
  }, {
    tableName: 'event_tickets',
    timestamps: true,
    indexes: [
      { fields: ['event_id'] },
      { fields: ['user_id'] },
      { fields: ['ticket_type'] },
      { fields: ['ticket_number'], unique: true },
      { fields: ['is_used'] }
    ]
  });

  EventTicket.associate = (models) => {
    EventTicket.belongsTo(models.Event, {
      foreignKey: 'eventId',
      as: 'event'
    });

    EventTicket.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'owner'
    });
  };

  return EventTicket;
};
