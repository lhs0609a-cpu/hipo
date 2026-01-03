const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const IPOSubscription = sequelize.define('IPOSubscription', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    offeringId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'ipo_offerings',
        key: 'id'
      },
      field: 'offering_id'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'user_id',
      comment: '청약 신청자'
    },
    // === 청약 정보 ===
    requestedShares: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'requested_shares',
      comment: '청약 신청 수량'
    },
    depositAmount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'deposit_amount',
      comment: '청약 증거금 (PO)'
    },
    // === 배정 결과 ===
    allocatedShares: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'allocated_shares',
      comment: '배정된 수량'
    },
    refundAmount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'refund_amount',
      comment: '환불 금액 (미배정분)'
    },
    // === 상태 ===
    status: {
      type: DataTypes.ENUM(
        'pending',    // 청약 신청됨
        'confirmed',  // 청약 확정
        'allocated',  // 배정 완료
        'refunded',   // 환불 완료
        'cancelled',  // 취소됨
        'failed'      // 실패 (IPO 실패 등)
      ),
      defaultValue: 'pending',
      comment: '청약 상태'
    },
    // === 일시 ===
    confirmedAt: {
      type: DataTypes.DATE,
      field: 'confirmed_at',
      comment: '청약 확정 일시'
    },
    allocatedAt: {
      type: DataTypes.DATE,
      field: 'allocated_at',
      comment: '배정 일시'
    },
    refundedAt: {
      type: DataTypes.DATE,
      field: 'refunded_at',
      comment: '환불 일시'
    },
    cancelledAt: {
      type: DataTypes.DATE,
      field: 'cancelled_at',
      comment: '취소 일시'
    },
    // === 알림 ===
    notifiedAllocation: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'notified_allocation',
      comment: '배정 결과 알림 발송 여부'
    },
    notifiedListing: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'notified_listing',
      comment: '상장 알림 발송 여부'
    }
  }, {
    tableName: 'ipo_subscriptions',
    underscored: true,
    indexes: [
      { fields: ['offering_id'] },
      { fields: ['user_id'] },
      { fields: ['status'] },
      { unique: true, fields: ['offering_id', 'user_id'] } // 1인 1청약
    ]
  });

  IPOSubscription.associate = (models) => {
    IPOSubscription.belongsTo(models.IPOOffering, {
      foreignKey: 'offeringId',
      as: 'offering'
    });

    IPOSubscription.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'subscriber'
    });
  };

  return IPOSubscription;
};
