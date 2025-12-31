const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Attendance = sequelize.define('Attendance', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'user_id',
      comment: '사용자'
    },
    checkInDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'check_in_date',
      comment: '출석 날짜'
    },
    streakCount: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'streak_count',
      comment: '연속 출석 일수'
    },
    reward: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
      comment: '출석 보상 (PO)'
    },
    bonusReward: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'bonus_reward',
      comment: '연속 출석 보너스 (7일마다 2배)'
    },
    weeklyMilestone: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'weekly_milestone',
      comment: '7일 연속 마일스톤 달성'
    }
  }, {
    tableName: 'attendances',
    timestamps: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['check_in_date'] },
      { fields: ['user_id', 'check_in_date'], unique: true },
      { fields: ['streak_count'] }
    ]
  });

  Attendance.associate = (models) => {
    Attendance.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return Attendance;
};
