const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DailyMission = sequelize.define('DailyMission', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      field: 'user_id'
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    loginCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'login_completed',
      comment: '로그인 (100 AC)'
    },
    postCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'post_completed',
      comment: '게시물 1개 (200 AC)'
    },
    commentCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'comment_completed',
      comment: '댓글 3개 (150 AC)'
    },
    stockPurchaseCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'stock_purchase_completed',
      comment: '주식 1주 매수 (50 AC)'
    },
    referralCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'referral_completed',
      comment: '친구 초대 (500 PC)'
    },
    allCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'all_completed',
      comment: '전체 달성 여부'
    },
    bonusReceived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'bonus_received',
      comment: '보너스 300 AC 수령 여부'
    }
  }, {
    tableName: 'daily_missions',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['user_id', 'date'] },
      { fields: ['date'] }
    ]
  });

  DailyMission.associate = (models) => {
    DailyMission.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return DailyMission;
};
