const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Event = sequelize.define('Event', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    creatorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'creator_id',
      comment: '이벤트 주최자 (크리에이터)'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '이벤트 이름'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '이벤트 설명'
    },
    eventType: {
      type: DataTypes.ENUM('FAN_MEETING', 'CONCERT', 'MEETUP', 'ONLINE', 'OTHER'),
      allowNull: false,
      field: 'event_type',
      comment: '이벤트 유형'
    },
    eventDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'event_date',
      comment: '이벤트 일시'
    },
    location: {
      type: DataTypes.STRING,
      comment: '이벤트 장소'
    },
    imageUrl: {
      type: DataTypes.STRING,
      field: 'image_url',
      comment: '이벤트 포스터 이미지'
    },
    totalTickets: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_tickets',
      comment: '전체 티켓 수'
    },
    availableTickets: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'available_tickets',
      comment: '남은 티켓 수'
    },
    generalTickets: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'general_tickets',
      comment: '일반 티켓 수'
    },
    vipTickets: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'vip_tickets',
      comment: 'VIP 티켓 수'
    },
    backstageTickets: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'backstage_tickets',
      comment: '백스테이지 티켓 수 (최대주주 전용)'
    },
    shareholderEarlyAccessStartsAt: {
      type: DataTypes.DATE,
      field: 'shareholder_early_access_starts_at',
      comment: '주주 우선 예매 시작 시간'
    },
    publicSaleStartsAt: {
      type: DataTypes.DATE,
      field: 'public_sale_starts_at',
      comment: '일반 예매 시작 시간'
    },
    salesEndsAt: {
      type: DataTypes.DATE,
      field: 'sales_ends_at',
      comment: '예매 종료 시간'
    },
    minSharesForVIP: {
      type: DataTypes.INTEGER,
      defaultValue: 1000,
      field: 'min_shares_for_vip',
      comment: 'VIP 티켓을 위한 최소 주식 수'
    },
    minSharesForBackstage: {
      type: DataTypes.INTEGER,
      defaultValue: 10000,
      field: 'min_shares_for_backstage',
      comment: '백스테이지 티켓을 위한 최소 주식 수 (최대주주)'
    },
    status: {
      type: DataTypes.ENUM('UPCOMING', 'EARLY_ACCESS', 'PUBLIC_SALE', 'SOLD_OUT', 'ONGOING', 'ENDED', 'CANCELLED'),
      defaultValue: 'UPCOMING',
      comment: '이벤트 상태'
    }
  }, {
    tableName: 'events',
    timestamps: true,
    indexes: [
      { fields: ['creator_id'] },
      { fields: ['event_type'] },
      { fields: ['event_date'] },
      { fields: ['status'] }
    ]
  });

  Event.associate = (models) => {
    Event.belongsTo(models.User, {
      foreignKey: 'creatorId',
      as: 'creator'
    });

    Event.hasMany(models.EventTicket, {
      foreignKey: 'eventId',
      as: 'tickets'
    });
  };

  return Event;
};
