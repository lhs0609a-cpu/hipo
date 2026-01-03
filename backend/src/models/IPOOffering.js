const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const IPOOffering = sequelize.define('IPOOffering', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    stockId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'stocks',
        key: 'id'
      },
      field: 'stock_id'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'user_id',
      comment: '상장 신청자'
    },
    // === 공모 정보 ===
    offeringPrice: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'offering_price',
      comment: '공모가 (PO)'
    },
    totalShares: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'total_shares',
      comment: '총 공모 주식 수'
    },
    minSubscriptionShares: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'min_subscription_shares',
      comment: '최소 청약 수량'
    },
    maxSubscriptionShares: {
      type: DataTypes.INTEGER,
      field: 'max_subscription_shares',
      comment: '1인당 최대 청약 수량'
    },
    // === 청약 현황 ===
    subscribedShares: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'subscribed_shares',
      comment: '청약 신청된 총 주식 수'
    },
    subscriberCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'subscriber_count',
      comment: '청약 참여자 수'
    },
    // === 일정 ===
    subscriptionStartAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'subscription_start_at',
      comment: '청약 시작일'
    },
    subscriptionEndAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'subscription_end_at',
      comment: '청약 마감일'
    },
    allocationAt: {
      type: DataTypes.DATE,
      field: 'allocation_at',
      comment: '배정 일시'
    },
    listingAt: {
      type: DataTypes.DATE,
      field: 'listing_at',
      comment: '상장 예정일'
    },
    // === 상태 ===
    status: {
      type: DataTypes.ENUM(
        'pending',      // 심사 대기
        'approved',     // 심사 승인 (청약 대기)
        'subscription', // 청약 진행 중
        'closed',       // 청약 마감
        'allocating',   // 배정 중
        'allocated',    // 배정 완료
        'listed',       // 상장 완료
        'cancelled',    // 취소됨
        'failed'        // 실패 (최소 청약 미달)
      ),
      defaultValue: 'pending',
      comment: 'IPO 상태'
    },
    // === 배정 설정 ===
    allocationMethod: {
      type: DataTypes.ENUM('proportional', 'equal', 'lottery'),
      defaultValue: 'proportional',
      field: 'allocation_method',
      comment: '배정 방식: 비례배정, 균등배정, 추첨'
    },
    minSuccessRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 50.00,
      field: 'min_success_rate',
      comment: '최소 청약률 (%) - 미달 시 실패'
    },
    // === 추가 정보 ===
    description: {
      type: DataTypes.TEXT,
      comment: '공모 설명/소개'
    },
    category: {
      type: DataTypes.STRING(50),
      comment: '카테고리'
    },
    highlights: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: '하이라이트/특징 목록'
    },
    // === 심사 정보 ===
    reviewedAt: {
      type: DataTypes.DATE,
      field: 'reviewed_at',
      comment: '심사 완료일'
    },
    reviewedBy: {
      type: DataTypes.UUID,
      field: 'reviewed_by',
      comment: '심사자 ID'
    },
    reviewNote: {
      type: DataTypes.TEXT,
      field: 'review_note',
      comment: '심사 코멘트'
    },
    // === 결과 정보 ===
    competitionRate: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'competition_rate',
      comment: '최종 경쟁률'
    },
    actualListedAt: {
      type: DataTypes.DATE,
      field: 'actual_listed_at',
      comment: '실제 상장일'
    }
  }, {
    tableName: 'ipo_offerings',
    underscored: true,
    indexes: [
      { fields: ['stock_id'] },
      { fields: ['user_id'] },
      { fields: ['status'] },
      { fields: ['subscription_start_at'] },
      { fields: ['subscription_end_at'] }
    ]
  });

  IPOOffering.associate = (models) => {
    IPOOffering.belongsTo(models.Stock, {
      foreignKey: 'stockId',
      as: 'stock'
    });

    IPOOffering.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'issuer'
    });

    IPOOffering.hasMany(models.IPOSubscription, {
      foreignKey: 'offeringId',
      as: 'subscriptions'
    });
  };

  return IPOOffering;
};
