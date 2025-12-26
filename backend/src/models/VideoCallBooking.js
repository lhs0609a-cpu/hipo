const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const VideoCallBooking = sequelize.define('VideoCallBooking', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '예약을 신청한 사용자'
    },
    targetUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '화상통화 대상 사용자'
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: '예약된 시간'
    },
    duration: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      comment: '통화 시간 (분)'
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled', 'rejected'),
      defaultValue: 'pending'
    },
    monthKey: {
      type: DataTypes.STRING(7),
      allowNull: false,
      comment: 'YYYY-MM 형식 (월별 예약 제한 체크용)'
    },
    meetingLink: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '화상회의 링크 (확정 시 생성)'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '요청 메모'
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'video_call_bookings',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['target_user_id']
      },
      {
        fields: ['scheduled_at']
      },
      {
        fields: ['status']
      },
      {
        fields: ['month_key']
      },
      {
        unique: true,
        fields: ['user_id', 'target_user_id', 'month_key'],
        name: 'unique_monthly_booking'
      }
    ]
  });

  VideoCallBooking.associate = (models) => {
    VideoCallBooking.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'requester'
    });

    VideoCallBooking.belongsTo(models.User, {
      foreignKey: 'targetUserId',
      as: 'host'
    });
  };

  return VideoCallBooking;
};
