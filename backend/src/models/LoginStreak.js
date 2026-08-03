const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LoginStreak = sequelize.define('LoginStreak', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'Users',
        key: 'id',
      },
      field: 'user_id',
    },
    currentStreak: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'current_streak',
      comment: '현재 연속 로그인 일수',
    },
    longestStreak: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'longest_streak',
      comment: '최장 연속 로그인 일수',
    },
    lastLoginDate: {
      type: DataTypes.DATEONLY,
      field: 'last_login_date',
      comment: '마지막 로그인 날짜 (YYYY-MM-DD)',
    },
    lastClaimDate: {
      type: DataTypes.DATEONLY,
      field: 'last_claim_date',
      comment: '마지막 보상 수령 날짜',
    },
    totalRewardsClaimed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_rewards_claimed',
      comment: '총 수령한 보상 (PO)',
    },
    totalDaysClaimed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_days_claimed',
      comment: '총 보상 수령 일수',
    },
  }, {
    tableName: 'login_streaks',
    timestamps: true,
    indexes: [
      { fields: ['user_id'], unique: true },
      { fields: ['current_streak'] },
      { fields: ['last_login_date'] },
    ],
  });

  LoginStreak.associate = (models) => {
    LoginStreak.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  // 연속 로그인 보상 계산
  LoginStreak.getRewardForDay = (day) => {
    // 7일 주기로 보상, 7일차에 보너스
    const dayInCycle = ((day - 1) % 7) + 1;

    const rewards = {
      1: { po: 50, description: '1일차 보상' },
      2: { po: 75, description: '2일차 보상' },
      3: { po: 100, description: '3일차 보상' },
      4: { po: 125, description: '4일차 보상' },
      5: { po: 150, description: '5일차 보상' },
      6: { po: 200, description: '6일차 보상' },
      7: { po: 500, description: '7일 연속 보너스!' },
    };

    return rewards[dayInCycle];
  };

  // 전체 7일 보상 정보
  LoginStreak.getWeeklyRewards = () => {
    return [
      { day: 1, po: 50, icon: 'gift' },
      { day: 2, po: 75, icon: 'gift' },
      { day: 3, po: 100, icon: 'gift' },
      { day: 4, po: 125, icon: 'gift' },
      { day: 5, po: 150, icon: 'gift' },
      { day: 6, po: 200, icon: 'gift' },
      { day: 7, po: 500, icon: 'trophy' },
    ];
  };

  return LoginStreak;
};
