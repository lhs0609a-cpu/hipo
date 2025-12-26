const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FanMeeting = sequelize.define('FanMeeting', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    hostId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'host_id',
      comment: '팬미팅 주최자 (크리에이터)'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '팬미팅 제목'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '팬미팅 설명'
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'scheduled_at',
      comment: '예정 일시'
    },
    duration: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      comment: '미팅 시간 (분 단위)'
    },
    maxParticipants: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'max_participants',
      comment: '최대 당첨 인원'
    },
    minShares: {
      type: DataTypes.INTEGER,
      defaultValue: 1000,
      field: 'min_shares',
      comment: '참가 최소 주식 수 (대주주 기준 1,000주)'
    },
    status: {
      type: DataTypes.ENUM('pending', 'open', 'closed', 'completed', 'cancelled'),
      defaultValue: 'pending',
      comment: 'pending(대기), open(추첨 진행 중), closed(추첨 완료), completed(미팅 완료), cancelled(취소)'
    },
    quarter: {
      type: DataTypes.STRING(7),
      comment: 'YYYY-QN 형식 (예: 2024-Q1)'
    },
    meetingLink: {
      type: DataTypes.STRING,
      field: 'meeting_link',
      comment: '줌 미팅 링크'
    }
  }, {
    tableName: 'fan_meetings',
    timestamps: true,
    indexes: [
      { fields: ['host_id'] },
      { fields: ['status'] },
      { fields: ['quarter'] },
      { fields: ['scheduled_at'] }
    ]
  });

  FanMeeting.associate = (models) => {
    FanMeeting.belongsTo(models.User, {
      foreignKey: 'hostId',
      as: 'host'
    });

    FanMeeting.hasMany(models.FanMeetingEntry, {
      foreignKey: 'meetingId',
      as: 'entries'
    });
  };

  return FanMeeting;
};
