const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InviteLeaderboard = sequelize.define('InviteLeaderboard', {
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
      comment: '추천인'
    },
    weekStart: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'week_start',
      comment: '주 시작일 (월요일)'
    },
    weekEnd: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'week_end',
      comment: '주 종료일 (일요일)'
    },
    inviteCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'invite_count',
      comment: '해당 주 초대 수'
    },
    completedInvites: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'completed_invites',
      comment: '첫 거래까지 완료한 초대 수'
    },
    earnedReward: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'earned_reward',
      comment: '해당 주 획득 보상'
    },
    rank: {
      type: DataTypes.INTEGER,
      comment: '해당 주 순위'
    },
    isRewarded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_rewarded',
      comment: '주간 보상 지급 완료 여부'
    }
  }, {
    tableName: 'invite_leaderboards',
    timestamps: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['week_start'] },
      { fields: ['user_id', 'week_start'], unique: true },
      { fields: ['invite_count'] },
      { fields: ['rank'] }
    ]
  });

  InviteLeaderboard.associate = (models) => {
    InviteLeaderboard.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return InviteLeaderboard;
};
