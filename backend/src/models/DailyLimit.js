const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DailyLimit = sequelize.define('DailyLimit', {
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
      allowNull: false,
      comment: '기준 날짜'
    },
    poEarned: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      field: 'po_earned',
      comment: '오늘 획득한 PO'
    },
    postCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'post_count',
      comment: '오늘 작성한 게시물 수'
    },
    commentCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'comment_count',
      comment: '오늘 작성한 댓글 수'
    },
    likeCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'like_count',
      comment: '오늘 누른 좋아요 수'
    },
    stockPurchaseCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'stock_purchase_count',
      comment: '오늘 매수한 주식 수량'
    },
    hasReachedPOLimit: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_reached_po_limit',
      comment: 'PO 일일 한도 도달 여부 (Bronze 전용)'
    },
    suspiciousActivityCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'suspicious_activity_count',
      comment: '의심 활동 탐지 횟수'
    }
  }, {
    tableName: 'daily_limits',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['user_id', 'date'] },
      { fields: ['date'] }
    ]
  });

  DailyLimit.associate = (models) => {
    DailyLimit.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return DailyLimit;
};
