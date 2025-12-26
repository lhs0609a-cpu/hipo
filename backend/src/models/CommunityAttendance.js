const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunityAttendance = sequelize.define('CommunityAttendance', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    communityId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'shareholder_communities',
        key: 'id'
      },
      field: 'community_id',
      onDelete: 'CASCADE'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'user_id'
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: '출석 날짜'
    },
    reward: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 10.00,
      comment: '출석 보상 (10 HIPO 코인)'
    },
    isStreakBonus: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_streak_bonus',
      comment: '연속 출석 보너스 여부'
    },
    streakCount: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'streak_count',
      comment: '연속 출석 일수'
    }
  }, {
    tableName: 'community_attendances',
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['community_id', 'user_id', 'date']
      },
      { fields: ['community_id'] },
      { fields: ['user_id'] },
      { fields: ['date'] }
    ]
  });

  CommunityAttendance.associate = (models) => {
    CommunityAttendance.belongsTo(models.ShareholderCommunity, {
      foreignKey: 'communityId',
      as: 'community'
    });

    CommunityAttendance.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'attendee'
    });
  };

  return CommunityAttendance;
};
