const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FanMeetingEntry = sequelize.define('FanMeetingEntry', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    meetingId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'fan_meetings',
        key: 'id'
      },
      field: 'meeting_id',
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
      comment: '추첨 참가자'
    },
    shareholding: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '참가 시점의 주식 보유량 (추첨 확률 가중치)'
    },
    isWinner: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_winner',
      comment: '당첨 여부'
    },
    lotteryWeight: {
      type: DataTypes.INTEGER,
      field: 'lottery_weight',
      comment: '추첨 가중치 (주식 수 = 가중치)'
    }
  }, {
    tableName: 'fan_meeting_entries',
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['meeting_id', 'user_id']
      },
      { fields: ['meeting_id'] },
      { fields: ['user_id'] },
      { fields: ['is_winner'] }
    ]
  });

  FanMeetingEntry.associate = (models) => {
    FanMeetingEntry.belongsTo(models.FanMeeting, {
      foreignKey: 'meetingId',
      as: 'meeting'
    });

    FanMeetingEntry.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'participant'
    });
  };

  return FanMeetingEntry;
};
